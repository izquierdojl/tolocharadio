import { AppError, serviceUnavailable } from "../errors.js";
import { looksLikeHlsBody } from "../lib/hls.js";
import {
  isMasterPlaylist,
  lastSegment,
  type MediaPlaylist,
  type MediaSegment,
  parseMasterPlaylist,
  parseMediaPlaylist,
  segmentEndMs,
  unsupportedContainerError,
} from "../lib/mediaPlaylist.js";
import {
  contentTypeForContainer,
  isConcatenableContainer,
  sniffSegmentContainer,
} from "../lib/segmentContainer.js";
import { fetchFollowingRedirects, readBodyCapped, readBytesCapped } from "../lib/upstream.js";
import { PLAYLIST_MAX_BYTES } from "./playlist.js";

export const HLS_LIVE_MAX_RENEWALS = 3;
export const HLS_LIVE_MIN_POLL_MS = 1000;
export const HLS_SEGMENT_MAX_BYTES = 24 * 1024 * 1024;
const PDT_TOLERANCE_MS = 250;

class ExpiredSegmentError extends Error {}
class TransientStreamError extends Error {}

export interface HlsLiveChunkMeta {
  contentType: string;
  first: boolean;
}

export interface HlsLiveOptions {
  stationUrl: string;
  userAgent: string;
  signal: AbortSignal;
  onChunk: (bytes: Uint8Array, meta: HlsLiveChunkMeta) => Promise<void>;
  pollIntervalMs?: number;
  maxRenewals?: number;
}

interface ResolvedMedia {
  playlist: MediaPlaylist;
  playlistUrl: string;
}

function streamHeaders(userAgent: string): Record<string, string> {
  return {
    "User-Agent": userAgent,
    Accept: "*/*",
    "Accept-Encoding": "identity",
    Range: "",
  };
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}

