import { describe, expect, it } from "vitest";
import {
  buildSubresourceUrl,
  HLS_MAX_DEPTH,
  isHlsManifest,
  looksLikeHlsBody,
  rewriteHlsManifest,
  signSubresource,
  validateSubresourceRequest,
  verifySubresource,
} from "../src/lib/hls.js";

const SECRET = "test-secret-0123456789-abcdefghijklmnop";
const STATION_ID = "station-1";
const MEDIA_URL = "https://cdn.example.org/path/media.m3u8";

describe("firma de subrecursos", () => {
  it("firma y verifica una URL", () => {
    const signature = signSubresource(SECRET, STATION_ID, 1, MEDIA_URL);
    expect(verifySubresource(SECRET, STATION_ID, 1, MEDIA_URL, signature)).toBe(true);
  });

  it("rechaza una firma manipulada", () => {
    const signature = signSubresource(SECRET, STATION_ID, 1, MEDIA_URL);
    const tampered = `${signature.slice(0, -1)}${signature.endsWith("0") ? "1" : "0"}`;
    expect(verifySubresource(SECRET, STATION_ID, 1, MEDIA_URL, tampered)).toBe(false);
  });

  it("rechaza firma valida de otra emisora, profundidad o URL", () => {
    const signature = signSubresource(SECRET, STATION_ID, 1, MEDIA_URL);
    expect(verifySubresource(SECRET, "otra", 1, MEDIA_URL, signature)).toBe(false);
    expect(verifySubresource(SECRET, STATION_ID, 2, MEDIA_URL, signature)).toBe(false);
    expect(verifySubresource(SECRET, STATION_ID, 1, "https://otra.example/x.m3u8", signature)).toBe(
      false,
    );
  });
});

describe("validateSubresourceRequest", () => {
  function requestFor(url: string, depth: number, secret = SECRET, stationId = STATION_ID) {
    return {
      secret,
      stationId,
      rawUrl: Buffer.from(url, "utf8").toString("base64url"),
      rawDepth: String(depth),
      signature: signSubresource(secret, stationId, depth, url),
    };
  }

  it("acepta una peticion correctamente firmada", () => {
    const validated = validateSubresourceRequest(requestFor(MEDIA_URL, 1));
    expect(validated).toEqual({ url: MEDIA_URL, depth: 1 });
  });

  it("rechaza una firma invalida con 403", () => {
    expect(() =>
      validateSubresourceRequest({ ...requestFor(MEDIA_URL, 1), signature: "deadbeef" }),
    ).toThrow(expect.objectContaining({ code: "HLS_INVALID_SIGNATURE", status: 403 }));
  });

  it("rechaza URLs no HTTPS con 400", () => {
    const request = requestFor("http://insegura.example/media.m3u8", 1);
    expect(() => validateSubresourceRequest(request)).toThrow(
      expect.objectContaining({ code: "HLS_INVALID_URL", status: 400 }),
    );
  });

  it("rechaza profundidades por encima del tope con 400", () => {
    const request = requestFor(MEDIA_URL, HLS_MAX_DEPTH + 1);
    expect(() => validateSubresourceRequest(request)).toThrow(
      expect.objectContaining({ code: "HLS_INVALID_URL", status: 400 }),
    );
  });

  it("rechaza parametros malformados con 400", () => {
    const valid = requestFor(MEDIA_URL, 1);
    expect(() => validateSubresourceRequest({ ...valid, rawUrl: undefined })).toThrow(
      expect.objectContaining({ code: "HLS_INVALID_URL" }),
    );
    expect(() => validateSubresourceRequest({ ...valid, rawUrl: "no-base64-%%%" })).toThrow(
      expect.objectContaining({ code: "HLS_INVALID_URL" }),
    );
    expect(() => validateSubresourceRequest({ ...valid, rawDepth: "x" })).toThrow(
      expect.objectContaining({ code: "HLS_INVALID_URL" }),
    );
  });
});

