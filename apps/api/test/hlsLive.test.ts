import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RAW_STATION } from "./fixtures.js";
import type { TestServer } from "./helpers.js";
import { request, setupServer } from "./helpers.js";

let server: TestServer;

const HLS_ID = "99999999-8888-7777-6666-555555555555";
const HLS_URL = "https://cdn.example.org/hls/master.m3u8";
const STATION = {
  ...RAW_STATION,
  stationuuid: HLS_ID,
  name: "Radio HLS",
  url: HLS_URL,
  url_resolved: HLS_URL,
  codec: null,
};

type FetchRoute = (
  url: URL,
  init?: RequestInit,
) => Response | undefined | Promise<Response | undefined>;

function stubFetch(routes: FetchRoute[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/stations/byuuid/")) return Response.json([STATION]);
      for (const route of routes) {
        const response = await route(url, init);
        if (response) return response;
      }
      throw new Error(`fetch sin stub para ${url.toString()}`);
    }),
  );
}

function playlistResponse(text: string) {
  return new Response(text, {
    status: 200,
    headers: { "content-type": "application/vnd.apple.mpegurl" },
  });
}

function segmentResponse(marker: number) {
  const data = new Uint8Array(64).fill(0);
  data[0] = 0xff;
  data[1] = 0xf1;
  data[2] = marker;
  return new Response(data, { status: 200, headers: { "content-type": "audio/aacp" } });
}

const MASTER = [
  "#EXTM3U",
  "#EXT-X-VERSION:3",
  '#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2"',
  "variant.m3u8",
].join("\n");

function mediaPlaylist(options: {
  pdt: string;
  segments: Array<{ uri: string; duration: number }>;
  endList?: boolean;
}) {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-TARGETDURATION:1", "#EXT-X-MEDIA-SEQUENCE:1"];
  lines.push(`#EXT-X-PROGRAM-DATE-TIME:${options.pdt}`);
  for (const segment of options.segments) {
    lines.push(`#EXTINF:${segment.duration},`, segment.uri);
  }
  if (options.endList) lines.push("#EXT-X-ENDLIST");
  return lines.join("\n");
}

async function registerUser() {
  const res = await request(server.app)
    .post("/api/v1/auth/register")
    .send({ email: "live@example.com", password: "Password1" })
    .expect(201);
  return res.body.accessToken as string;
}

