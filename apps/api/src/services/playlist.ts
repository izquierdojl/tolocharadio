import { serviceUnavailable } from "../errors.js";
import { looksLikeHlsBody } from "../lib/hls.js";
import { fetchFollowingRedirects, readBodyCapped } from "../lib/upstream.js";

export type PlaylistFormat = "hls" | "m3u" | "pls";

export const PLAYLIST_FETCH_TIMEOUT_MS = 10_000;
export const PLAYLIST_MAX_BYTES = 1_000_000;
export const PLAYLIST_MAX_CANDIDATES = 5;

const INVALID_TOKEN_CHARS = /[\s<>{}"`\\]/;
const BRACKETED_TOKEN = /^\[[^\]]*\]$/;
const FILE_KEY_PATTERN = /^file(\d+)$/;
const PLS_RECOGNITION_PATTERN = /(^|[\r\n])\s*(file\d+\s*=|\[playlist\])/i;

function hasControlChars(token: string): boolean {
  for (const char of token) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f || code === 0xfffd) return true;
  }
  return false;
}

export function detectPlaylistFormat(rawUrl: string): PlaylistFormat | null {
  let pathname: string;
  try {
    pathname = new URL(rawUrl).pathname.toLowerCase();
  } catch {
    return null;
  }
  if (pathname.endsWith(".m3u8")) return "hls";
  if (pathname.endsWith(".m3u")) return "m3u";
  if (pathname.endsWith(".pls")) return "pls";
  return null;
}

export function parseM3u(text: string): string[] {
  const entries: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const token = line.split(/\s+/)[0];
    if (token) entries.push(token);
  }
  return entries;
}

export function parsePls(text: string): string[] {
  const entries = new Map<number, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";") || line.startsWith("[")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const match = FILE_KEY_PATTERN.exec(key);
    if (!match) continue;
    const value = line.slice(separator + 1).trim();
    if (!value) continue;
    const index = Number(match[1]);
    if (!entries.has(index)) entries.set(index, value);
  }
  return [...entries.entries()].sort((a, b) => a[0] - b[0]).map(([, value]) => value);
}

export function isRecognizedPls(text: string): boolean {
  return PLS_RECOGNITION_PATTERN.test(text);
}

function looksLikeUrlToken(token: string): boolean {
  if (!token || token.length > 2048) return false;
  if (INVALID_TOKEN_CHARS.test(token)) return false;
  if (hasControlChars(token)) return false;
  if (BRACKETED_TOKEN.test(token)) return false;
  return true;
}

export interface CandidateResolution {
  candidates: string[];
  urlEntries: number;
}

export function resolveCandidateEntries(entries: string[], baseUrl: string): CandidateResolution {
  const seen = new Set<string>();
  const candidates: string[] = [];
  let urlEntries = 0;

  for (const entry of entries) {
    if (!looksLikeUrlToken(entry)) continue;
    let resolved: URL;
    try {
      resolved = new URL(entry, baseUrl);
    } catch {
      continue;
    }
    urlEntries += 1;
    if (resolved.protocol !== "https:") continue;
    const normalized = resolved.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push(normalized);
    if (candidates.length >= PLAYLIST_MAX_CANDIDATES) break;
  }

  return { candidates, urlEntries };
}

export interface PlaylistFetchOptions {
  userAgent: string;
  signal?: AbortSignal;
}

type TextFetchResult =
  | { ok: true; text: string; finalUrl: string }
  | { ok: false; failure: "unreachable" | "too_large" };

async function fetchCappedText(url: string, options: PlaylistFetchOptions): Promise<TextFetchResult> {
  const timeout = AbortSignal.timeout(PLAYLIST_FETCH_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  let response: Response;
  let finalUrl: string;
  try {
    ({ response, finalUrl } = await fetchFollowingRedirects(
      url,
      {
        "User-Agent": options.userAgent,
        Accept: "*/*",
        "Accept-Encoding": "identity",
      },
      { signal },
    ));
  } catch {
    return { ok: false, failure: "unreachable" };
  }

  if (!response.ok) {
    response.body?.cancel().catch(() => {});
    return { ok: false, failure: "unreachable" };
  }

  try {
    const text = await readBodyCapped(response, PLAYLIST_MAX_BYTES);
    if (text === null) return { ok: false, failure: "too_large" };
    return { ok: true, text, finalUrl };
  } catch {
    return { ok: false, failure: "unreachable" };
  }
}

export interface ResolvedPlaylist {
  candidates: string[];
  finalUrl: string;
}

export async function fetchPlaylist(
  format: "m3u" | "pls",
  url: string,
  options: PlaylistFetchOptions,
): Promise<ResolvedPlaylist> {
  const result = await fetchCappedText(url, options);
  if (!result.ok) {
    if (result.failure === "too_large") {
      throw serviceUnavailable(
        "PLAYLIST_MALFORMED",
        "La lista de la emisora no tiene un formato valido",
      );
    }
    throw serviceUnavailable(
      "PLAYLIST_UNREACHABLE",
      "No se pudo descargar la lista de la emisora",
    );
  }

  if (format === "pls" && !isRecognizedPls(result.text)) {
    throw serviceUnavailable(
      "PLAYLIST_MALFORMED",
      "La lista de la emisora no tiene un formato valido",
    );
  }

  const entries = format === "m3u" ? parseM3u(result.text) : parsePls(result.text);
  if (entries.length === 0) {
    throw serviceUnavailable(
      "PLAYLIST_EMPTY",
      "La lista de la emisora no contiene ninguna emision reproducible",
    );
  }

  const resolution = resolveCandidateEntries(entries, result.finalUrl);
  if (resolution.urlEntries === 0) {
    throw serviceUnavailable(
      "PLAYLIST_MALFORMED",
      "La lista de la emisora no tiene un formato valido",
    );
  }
  if (resolution.candidates.length === 0) {
    throw serviceUnavailable(
      "PLAYLIST_INSECURE_ONLY",
      "La emisora solo ofrece conexiones no seguras (HTTP)",
    );
  }

  return { candidates: resolution.candidates, finalUrl: result.finalUrl };
}

export interface HlsManifest {
  text: string;
  finalUrl: string;
}

export async function fetchHlsManifest(
  url: string,
  options: PlaylistFetchOptions,
): Promise<HlsManifest> {
  const result = await fetchCappedText(url, options);
  if (!result.ok) {
    if (result.failure === "too_large") {
      throw serviceUnavailable("PLAYLIST_MALFORMED", "El manifiesto HLS no es valido");
    }
    throw serviceUnavailable("PLAYLIST_UNREACHABLE", "No se pudo descargar el manifiesto HLS");
  }

  if (!looksLikeHlsBody(result.text)) {
    throw serviceUnavailable("PLAYLIST_MALFORMED", "El manifiesto HLS no es valido");
  }

  return { text: result.text, finalUrl: result.finalUrl };
}

export interface PlaylistWinner {
  response: Response;
  finalUrl: string;
  url: string;
}

export async function openFirstPlayable(
  candidates: string[],
  headers: Record<string, string>,
  options: { signal?: AbortSignal } = {},
): Promise<PlaylistWinner | null> {
  for (const candidate of candidates) {
    try {
      const { response, finalUrl } = await fetchFollowingRedirects(candidate, headers, {
        signal: options.signal,
      });
      if (response.ok) return { response, finalUrl, url: candidate };
      response.body?.cancel().catch(() => {});
    } catch {
      if (options.signal?.aborted) return null;
    }
  }
  return null;
}