describe("buildSubresourceUrl", () => {
  it("genera una URL que validateSubresourceRequest acepta", () => {
    const built = buildSubresourceUrl(SECRET, STATION_ID, "/api/v1", MEDIA_URL, 1);
    expect(built.startsWith(`/api/v1/playback/${STATION_ID}/hls?`)).toBe(true);

    const parsed = new URL(built, "https://api.example.org");
    const validated = validateSubresourceRequest({
      secret: SECRET,
      stationId: STATION_ID,
      rawUrl: parsed.searchParams.get("u"),
      rawDepth: parsed.searchParams.get("d"),
      signature: parsed.searchParams.get("s"),
    });
    expect(validated).toEqual({ url: MEDIA_URL, depth: 1 });
  });
});

describe("isHlsManifest", () => {
  it("detecta por extension, content-type o cuerpo", () => {
    expect(isHlsManifest("https://x.example/master.m3u8?x=1", null)).toBe(true);
    expect(isHlsManifest("https://x.example/master", "application/vnd.apple.mpegurl")).toBe(true);
    expect(isHlsManifest("https://x.example/master", "application/x-mpegURL")).toBe(true);
    expect(isHlsManifest("https://x.example/master", "text/plain", "#EXTM3U\n#EXT-X-VERSION:3")).toBe(
      true,
    );
    expect(isHlsManifest("https://x.example/segment.ts", "video/mp2t")).toBe(false);
  });

  it("looksLikeHlsBody tolera BOM y espacios iniciales", () => {
    expect(looksLikeHlsBody("\uFEFF  #EXTM3U\n")).toBe(true);
    expect(looksLikeHlsBody("<html>")).toBe(false);
  });
});

describe("rewriteHlsManifest", () => {
  const baseUrl = "https://cdn.example.org/hls/master.m3u8";
  const rewriteUri = (url: string, depth: number) => `proxy:${depth}:${url}`;

  it("reescribe la playlist maestra con variantes relativas y absolutas", () => {
    const text = [
      "#EXTM3U",
      "#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=720x404",
      "media/720p.m3u8",
      "#EXT-X-STREAM-INF:BANDWIDTH=2560000",
      "https://cdn2.example.org/media/1080p.m3u8",
      "",
    ].join("\n");

    const rewritten = rewriteHlsManifest(text, { baseUrl, depth: 0, rewriteUri });
    expect(rewritten).toContain("proxy:1:https://cdn.example.org/hls/media/720p.m3u8");
    expect(rewritten).toContain("proxy:1:https://cdn2.example.org/media/1080p.m3u8");
    expect(rewritten.split("\n")).not.toContain("media/720p.m3u8");
    expect(rewritten).toContain("#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=720x404");
  });

  it("reescribe segmentos y atributos URI de una playlist de medios", () => {
    const text = [
      "#EXTM3U",
      "#EXT-X-VERSION:7",
      '#EXT-X-MAP:URI="init.mp4"',
      '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"',
      "#EXTINF:6.006,",
      "seg-1.ts",
      "#EXTINF:6.006,",
      "https://cdn2.example.org/media/seg-2.ts",
      "#EXT-X-ENDLIST",
    ].join("\n");

    const rewritten = rewriteHlsManifest(text, { baseUrl, depth: 1, rewriteUri });
    expect(rewritten).toContain('URI="proxy:2:https://cdn.example.org/hls/init.mp4"');
    expect(rewritten).toContain('URI="proxy:2:https://cdn.example.org/hls/key.bin"');
    expect(rewritten).toContain("proxy:2:https://cdn.example.org/hls/seg-1.ts");
    expect(rewritten).toContain("proxy:2:https://cdn2.example.org/media/seg-2.ts");
    expect(rewritten).toContain("#EXT-X-VERSION:7");
    expect(rewritten).toContain("#EXT-X-ENDLIST");
  });

  it("rechaza manifiestos con URIs no HTTPS", () => {
    const text = "#EXTM3U\n#EXTINF:6,\nhttp://insegura.example/seg.ts\n";
    expect(() => rewriteHlsManifest(text, { baseUrl, depth: 0, rewriteUri })).toThrow(
      expect.objectContaining({ code: "PLAYLIST_INSECURE_ONLY", status: 503 }),
    );
  });
});
