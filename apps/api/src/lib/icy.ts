/**
 * Utilidades puras para metadatos ICY (Shoutcast/Icecast): extracción de
 * `StreamTitle` de un bloque de metadatos y filtrado de títulos que no
 * informan de lo que suena.
 */

export const NOW_PLAYING_MAX_LENGTH = 200;

const STREAM_TITLE_PREFIX = "StreamTitle='";
const LONG_TOKEN_LENGTH = 24;

/** Palabras genéricas de emisión que no aportan información por sí solas. */
const FILLER_WORDS = new Set([
  "en",
  "directo",
  "emision",
  "live",
  "online",
  "streaming",
  "radio",
  "fm",
  "la",
  "el",
]);

const DOMAIN_PATTERN = /\b[\p{L}\d-]+\.(com|net|org|es|fm|info|io|tv|radio|eu|cat)\b/iu;
const SEPARATORS_ONLY = /^[\s\-|·.:/_~*]*$/u;

/** Decodifica bytes de metadatos como UTF-8 estricto o, si no lo son, como Latin-1. */
export function decodeIcyText(bytes: Uint8Array): string {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  const trimmed = bytes.subarray(0, end);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(trimmed);
  } catch {
    return new TextDecoder("latin1").decode(trimmed);
  }
}

/**
 * Extrae el valor de `StreamTitle` de un bloque de metadatos ICY.
 * Devuelve `null` si el bloque no contiene ese campo y `""` si viene vacío.
 */
export function extractStreamTitle(block: Uint8Array): string | null {
  const text = decodeIcyText(block);
  const start = text.indexOf(STREAM_TITLE_PREFIX);
  if (start === -1) return null;
  const valueStart = start + STREAM_TITLE_PREFIX.length;

  let firstClose = -1;
  let searchFrom = valueStart;
  for (;;) {
    const close = text.indexOf("';", searchFrom);
    if (close === -1) break;
    if (firstClose === -1) firstClose = close;
    const rest = text.slice(close + 2);
    // El título puede contener comillas: el cierre válido es el que va seguido
    // del final del bloque o de otro campo `Clave='`.
    if (/^\s*$/.test(rest) || /^\s*[A-Za-z]+='/.test(rest)) {
      return text.slice(valueStart, close);
    }
    searchFrom = close + 2;
  }

  if (firstClose !== -1) return text.slice(valueStart, firstClose);
  // Bloque truncado sin cierre: se toma el resto si termina en comilla.
  const tail = text.slice(valueStart);
  return tail.endsWith("'") ? tail.slice(0, -1) : null;
}

function cleanText(raw: string): string {
  const cleaned = raw
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > NOW_PLAYING_MAX_LENGTH
    ? cleaned.slice(0, NOW_PLAYING_MAX_LENGTH).trimEnd()
    : cleaned;
}

function tokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export interface NowPlayingContext {
  stationName: string;
  icyName?: string | null;
}

/**
 * Normaliza un `StreamTitle` y devuelve `null` si no informa de lo que suena:
 * vacío, solo el nombre de la emisora o su `icy-name`, avisos de directo,
 * URLs/dominios o códigos internos sin espacios.
 */
export function normalizeNowPlaying(
  raw: string | null | undefined,
  context: NowPlayingContext,
): string | null {
  if (raw == null) return null;
  const title = cleanText(raw);
  if (!title || SEPARATORS_ONLY.test(title)) return null;

  if (/:\/\//.test(title) || /\bwww\./i.test(title) || DOMAIN_PATTERN.test(title)) return null;

  if (!/\s/.test(title) && (title.includes("_") || title.length > LONG_TOKEN_LENGTH)) return null;

  const ignored = new Set<string>([
    ...FILLER_WORDS,
    ...tokens(context.stationName),
    ...tokens(context.icyName ?? ""),
  ]);
  const meaningful = tokens(title).filter((token) => !ignored.has(token));
  if (meaningful.length === 0) return null;

  return title;
}
