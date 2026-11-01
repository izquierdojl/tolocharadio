import { describe, expect, it } from "vitest";
import {
  isMasterPlaylist,
  lastSegment,
  parseMasterPlaylist,
  parseMediaPlaylist,
  segmentEndMs,
  unsupportedContainerError,
} from "../src/lib/mediaPlaylist.js";

const BASE = "https://cdn.example.org/hls/playlist.m3u8";

describe("master playlist", () => {
  it("detecta y resuelve variantes relativas", () => {
    const text = [
      "#EXTM3U",
      '#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2"',
      "low/index.m3u8",
      "#EXT-X-STREAM-INF:BANDWIDTH=256000",
      "https://cdn.example.org/hls/high.m3u8",
    ].join("\n");

    expect(isMasterPlaylist(text)).toBe(true);
    expect(parseMasterPlaylist(text, BASE)).toEqual([
      { url: "https://cdn.example.org/hls/low/index.m3u8", bandwidth: 128000 },
      { url: "https://cdn.example.org/hls/high.m3u8", bandwidth: 256000 },
    ]);
  });

  it("no trata una playlist de medios como maestra", () => {
    expect(isMasterPlaylist("#EXTM3U\n#EXTINF:10,\n1.aac")).toBe(false);
  });
});

describe("media playlist", () => {
  it("parsea segmentos, secuencia y program-date-time", () => {
    const text = [
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-TARGETDURATION:10",
      "#EXT-X-MEDIA-SEQUENCE:5",
      "#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00.000Z",
      "#EXTINF:9.5,",
      "1.aac",
      "#EXTINF:10,",
      "2.aac",
      "#EXT-X-ENDLIST",
    ].join("\n");

    const playlist = parseMediaPlaylist(text, BASE);
    expect(playlist.targetDuration).toBe(10);
    expect(playlist.mediaSequence).toBe(5);
    expect(playlist.endList).toBe(true);
    expect(playlist.encrypted).toBe(false);
    expect(playlist.hasMap).toBe(false);
    expect(playlist.segments).toHaveLength(2);
    expect(playlist.segments[0]).toMatchObject({
      url: "https://cdn.example.org/hls/1.aac",
      sequence: 5,
      duration: 9.5,
      programDateTime: Date.parse("2026-01-01T00:00:00.000Z"),
    });
    expect(playlist.segments[1]!.programDateTime).toBe(
      Date.parse("2026-01-01T00:00:00.000Z") + 9500,
    );
  });

  it("respeta el programa de tiempo en cada segmento", () => {
    const text = [
      "#EXTM3U",
      "#EXT-X-TARGETDURATION:10",
      "#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00.000Z",
      "#EXTINF:10,",
      "1.aac",
      "#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:01:00.000Z",
      "#EXTINF:10,",
      "2.aac",
    ].join("\n");

    const playlist = parseMediaPlaylist(text, BASE);
    expect(playlist.segments[1]!.programDateTime).toBe(Date.parse("2026-01-01T00:01:00.000Z"));
  });

  it("marca cifrado salvo METHOD=NONE", () => {
    const encrypted = parseMediaPlaylist(
      ['#EXTM3U', '#EXT-X-KEY:METHOD=AES-128,URI="k.bin"', "#EXTINF:10,", "1.aac"].join("\n"),
      BASE,
    );
    expect(encrypted.encrypted).toBe(true);

    const clear = parseMediaPlaylist(
      ['#EXTM3U', "#EXT-X-KEY:METHOD=NONE", "#EXTINF:10,", "1.aac"].join("\n"),
      BASE,
    );
    expect(clear.encrypted).toBe(false);
  });

  it("detecta mapas de inicializacion y discontinuidades", () => {
    const playlist = parseMediaPlaylist(
      [
        "#EXTM3U",
        '#EXT-X-MAP:URI="init.mp4"',
        "#EXT-X-DISCONTINUITY",
        "#EXTINF:10,",
        "1.m4s",
      ].join("\n"),
      BASE,
    );
    expect(playlist.hasMap).toBe(true);
    expect(playlist.segments[0]!.discontinuity).toBe(true);
  });

  it("descarta URIs no HTTPS", () => {
    const playlist = parseMediaPlaylist(
      ["#EXTM3U", "#EXTINF:10,", "http://cdn.example.org/1.aac", "#EXTINF:10,", "2.aac"].join("\n"),
      BASE,
    );
    expect(playlist.segments).toHaveLength(1);
    expect(playlist.segments[0]!.url).toBe("https://cdn.example.org/hls/2.aac");
  });

  it("usa 10 segundos como duracion objetivo por defecto", () => {
    expect(parseMediaPlaylist("#EXTM3U", BASE).targetDuration).toBe(10);
  });

  it("calcula el final de un segmento con program-date-time", () => {
    const playlist = parseMediaPlaylist(
      [
        "#EXTM3U",
        "#EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00.000Z",
        "#EXTINF:10,",
        "1.aac",
      ].join("\n"),
      BASE,
    );
    expect(lastSegment(playlist)?.url).toBe("https://cdn.example.org/hls/1.aac");
    expect(segmentEndMs(playlist.segments[0]!)).toBe(
      Date.parse("2026-01-01T00:00:00.000Z") + 10_000,
    );
    expect(segmentEndMs({ ...playlist.segments[0]!, programDateTime: null })).toBeNull();
  });

  it("devuelve un error 415 tipado para contenedores no soportados", () => {
    const error = unsupportedContainerError();
    expect(error.status).toBe(415);
    expect(error.code).toBe("HLS_UNSUPPORTED_CONTAINER");
  });
});
