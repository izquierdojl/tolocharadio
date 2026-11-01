const ID3_HEADER_SIZE = 10;
const MPEG_TS_PACKET_SIZE = 188;
const SYNCSAFE_BYTES = 4;

export type SegmentContainer = "adts" | "mp3" | "fmp4" | "mpegts" | "unknown";

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  if (offset + length > bytes.length) return "";
  let text = "";
  for (let i = 0; i < length; i++) text += String.fromCharCode(bytes[offset + i]!);
  return text;
}

function syncsafeSize(bytes: Uint8Array, offset: number): number {
  let size = 0;
  for (let i = 0; i < SYNCSAFE_BYTES; i++) {
    size = (size << 7) | (bytes[offset + i]! & 0x7f);
  }
  return size;
}

export function skipId3Tag(bytes: Uint8Array): number {
  if (asciiAt(bytes, 0, 3) !== "ID3") return 0;
  if (bytes.length < ID3_HEADER_SIZE) return bytes.length;
  const size = syncsafeSize(bytes, 6);
  return Math.min(bytes.length, ID3_HEADER_SIZE + size);
}

export function stripId3Tags(bytes: Uint8Array): Uint8Array {
  let offset = 0;
  while (
    offset + ID3_HEADER_SIZE <= bytes.length &&
    asciiAt(bytes, offset, 3) === "ID3"
  ) {
    const size = syncsafeSize(bytes, offset + 6);
    const end = offset + ID3_HEADER_SIZE + size;
    if (end <= offset || end > bytes.length) return new Uint8Array(0);
    offset = end;
  }
  return offset === 0 ? bytes : bytes.subarray(offset);
}

export function sniffSegmentContainer(bytes: Uint8Array): SegmentContainer {
  if (bytes.length === 0) return "unknown";

  const offset = skipId3Tag(bytes);
  const first = bytes[offset];
  const second = bytes[offset + 1];
  if (first === undefined) return "unknown";

  if (first === 0x47) {
    if (bytes.length < MPEG_TS_PACKET_SIZE + 1) return "unknown";
    return bytes[offset + MPEG_TS_PACKET_SIZE] === 0x47 ? "mpegts" : "unknown";
  }

  if (first === 0xff && second !== undefined && (second & 0xe0) === 0xe0) {
    const layer = (second >> 1) & 0x03;
    return layer === 0 ? "adts" : "mp3";
  }

  const boxType = asciiAt(bytes, offset + 4, 4);
  if (boxType === "ftyp" || boxType === "styp" || boxType === "moof" || boxType === "sidx") {
    return "fmp4";
  }

  return "unknown";
}

export function isConcatenableContainer(container: SegmentContainer): boolean {
  return container === "adts" || container === "mp3";
}

export function contentTypeForContainer(container: SegmentContainer): string {
  return container === "mp3" ? "audio/mpeg" : "audio/aac";
}

export function isHlsEntryUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}
