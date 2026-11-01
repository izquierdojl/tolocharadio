import { describe, expect, it } from "vitest";
import {
  contentTypeForContainer,
  isConcatenableContainer,
  skipId3Tag,
  sniffSegmentContainer,
} from "../src/lib/segmentContainer.js";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function withId3(payload: number[], tagSize = 8): Uint8Array {
  const header = [
    0x49,
    0x44,
    0x33,
    0x04,
    0x00,
    0x00,
    (tagSize >> 21) & 0x7f,
    (tagSize >> 14) & 0x7f,
    (tagSize >> 7) & 0x7f,
    tagSize & 0x7f,
  ];
  return new Uint8Array([...header, ...new Array(tagSize).fill(0), ...payload]);
}

describe("segment container sniffing", () => {
  it("detecta AAC-ADTS", () => {
    expect(sniffSegmentContainer(bytes(0xff, 0xf1, 0x50, 0x80, 0x00))).toBe("adts");
    expect(sniffSegmentContainer(bytes(0xff, 0xf9, 0x50, 0x80, 0x00))).toBe("adts");
  });

  it("detecta MP3", () => {
    expect(sniffSegmentContainer(bytes(0xff, 0xfb, 0x90, 0x64))).toBe("mp3");
    expect(sniffSegmentContainer(bytes(0xff, 0xf3, 0x90, 0x64))).toBe("mp3");
  });

  it("salta la etiqueta ID3 antes de mirar el primer frame", () => {
    const data = withId3([0xff, 0xf1, 0x50, 0x80], 12);
    expect(skipId3Tag(data)).toBe(22);
    expect(sniffSegmentContainer(data)).toBe("adts");
  });

  it("detecta fMP4", () => {
    const data = new Uint8Array([
      0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d,
    ]);
    expect(sniffSegmentContainer(data)).toBe("fmp4");
  });

  it("detecta MPEG-TS por doble sincronismo", () => {
    const data = new Uint8Array(376).fill(0x00);
    data[0] = 0x47;
    data[188] = 0x47;
    expect(sniffSegmentContainer(data)).toBe("mpegts");
  });

  it("no confunde un unico byte 0x47 con MPEG-TS", () => {
    const data = new Uint8Array(188).fill(0x00);
    data[0] = 0x47;
    expect(sniffSegmentContainer(data)).toBe("unknown");
  });

  it("devuelve unknown con datos vacios o truncados", () => {
    expect(sniffSegmentContainer(new Uint8Array(0))).toBe("unknown");
    expect(sniffSegmentContainer(bytes(0x49, 0x44, 0x33))).toBe("unknown");
    expect(sniffSegmentContainer(bytes(0xff))).toBe("unknown");
  });

  it("solo considera concatenables ADTS y MP3", () => {
    expect(isConcatenableContainer("adts")).toBe(true);
    expect(isConcatenableContainer("mp3")).toBe(true);
    expect(isConcatenableContainer("fmp4")).toBe(false);
    expect(isConcatenableContainer("mpegts")).toBe(false);
    expect(isConcatenableContainer("unknown")).toBe(false);
  });

  it("elige el tipo de contenido de audio", () => {
    expect(contentTypeForContainer("adts")).toBe("audio/aac");
    expect(contentTypeForContainer("mp3")).toBe("audio/mpeg");
  });
});
