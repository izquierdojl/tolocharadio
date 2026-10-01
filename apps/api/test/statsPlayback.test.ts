import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSubresourceUrl } from "../src/lib/hls.js";
import { RAW_STATION } from "./fixtures.js";
import { request, setupServer, TEST_ACCESS_SECRET, type TestServer } from "./helpers.js";

let server: TestServer;

const AUDIO_BYTES = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x12, 0x34]);
const HLS_UUID = "33333333-4444-5555-6666-777777777777";
const SEGMENT_URL = "https://cdn.example.org/hls/seg-1.ts";

type FetchRoute = (
  url: URL,
  init?: RequestInit,
) => Response | undefined | Promise<Response | undefined>;

function stubStation(station: Record<string, unknown>, routes: FetchRoute[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/stations/byuuid/")) return Response.json([station]);
      for (const route of routes) {
        const response = await route(url, init);
        if (response) return response;
      }
      throw new Error(`fetch sin stub para ${url.toString()}`);
    }),
  );
}

function delayedAudioResponse(delayMs: number) {
  return new Response(
    new ReadableStream({
      async start(controller) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        controller.enqueue(AUDIO_BYTES);
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "audio/mpeg" } },
  );
}

function immediateAudioResponse() {
  return new Response(AUDIO_BYTES, {
    status: 200,
    headers: { "content-type": "audio/mpeg" },
  });
}

function hlsStation(overrides: Record<string, unknown> = {}) {
  return {
    ...RAW_STATION,
    stationuuid: HLS_UUID,
    name: "Radio HLS",
    url: "https://cdn.example.org/hls/master.m3u8",
    url_resolved: "https://cdn.example.org/hls/master.m3u8",
    codec: null,
    ...overrides,
  };
}

async function registerUser(email = "statsplay@example.com") {
  const res = await request(server.app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Password1" })
    .expect(201);
  return res.body.accessToken as string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  server = setupServer();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("captura de estadisticas en playback", () => {
  it("captura una escucha directa y la refleja en recent y top", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname.includes("/stations/byuuid/")) return Response.json([RAW_STATION]);
        if (url.pathname === "/live.mp3") return delayedAudioResponse(30);
        throw new Error(`fetch sin stub para ${url.toString()}`);
      }),
    );
    const token = await registerUser();

    await request(server.app)
      .get(`/api/v1/playback/${RAW_STATION.stationuuid}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await sleep(30);

    const recent = await request(server.app)
      .get("/api/v1/stats/me/recent")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(recent.body.items).toHaveLength(1);
    expect(recent.body.items[0].station.id).toBe(RAW_STATION.stationuuid);
    expect(recent.body.items[0].durationMs).toBeGreaterThan(0);

    const top = await request(server.app)
      .get("/api/v1/stats/me/top")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(top.body.items).toHaveLength(1);
    expect(top.body.items[0].station.id).toBe(RAW_STATION.stationuuid);
    expect(top.body.items[0].totalMs).toBeGreaterThan(0);
  });

  it("el precheck de disponibilidad no genera escucha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname.includes("/stations/byuuid/")) return Response.json([RAW_STATION]);
        return immediateAudioResponse();
      }),
    );
    const token = await registerUser();

    await request(server.app)
      .get(`/api/v1/playback/${RAW_STATION.stationuuid}/status`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await sleep(30);

    const recent = await request(server.app)
      .get("/api/v1/stats/me/recent")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(recent.body.items).toEqual([]);
  });

  it("acumula la escucha HLS a partir de los pulsos de segmentos", async () => {
    server = setupServer({ STATS_HLS_IDLE_MS: "10" });
    stubStation(hlsStation(), [
      (url) => (url.href === SEGMENT_URL ? immediateAudioResponse() : undefined),
    ]);
    const token = await registerUser();
    const segmentPath = buildSubresourceUrl(TEST_ACCESS_SECRET, HLS_UUID, "/api/v1", SEGMENT_URL, 2);

    await request(server.app)
      .get(segmentPath)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await sleep(50);
    await request(server.app)
      .get(segmentPath)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await sleep(30);
    server.ctx.stats.flush();

    const recent = await request(server.app)
      .get("/api/v1/stats/me/recent")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(recent.body.items).toHaveLength(1);
    expect(recent.body.items[0].station.id).toBe(HLS_UUID);
    expect(recent.body.items[0].durationMs).toBeGreaterThanOrEqual(40);

    const top = await request(server.app)
      .get("/api/v1/stats/me/top")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(top.body.items[0].station.id).toBe(HLS_UUID);
  });
});
