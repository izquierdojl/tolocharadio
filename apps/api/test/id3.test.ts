import { describe, expect, it } from "vitest";
import { composeId3Title, decodeId3Text, readId3TextFrames } from "../src/lib/id3.js";

type Encoding = 0 | 1 | 2 | 3;

function encodeText(text: string, encoding: Encoding): Uint8Array {
  switch (encoding) {
    case 0:
      return Uint8Array.from(Buffer.from(text, "latin1"));
    case 1:
      return Uint8Array.from([0xff, 0xfe, ...Buffer.from(text, "utf16le")]);
    case 2: {
      const le = Buffer.from(text, "utf16le");
      const be = Buffer.alloc(le.length);
      for (let i = 0; i < le.length; i += 2) {
        be[i] = le[i + 1]!;
        be[i + 1] = le[i]!;
      }
      return Uint8Array.from(be);
    }
    default:
      return Uint8Array.from(Buffer.from(text, "utf8"));
  }
}

function syncsafeBytes(n: number): number[] {
  return [(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f];
}

function uint32Bytes(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

interface FrameSpec {
  id: string;
  text?: string;
  raw?: Uint8Array;
  encoding?: Encoding;
  flags?: [number, number];
}

function frame(version: 3 | 4, spec: FrameSpec): number[] {
  const data = spec.raw ?? Uint8Array.from([spec.encoding ?? 3, ...encodeText(spec.text ?? "", spec.encoding ?? 3)]);
  const size = version === 4 ? syncsafeBytes(data.length) : uint32Bytes(data.length);
  return [...Buffer.from(spec.id, "latin1"), ...size, ...(spec.flags ?? [0, 0]), ...data];
}

function tag(version: 3 | 4, frames: FrameSpec[], options: { flags?: number; trailing?: number[] } = {}): Uint8Array {
  const body = frames.flatMap((f) => frame(version, f));
  const padded = [...body, 0, 0, 0, 0];
  return Uint8Array.from([
    0x49, 0x44, 0x33, version, 0, options.flags ?? 0, ...syncsafeBytes(padded.length),
    ...padded,
    ...(options.trailing ?? [0xff, 0xf1, 0x50, 0x80]), // inicio de audio ADTS
  ]);
}

describe("readId3TextFrames", () => {
  it("lee título y artista en ID3v2.4 UTF-8", () => {
    const bytes = tag(4, [
      { id: "PRIV", raw: Uint8Array.from([...Buffer.from("com.apple.streaming\0"), 1, 2, 3]) },
      { id: "TPE1", text: "Madonna" },
      { id: "TIT2", text: "Sorry" },
    ]);
    expect(readId3TextFrames(bytes)).toEqual({ title: "Sorry", artist: "Madonna" });
  });

  it("lee ID3v2.3 con tamaños de marco no syncsafe", () => {
    const long = "x".repeat(200); // 200 > 127: distingue syncsafe de uint32
    const bytes = tag(3, [
      { id: "TXXX", text: long },
      { id: "TIT2", text: "Gonzalo Hermida - Esperanza al corazón" },
    ]);
    expect(readId3TextFrames(bytes)?.title).toBe("Gonzalo Hermida - Esperanza al corazón");
  });

  it.each([
    [0, "Canción de Peñíscola"],
    [1, "Canción de Peñíscola"],
    [2, "Canción de Peñíscola"],
    [3, "Canción de Peñíscola"],
  ] as const)("decodifica la codificación %i", (encoding, text) => {
    expect(readId3TextFrames(tag(4, [{ id: "TIT2", text, encoding }]))?.title).toBe(text);
  });

  it("lee etiquetas ID3 consecutivas (PRIV y después el título)", () => {
    // Caso real de Cadena100 HLS: una etiqueta con PRIV y otra con TIT2.
    const priv = tag(4, [{ id: "PRIV", raw: Uint8Array.from([...Buffer.from("com.apple\0"), 1, 2]) }], {
      trailing: [],
    });
    const title = tag(4, [{ id: "TIT2", text: "Eric Prydz - Call on me" }]);
    const bytes = Uint8Array.from([...priv, ...title]);
    expect(readId3TextFrames(bytes)).toEqual({ title: "Eric Prydz - Call on me", artist: null });
  });

  it("devuelve título null con solo PRIV o TIT2 vacío", () => {
    expect(readId3TextFrames(tag(4, [{ id: "PRIV", raw: Uint8Array.from([1, 2, 3]) }]))).toEqual({
      title: null,
      artist: null,
    });
    expect(readId3TextFrames(tag(4, [{ id: "TIT2", text: "" }]))?.title).toBeNull();
  });

  it("devuelve null si no hay etiqueta ID3", () => {
    expect(readId3TextFrames(Uint8Array.from([0x47, 0x40, 0x00, 0x10, ...new Array(20).fill(0)]))).toBeNull();
    expect(readId3TextFrames(new Uint8Array(0))).toBeNull();
  });

  it("no lanza con una etiqueta truncada", () => {
    const full = tag(4, [{ id: "TPE1", text: "Artista" }, { id: "TIT2", text: "Un título bastante largo" }]);
    const truncated = full.subarray(0, 30);
    expect(() => readId3TextFrames(truncated)).not.toThrow();
    expect(readId3TextFrames(truncated)).toEqual({ title: null, artist: "Artista" });
  });

  it("salta la cabecera extendida", () => {
    // v2.4: cabecera extendida de 6 bytes (tamaño syncsafe incluido).
    const ext = [...syncsafeBytes(6), 1, 0];
    const frames = frame(4, { id: "TIT2", text: "Con extendida" });
    const body = [...ext, ...frames];
    const bytes = Uint8Array.from([0x49, 0x44, 0x33, 4, 0, 0x40, ...syncsafeBytes(body.length), ...body]);
    expect(readId3TextFrames(bytes)?.title).toBe("Con extendida");
  });

  it("ignora marcos comprimidos o cifrados", () => {
    const bytes = tag(4, [{ id: "TIT2", text: "oculto", flags: [0, 0x08] }]);
    expect(readId3TextFrames(bytes)?.title).toBeNull();
  });

  it("no lee etiquetas con unsynchronisation", () => {
    const bytes = tag(4, [{ id: "TIT2", text: "x" }], { flags: 0x80 });
    expect(readId3TextFrames(bytes)).toEqual({ title: null, artist: null });
  });
});

describe("decodeId3Text", () => {
  it("toma el primer valor de varios separados por NUL", () => {
    expect(decodeId3Text(Uint8Array.from([3, ...Buffer.from("Uno\0Dos")]))).toBe("Uno");
  });
});

describe("composeId3Title", () => {
  it("antepone el artista", () => {
    expect(composeId3Title({ title: "Sorry", artist: "Madonna" })).toBe("Madonna - Sorry");
  });

  it("no repite el artista si el título ya lo incluye", () => {
    expect(composeId3Title({ title: "Madonna - Sorry", artist: "MADONNA" })).toBe("Madonna - Sorry");
    expect(composeId3Title({ title: "Maná - Rayando el sol", artist: "Mana" })).toBe("Maná - Rayando el sol");
  });

  it("usa solo el título si no hay artista", () => {
    expect(composeId3Title({ title: "Madonna - Sorry", artist: null })).toBe("Madonna - Sorry");
  });

  it("devuelve null sin título aunque haya artista", () => {
    expect(composeId3Title({ title: null, artist: "Madonna" })).toBeNull();
    expect(composeId3Title({ title: "  ", artist: "Madonna" })).toBeNull();
  });
});
