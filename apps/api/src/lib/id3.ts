/**
 * Lector mínimo de etiquetas ID3v2 (2.3 y 2.4) para extraer el título y el
 * artista del comienzo de un segmento HLS. Solo lee marcos de texto `TIT2` y
 * `TPE1`; nunca lanza excepciones con datos truncados o malformados.
 */

const HEADER_SIZE = 10;
const FRAME_HEADER_SIZE = 10;

export interface Id3TextFrames {
  title: string | null;
  artist: string | null;
}

function syncsafe(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! & 0x7f) << 21) |
    ((bytes[offset + 1]! & 0x7f) << 14) |
    ((bytes[offset + 2]! & 0x7f) << 7) |
    (bytes[offset + 3]! & 0x7f)
  );
}

function uint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) >>> 0) +
    (bytes[offset + 1]! << 16) +
    (bytes[offset + 2]! << 8) +
    bytes[offset + 3]!
  );
}

function decodeUtf16(bytes: Uint8Array, bigEndian: boolean): string {
  let data = bytes;
  if (bigEndian) {
    const swapped = new Uint8Array(bytes.length - (bytes.length % 2));
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      swapped[i] = bytes[i + 1]!;
      swapped[i + 1] = bytes[i]!;
    }
    data = swapped;
  }
  return new TextDecoder("utf-16le").decode(data);
}

/** Decodifica el contenido de un marco de texto según su byte de codificación. */
export function decodeId3Text(frame: Uint8Array): string {
  if (frame.length === 0) return "";
  const encoding = frame[0];
  const body = frame.subarray(1);
  let text: string;
  switch (encoding) {
    case 1: {
      // UTF-16 con BOM; sin BOM se asume little endian.
      if (body[0] === 0xfe && body[1] === 0xff) text = decodeUtf16(body.subarray(2), true);
      else if (body[0] === 0xff && body[1] === 0xfe) text = decodeUtf16(body.subarray(2), false);
      else text = decodeUtf16(body, false);
      break;
    }
    case 2:
      text = decodeUtf16(body, true);
      break;
    case 3:
      text = new TextDecoder("utf-8").decode(body);
      break;
    default:
      text = new TextDecoder("latin1").decode(body);
  }
  // Varios valores van separados por NUL: se toma el primero no vacío.
  const first = text.split("\0").find((part) => part.trim().length > 0) ?? "";
  return first.replace(/\u{FEFF}/gu, "").trim();
}

function startsWithId3(bytes: Uint8Array, offset: number): boolean {
  return (
    offset + HEADER_SIZE <= bytes.length &&
    bytes[offset] === 0x49 &&
    bytes[offset + 1] === 0x44 &&
    bytes[offset + 2] === 0x33
  );
}

/**
 * Lee `TIT2` y `TPE1` de las etiquetas ID3v2 consecutivas al inicio de
 * `bytes` (algunos servidores envían una con `PRIV` y otra con el título).
 * Gana el primer valor no vacío de cada marco. Devuelve `null` si los bytes
 * no empiezan por una etiqueta ID3.
 */
export function readId3TextFrames(bytes: Uint8Array): Id3TextFrames | null {
  if (!startsWithId3(bytes, 0)) return null;

  const result: Id3TextFrames = { title: null, artist: null };
  let offset = 0;
  while (startsWithId3(bytes, offset)) {
    const tagSize = HEADER_SIZE + syncsafe(bytes, offset + 6);
    readTag(bytes.subarray(offset, Math.min(bytes.length, offset + tagSize)), result);
    if (result.title && result.artist) break;
    offset += tagSize;
  }
  return result;
}

/** Lee una única etiqueta ID3v2 y completa los marcos que aún falten. */
function readTag(bytes: Uint8Array, result: Id3TextFrames): void {
  const version = bytes[3]!;
  const flags = bytes[5]!;
  if (version !== 3 && version !== 4) return;
  // Unsynchronisation a nivel de etiqueta: poco habitual en directo, no se lee.
  if (flags & 0x80) return;

  const end = bytes.length;
  let offset = HEADER_SIZE;

  if (flags & 0x40) {
    if (offset + 4 > end) return;
    // v2.3: el tamaño no incluye sus 4 bytes; v2.4: syncsafe e incluido.
    offset += version === 3 ? 4 + uint32(bytes, offset) : syncsafe(bytes, offset);
  }

  while (offset + FRAME_HEADER_SIZE <= end) {
    if (bytes[offset] === 0) break; // relleno
    const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const size = version === 4 ? syncsafe(bytes, offset + 4) : uint32(bytes, offset + 4);
    const formatFlags = bytes[offset + 9]!;
    const dataStart = offset + FRAME_HEADER_SIZE;
    const dataEnd = dataStart + size;
    if (size <= 0 || dataEnd > end) break;

    // Compresión, cifrado, agrupación (y en 2.4 unsync o longitud de datos por
    // marco) cambian el formato del contenido: el marco se ignora.
    const unreadable =
      version === 3 ? (formatFlags & 0xe0) !== 0 : (formatFlags & 0x4f) !== 0;
    if (!unreadable && (id === "TIT2" || id === "TPE1")) {
      const text = decodeId3Text(bytes.subarray(dataStart, dataEnd));
      if (id === "TIT2") result.title ??= text || null;
      else result.artist ??= text || null;
    }
    offset = dataEnd;
  }
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compone el texto «Artista - Título». Si el título ya incluye al artista,
 * o no hay artista, devuelve el título; sin título devuelve `null`.
 */
export function composeId3Title(frames: Id3TextFrames): string | null {
  const title = frames.title?.trim();
  if (!title) return null;
  const artist = frames.artist?.trim();
  if (!artist || normalized(title).includes(normalized(artist))) return title;
  return `${artist} - ${title}`;
}