async function fetchTextWithStatus(
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<{ text: string; finalUrl: string }> {
  let response: Response;
  let finalUrl: string;
  try {
    ({ response, finalUrl } = await fetchFollowingRedirects(url, headers, { signal }));
  } catch {
    if (signal.aborted) throw new TransientStreamError();
    throw new TransientStreamError();
  }

  if (response.status === 404 || response.status === 410) {
    response.body?.cancel().catch(() => {});
    throw new ExpiredSegmentError();
  }
  if (!response.ok) {
    response.body?.cancel().catch(() => {});
    throw new TransientStreamError();
  }

  let text: string | null;
  try {
    text = await readBodyCapped(response, PLAYLIST_MAX_BYTES);
  } catch {
    throw new TransientStreamError();
  }
  if (text === null) throw new TransientStreamError();
  return { text, finalUrl };
}

async function fetchMediaPlaylist(
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<MediaPlaylist> {
  const { text, finalUrl } = await fetchTextWithStatus(url, headers, signal);
  if (!looksLikeHlsBody(text)) {
    throw serviceUnavailable("PLAYLIST_MALFORMED", "El manifiesto HLS no es valido");
  }
  if (isMasterPlaylist(text)) throw new TransientStreamError();
  const playlist = parseMediaPlaylist(text, finalUrl);
  if (playlist.encrypted || playlist.hasMap) throw unsupportedContainerError();
  return playlist;
}

async function resolveMedia(
  stationUrl: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<ResolvedMedia> {
  let url = stationUrl;

  for (let depth = 0; depth < 3; depth++) {
    const { text, finalUrl } = await fetchTextWithStatus(url, headers, signal);
    if (!looksLikeHlsBody(text)) {
      throw serviceUnavailable("PLAYLIST_MALFORMED", "El manifiesto HLS no es valido");
    }
    if (isMasterPlaylist(text)) {
      const variants = parseMasterPlaylist(text, finalUrl);
      if (variants.length === 0) {
        throw serviceUnavailable("PLAYLIST_MALFORMED", "El manifiesto HLS no tiene variantes");
      }
      url = variants[0]!.url;
      continue;
    }
    const playlist = parseMediaPlaylist(text, finalUrl);
    if (playlist.encrypted || playlist.hasMap) throw unsupportedContainerError();
    if (playlist.segments.length === 0) {
      throw serviceUnavailable(
        "PLAYLIST_EMPTY",
        "La lista de la emisora no contiene ninguna emision reproducible",
      );
    }
    return { playlist, playlistUrl: finalUrl };
  }

  throw serviceUnavailable("PLAYLIST_MALFORMED", "El manifiesto HLS no es valido");
}

async function fetchSegment(
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Uint8Array> {
  let response: Response;
  try {
    ({ response } = await fetchFollowingRedirects(url, headers, { signal }));
  } catch {
    throw new TransientStreamError();
  }

  if (response.status === 404 || response.status === 410) {
    response.body?.cancel().catch(() => {});
    throw new ExpiredSegmentError();
  }
  if (!response.ok) {
    response.body?.cancel().catch(() => {});
    throw new TransientStreamError();
  }

  let bytes: Uint8Array | null;
  try {
    bytes = await readBytesCapped(response, HLS_SEGMENT_MAX_BYTES);
  } catch {
    throw new TransientStreamError();
  }
  if (bytes === null || bytes.length === 0) throw new TransientStreamError();
  return bytes;
}

const PROGRESSIVE_TWIN_PATTERN = /\/livestream-redirect\/([^/?#]+)\.m3u8$/i;

export function progressiveTwinUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!PROGRESSIVE_TWIN_PATTERN.test(url.pathname)) return null;
  const twin = new URL(url.toString());
  twin.pathname = url.pathname.replace(/\.m3u8$/i, ".aac");
  return twin.toString();
}


function pickNextSegment(
  playlist: MediaPlaylist,
  last: MediaSegment,
  sameSession: boolean,
): MediaSegment | null {
  if (sameSession) {
    const pending = playlist.segments.filter(
      (segment) => segment.sequence > last.sequence && segment.url !== last.url,
    );
    if (pending.length > 0) {
      return pending.length > 2 ? pending[pending.length - 1]! : pending[0]!;
    }
    return null;
  }

  const lastEnd = segmentEndMs(last);
  if (lastEnd !== null) {
    const withPdt = playlist.segments.filter((segment) => segment.programDateTime !== null);
    if (withPdt.length > 0) {
      const next = withPdt.find(
        (segment) => segment.programDateTime! >= lastEnd - PDT_TOLERANCE_MS,
      );
      if (next) return next.url === last.url ? null : next;
      const newest = withPdt[withPdt.length - 1]!;
      return newest.url === last.url ? null : newest;
    }
  }

  return playlist.segments.find((segment) => segment.url !== last.url) ?? null;
}

function asAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ExpiredSegmentError) {
    return serviceUnavailable("PLAYLIST_UNREACHABLE", "No se pudo descargar el manifiesto HLS");
  }
  return serviceUnavailable("STREAM_UNAVAILABLE", "No se pudo conectar con la emisora");
}

export async function streamHlsLive(options: HlsLiveOptions): Promise<void> {
  const { stationUrl, userAgent, signal, onChunk } = options;
  const headers = streamHeaders(userAgent);
  const maxRenewals = options.maxRenewals ?? HLS_LIVE_MAX_RENEWALS;

  let media: ResolvedMedia;
  let first: MediaSegment;
  let firstBytes: Uint8Array;
  let contentType: string;

  try {
    media = await resolveMedia(stationUrl, headers, signal);
    const start = lastSegment(media.playlist);
    if (!start) {
      throw serviceUnavailable(
        "PLAYLIST_EMPTY",
        "La lista de la emisora no contiene ninguna emision reproducible",
      );
    }
    first = start;
    firstBytes = await fetchSegment(first.url, headers, signal);
    const container = sniffSegmentContainer(firstBytes);
    if (!isConcatenableContainer(container)) throw unsupportedContainerError();
    contentType = contentTypeForContainer(container);
  } catch (err) {
    throw asAppError(err);
  }

  await onChunk(firstBytes, { contentType, first: true });

  let last = first;
  let failures = 0;
  let sameSession = true;

  while (!signal.aborted) {
    const pollMs =
      options.pollIntervalMs ?? Math.max(HLS_LIVE_MIN_POLL_MS, media.playlist.targetDuration * 500);
    await sleep(pollMs, signal);
    if (signal.aborted) break;

    let playlist: MediaPlaylist;
    try {
      playlist = await fetchMediaPlaylist(media.playlistUrl, headers, signal);
    } catch (err) {
      if (err instanceof ExpiredSegmentError || err instanceof TransientStreamError) {
        failures += 1;
        if (failures > maxRenewals) break;
        if (err instanceof ExpiredSegmentError) {
          try {
            media = await resolveMedia(stationUrl, headers, signal);
            sameSession = false;
          } catch {
            break;
          }
        }
        continue;
      }
      break;
    }

    const next = pickNextSegment(playlist, last, sameSession);
    if (!next) {
      if (playlist.endList) break;
      continue;
    }

    try {
      const bytes = await fetchSegment(next.url, headers, signal);
      await onChunk(bytes, { contentType, first: false });
      last = next;
      failures = 0;
      sameSession = true;
    } catch (err) {
      if (err instanceof ExpiredSegmentError) {
        failures += 1;
        if (failures > maxRenewals) break;
        try {
          media = await resolveMedia(stationUrl, headers, signal);
          sameSession = false;
          const retry = pickNextSegment(media.playlist, last, false);
          if (!retry) continue;
          const bytes = await fetchSegment(retry.url, headers, signal);
          await onChunk(bytes, { contentType, first: false });
          last = retry;
          failures = 0;
          sameSession = true;
        } catch {
          break;
        }
      } else if (err instanceof TransientStreamError) {
        failures += 1;
        if (failures > maxRenewals) break;
      } else {
        break;
      }
    }
  }
}
