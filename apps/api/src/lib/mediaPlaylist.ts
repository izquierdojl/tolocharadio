import { unsupportedMediaType } from "../errors.js";

export interface MediaSegment {
  url: string;
  sequence: number;
  duration: number;
  programDateTime: number | null;
  discontinuity: boolean;
}

export interface MediaPlaylist {
  targetDuration: number;
  mediaSequence: number;
  segments: MediaSegment[];
  endList: boolean;
  encrypted: boolean;
  hasMap: boolean;
}

export interface MasterVariant {
  url: string;
  bandwidth: number | null;
}

const DEFAULT_TARGET_DURATION = 10;

function resolveUrl(raw: string, baseUrl: string): string | null {
  try {
    const resolved = new URL(raw, baseUrl);
    return resolved.protocol === "https:" ? resolved.toString() : null;
  } catch {
    return null;
  }
}

export function isMasterPlaylist(text: string): boolean {
  return /^#EXT-X-STREAM-INF:/m.test(text);
}

export function parseMasterPlaylist(text: string, baseUrl: string): MasterVariant[] {
  const variants: MasterVariant[] = [];
  let pendingBandwidth: number | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const match = /BANDWIDTH=(\d+)/i.exec(line);
      pendingBandwidth = match ? Number(match[1]) : null;
      continue;
    }
    if (line.startsWith("#")) continue;
    const url = resolveUrl(line, baseUrl);
    if (url) variants.push({ url, bandwidth: pendingBandwidth });
    pendingBandwidth = null;
  }

  return variants;
}

export function parseMediaPlaylist(text: string, baseUrl: string): MediaPlaylist {
  const segments: MediaSegment[] = [];
  let targetDuration = 0;
  let mediaSequence = 0;
  let endList = false;
  let encrypted = false;
  let hasMap = false;
  let pendingDuration: number | null = null;
  let pendingPdt: number | null = null;
  let pendingDiscontinuity = false;
  let nextPdt: number | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#EXT-X-TARGETDURATION:")) {
      targetDuration = Number(line.slice("#EXT-X-TARGETDURATION:".length));
      continue;
    }
    if (line.startsWith("#EXT-X-MEDIA-SEQUENCE:")) {
      mediaSequence = Number(line.slice("#EXT-X-MEDIA-SEQUENCE:".length));
      continue;
    }
    if (line.startsWith("#EXT-X-PROGRAM-DATE-TIME:")) {
      const parsed = Date.parse(line.slice("#EXT-X-PROGRAM-DATE-TIME:".length).trim());
      pendingPdt = Number.isFinite(parsed) ? parsed : null;
      continue;
    }
    if (line.startsWith("#EXT-X-KEY:")) {
      if (!/METHOD=NONE/i.test(line)) encrypted = true;
      continue;
    }
    if (line.startsWith("#EXT-X-MAP:")) {
      hasMap = true;
      continue;
    }
    if (line === "#EXT-X-DISCONTINUITY") {
      pendingDiscontinuity = true;
      continue;
    }
    if (line === "#EXT-X-ENDLIST") {
      endList = true;
      continue;
    }
    if (line.startsWith("#EXTINF:")) {
      const value = line.slice("#EXTINF:".length).split(",")[0]?.trim() ?? "";
      const duration = Number(value);
      pendingDuration = Number.isFinite(duration) && duration >= 0 ? duration : 0;
      continue;
    }
    if (line.startsWith("#")) continue;

    const url = resolveUrl(line, baseUrl);
    const duration = pendingDuration ?? 0;
    const pdt: number | null = pendingPdt ?? nextPdt;
    if (url) {
      segments.push({
        url,
        sequence: mediaSequence + segments.length,
        duration,
        programDateTime: pdt,
        discontinuity: pendingDiscontinuity,
      });
    }
    if (pdt !== null) nextPdt = pdt + duration * 1000;
    pendingDuration = null;
    pendingPdt = null;
    pendingDiscontinuity = false;
  }

  return {
    targetDuration:
      Number.isFinite(targetDuration) && targetDuration > 0
        ? targetDuration
        : DEFAULT_TARGET_DURATION,
    mediaSequence,
    segments,
    endList,
    encrypted,
    hasMap,
  };
}

export function lastSegment(playlist: MediaPlaylist): MediaSegment | null {
  return playlist.segments[playlist.segments.length - 1] ?? null;
}

export function segmentEndMs(segment: MediaSegment): number | null {
  if (segment.programDateTime === null) return null;
  return segment.programDateTime + segment.duration * 1000;
}

export function unsupportedContainerError() {
  return unsupportedMediaType(
    "HLS_UNSUPPORTED_CONTAINER",
    "Esta emisora usa un formato HLS que no se puede reproducir como flujo continuo",
  );
}