beforeEach(() => {
  server = setupServer();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("playback /live con HLS", () => {
  it("entrega los segmentos concatenados y termina con ENDLIST", async () => {
    let variantCalls = 0;
    stubFetch([
      (url) => (url.href === HLS_URL ? playlistResponse(MASTER) : undefined),
      (url) => {
        if (url.href !== "https://cdn.example.org/hls/variant.m3u8") return undefined;
        variantCalls += 1;
        if (variantCalls === 1) {
          return playlistResponse(
            mediaPlaylist({
              pdt: "2026-01-01T00:00:00.000Z",
              segments: [
                { uri: "1.aac", duration: 1 },
                { uri: "2.aac", duration: 1 },
              ],
            }),
          );
        }
        return playlistResponse(
          mediaPlaylist({
            pdt: "2026-01-01T00:00:00.000Z",
            segments: [
              { uri: "1.aac", duration: 1 },
              { uri: "2.aac", duration: 1 },
              { uri: "3.aac", duration: 1 },
            ],
            endList: true,
          }),
        );
      },
      (url) => {
        const match = /^https:\/\/cdn\.example\.org\/hls\/(\d)\.aac$/.exec(url.href);
        if (!match) return undefined;
        return segmentResponse(Number(match[1]) * 0x11);
      },
    ]);

    const token = await registerUser();
    const res = await request(server.app)
      .get(`/api/v1/playback/${HLS_ID}/live`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("content-type", /audio\/aac/);

    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["content-length"]).toBeUndefined();
    const body = Buffer.from(res.body as Buffer);
    expect(body.length).toBe(128);
    expect(body[2]).toBe(0x22);
    expect(body[66]).toBe(0x33);
  }, 15_000);

  it("resincroniza al segmento mas reciente si se acumula retraso", async () => {
    let variantCalls = 0;
    stubFetch([
      (url) => (url.href === HLS_URL ? playlistResponse(MASTER) : undefined),
      (url) => {
        if (url.href !== "https://cdn.example.org/hls/variant.m3u8") return undefined;
        variantCalls += 1;
        const segments = ["1", "2", "3", "4", "5", "6"].map((index) => ({
          uri: `${index}.aac`,
          duration: 1,
        }));
        return playlistResponse(
          mediaPlaylist({
            pdt: "2026-01-01T00:00:00.000Z",
            segments: variantCalls === 1 ? segments.slice(0, 2) : segments,
            endList: variantCalls > 2,
          }),
        );
      },
      (url) => {
        const match = /^https:\/\/cdn\.example\.org\/hls\/(\d)\.aac$/.exec(url.href);
        if (!match) return undefined;
        return segmentResponse(Number(match[1]) * 0x11);
      },
    ]);

    const token = await registerUser();
    const res = await request(server.app)
      .get(`/api/v1/playback/${HLS_ID}/live`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const body = Buffer.from(res.body as Buffer);
    expect(body.length).toBe(128);
    expect(body[2]).toBe(0x22);
    expect(body[66]).toBe(0x66);
  }, 15_000);

  it("renueva la sesion caducada y continua el flujo", async () => {
    let masterCalls = 0;
    let sessionOneCalls = 0;
    let sessionTwoCalls = 0;

    stubFetch([
      (url) => {
        if (url.href !== HLS_URL) return undefined;
        masterCalls += 1;
        const variant = masterCalls === 1 ? "s1/variant.m3u8" : "s2/variant.m3u8";
        return playlistResponse(
          ["#EXTM3U", "#EXT-X-STREAM-INF:BANDWIDTH=128000", variant].join("\n"),
        );
      },
      (url) => {
        if (url.href !== "https://cdn.example.org/hls/s1/variant.m3u8") return undefined;
        sessionOneCalls += 1;
        if (sessionOneCalls > 1) return new Response("gone", { status: 410 });
        return playlistResponse(
          mediaPlaylist({
            pdt: "2026-01-01T00:00:00.000Z",
            segments: [
              { uri: "1.aac", duration: 1 },
              { uri: "2.aac", duration: 1 },
            ],
          }),
        );
      },
      (url) => {
        if (url.href !== "https://cdn.example.org/hls/s2/variant.m3u8") return undefined;
        sessionTwoCalls += 1;
        const endList = sessionTwoCalls > 1;
        return playlistResponse(
          mediaPlaylist({
            pdt: "2026-01-01T00:00:02.000Z",
            segments: [
              { uri: "10.aac", duration: 1 },
              { uri: "11.aac", duration: 1 },
            ],
            endList,
          }),
        );
      },
      (url) => {
        const match = /\/hls\/s(\d)\/(\d+)\.aac$/.exec(url.href);
        if (!match) return undefined;
        const marker =
          match[1] === "1" ? Number(match[2]) * 0x11 : match[2] === "10" ? 0x10 : 0x11;
        return segmentResponse(marker);
      },
    ]);

    const token = await registerUser();
    const res = await request(server.app)
      .get(`/api/v1/playback/${HLS_ID}/live`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const body = Buffer.from(res.body as Buffer);
    expect(body.length).toBe(192);
    expect(body[2]).toBe(0x22);
    expect(body[66]).toBe(0x10);
    expect(body[130]).toBe(0x11);
  }, 15_000);

  it("responde 415 para segmentos fMP4", async () => {
    stubFetch([
      (url) => (url.href === HLS_URL ? playlistResponse(MASTER) : undefined),
      (url) =>
        url.href === "https://cdn.example.org/hls/variant.m3u8"
          ? playlistResponse(
              mediaPlaylist({
                pdt: "2026-01-01T00:00:00.000Z",
                segments: [{ uri: "init.mp4", duration: 1 }],
              }),
            )
          : undefined,
      (url) =>
        url.href === "https://cdn.example.org/hls/init.mp4"
          ? new Response(new Uint8Array([0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70]), {
              status: 200,
              headers: { "content-type": "audio/mp4" },
            })
          : undefined,
    ]);

    const token = await registerUser();
    const res = await request(server.app)
      .get(`/api/v1/playback/${HLS_ID}/live`)
      .set("Authorization", `Bearer ${token}`)
      .expect(415);
    expect(res.body.error.code).toBe("HLS_UNSUPPORTED_CONTAINER");
  });

  it("responde 415 si el manifiesto esta cifrado o usa EXT-X-MAP", async () => {
    let segmentCalls = 0;
    stubFetch([
      (url) => (url.href === HLS_URL ? playlistResponse(MASTER) : undefined),
      (url) =>
        url.href === "https://cdn.example.org/hls/variant.m3u8"
          ? playlistResponse(
              [
                "#EXTM3U",
                "#EXT-X-TARGETDURATION:1",
                '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"',
                "#EXTINF:1,",
                "1.aac",
              ].join("\n"),
            )
          : undefined,
      (url) => {
        if (url.pathname.endsWith(".aac")) segmentCalls += 1;
        return undefined;
      },
    ]);

    const token = await registerUser();
    const res = await request(server.app)
      .get(`/api/v1/playback/${HLS_ID}/live`)
      .set("Authorization", `Bearer ${token}`)
      .expect(415);
    expect(res.body.error.code).toBe("HLS_UNSUPPORTED_CONTAINER");
    expect(segmentCalls).toBe(0);
  });

  it("registra historial una sola vez por conexion", async () => {
    let variantCalls = 0;
    stubFetch([
      (url) => (url.href === HLS_URL ? playlistResponse(MASTER) : undefined),
      (url) => {
        if (url.href !== "https://cdn.example.org/hls/variant.m3u8") return undefined;
        variantCalls += 1;
        return playlistResponse(
          mediaPlaylist({
            pdt: "2026-01-01T00:00:00.000Z",
            segments: [{ uri: "1.aac", duration: 1 }],
            endList: variantCalls > 1,
          }),
        );
      },
      (url) =>
        url.href === "https://cdn.example.org/hls/1.aac" ? segmentResponse(0x11) : undefined,
    ]);

    const token = await registerUser();
    await request(server.app)
      .get(`/api/v1/playback/${HLS_ID}/live`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const history = await request(server.app)
      .get("/api/v1/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(history.body.items).toHaveLength(1);
    expect(history.body.items[0].station.id).toBe(HLS_ID);

    await new Promise((resolve) => setTimeout(resolve, 20));
    const recent = await request(server.app)
      .get("/api/v1/stats/me/recent")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(recent.body.items.length).toBeGreaterThan(0);
    expect(recent.body.items[0].station.id).toBe(HLS_ID);
  }, 15_000);

  it("registra el motivo de cierre del flujo", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    let variantCalls = 0;
    stubFetch([
      (url) => (url.href === HLS_URL ? playlistResponse(MASTER) : undefined),
      (url) => {
        if (url.href !== "https://cdn.example.org/hls/variant.m3u8") return undefined;
        variantCalls += 1;
        return playlistResponse(
          mediaPlaylist({
            pdt: "2026-01-01T00:00:00.000Z",
            segments: [{ uri: "1.aac", duration: 1 }],
            endList: variantCalls > 1,
          }),
        );
      },
      (url) =>
        url.href === "https://cdn.example.org/hls/1.aac" ? segmentResponse(0x11) : undefined,
    ]);

    const token = await registerUser();
    await request(server.app)
      .get(`/api/v1/playback/${HLS_ID}/live`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes("[playback] fin") && line.includes("motivo=origen"))).toBe(
      true,
    );
  }, 15_000);

  it("registra el cierre cuando el cliente corta", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    stubFetch([
      (url) => (url.href === HLS_URL ? playlistResponse(MASTER) : undefined),
      (url) => {
        if (url.href !== "https://cdn.example.org/hls/variant.m3u8") return undefined;
        return playlistResponse(
          mediaPlaylist({
            pdt: "2026-01-01T00:00:00.000Z",
            segments: [
              { uri: "1.aac", duration: 1 },
              { uri: "2.aac", duration: 1 },
              { uri: "3.aac", duration: 1 },
            ],
          }),
        );
      },
      (url) => {
        const match = /\/hls\/(\d)\.aac$/.exec(url.href);
        return match ? segmentResponse(Number(match[1]) * 0x11) : undefined;
      },
    ]);

    const token = await registerUser();
    const listener = server.app.listen(0);
    const port = (listener.address() as AddressInfo).port;

    await new Promise<void>((resolve) => {
      const req = httpRequest(
        {
          port,
          path: `/api/v1/playback/${HLS_ID}/live`,
          headers: { Authorization: `Bearer ${token}` },
        },
        (res) => {
          res.once("data", () => {
            req.destroy();
            resolve();
          });
        },
      );
      req.on("error", () => resolve());
      req.end();
    });

    await vi.waitFor(
      () => {
        const lines = log.mock.calls.map((call) => String(call[0]));
        expect(lines.some((line) => line.includes("motivo=cliente"))).toBe(true);
      },
      { timeout: 3000 },
    );

    listener.close();
  }, 15_000);
});
