const AUDIO_EXTENSIONS = new Set([
  "aac",
  "flac",
  "m4a",
  "m4b",
  "mp3",
  "mp4",
  "oga",
  "ogg",
  "opus",
  "wav",
  "weba",
  "webm",
  "wma",
]);

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "audio/aac": ".aac",
  "audio/flac": ".flac",
  "audio/m4a": ".m4a",
  "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3",
  "audio/mpeg3": ".mp3",
  "audio/mp3": ".mp3",
  "audio/ogg": ".ogg",
  "audio/opus": ".opus",
  "audio/wav": ".wav",
  "audio/wave": ".wav",
  "audio/webm": ".weba",
  "audio/x-flac": ".flac",
  "audio/x-m4a": ".m4a",
  "audio/x-mp3": ".mp3",
  "audio/x-wav": ".wav",
  "audio/x-ms-wma": ".wma",
};

const RESERVED_WINDOWS_NAMES = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

const MAX_FILENAME_LENGTH = 120;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function filenameFromContentDisposition(raw: string | null): string | null {
  if (!raw) return null;

  const extended = raw.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (extended?.[1]) {
    return safeDecode(extended[1].trim());
  }

  const quoted = raw.match(/filename\s*=\s*"([^"]*)"/i);
  if (quoted?.[1]) {
    return safeDecode(quoted[1].trim());
  }

  const bare = raw.match(/filename\s*=\s*([^;]+)/i);
  if (bare?.[1]) {
    return safeDecode(bare[1].trim().replace(/^["']|["']$/g, ""));
  }

  return null;
}

export function filenameFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const segment = parsed.pathname.split("/").filter(Boolean).pop();
    if (!segment) return null;
    const decoded = safeDecode(segment).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

export function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const normalized = contentType.split(";")[0]?.trim().toLowerCase();
  return normalized ? (CONTENT_TYPE_EXTENSIONS[normalized] ?? null) : null;
}

function splitExtension(raw: string): { base: string; extension: string | null } {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return { base: raw, extension: null };
  const candidate = raw.slice(dot + 1).toLowerCase();
  if (!AUDIO_EXTENSIONS.has(candidate)) return { base: raw, extension: null };
  return { base: raw.slice(0, dot), extension: `.${candidate}` };
}

function sanitizeBase(raw: string, episodeId: number): string {
  const cleaned = Array.from(raw.normalize("NFC"))
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f || /[<>:"|?*]/.test(char)) return " ";
      return char === "/" || char === "\\" ? "-" : char;
    })
    .join("")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^[.\s-]+|[.\s-]+$/g, "");

  const base = cleaned || `tolocharadio_episodio-${episodeId}`;
  return RESERVED_WINDOWS_NAMES.has(base.toLowerCase()) ? `_${base}` : base;
}

function truncateBase(base: string, extension: string): string {
  const maxBaseLength = Math.max(1, MAX_FILENAME_LENGTH - extension.length);
  return base.slice(0, maxBaseLength).replace(/[.\s-]+$/g, "") || "episodio";
}

function asciiFallback(filename: string, episodeId: number): string {
  const ascii = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_")
    .trim();
  return ascii || `episodio-${episodeId}.mp3`;
}

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*!]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export interface DownloadFilenameInput {
  episodeId: number;
  episodeTitle: string;
  finalUrl: string;
  contentType: string | null;
  originContentDisposition: string | null;
}

export interface ResolvedDownloadFilename {
  filename: string;
  asciiFilename: string;
  contentDisposition: string;
}

export function resolveDownloadFilename(input: DownloadFilenameInput): ResolvedDownloadFilename {
  const originName = filenameFromContentDisposition(input.originContentDisposition);
  const finalName = filenameFromUrl(input.finalUrl);
  const extension =
    splitExtension(originName ?? "").extension ??
    splitExtension(finalName ?? "").extension ??
    extensionFromContentType(input.contentType) ??
    ".mp3";

  const titleParts = splitExtension(input.episodeTitle.trim());
  const titleBase = titleParts.extension ? titleParts.base : input.episodeTitle.trim();
  const rawBase = titleBase
    ? `tolocharadio_${titleBase}`
    : `tolocharadio_episodio-${input.episodeId}`;
  const sanitizedBase = sanitizeBase(rawBase, input.episodeId);
  const base =
    sanitizedBase === "tolocharadio_"
      ? `tolocharadio_episodio-${input.episodeId}`
      : sanitizedBase;
  const finalBase = truncateBase(base, extension);
  const filename = `${finalBase}${extension}`;
  const asciiFilename = asciiFallback(filename, input.episodeId);

  return {
    filename,
    asciiFilename,
    contentDisposition: `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeRfc5987(filename)}`,
  };
}
