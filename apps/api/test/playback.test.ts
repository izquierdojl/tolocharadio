import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RAW_STATION } from "./fixtures.js";
import type { TestServer } from "./helpers.js";
import { request, setupServer } from "./helpers.js";

let server: TestServer;

const AUDIO_BYTES = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x12, 0x34]);

function stubPlaybackStream(stream: ReadableStream, headers: Record<string, string>, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, _init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/stations/byuuid/")) {
        const uuid = url.pathname.split("/").pop()!;
        return Response.json(uuid === RAW_STATION.stationuuid ? [RAW_STATION] : []);
      }
      if (!ok) {
        return new Response("upstream error", { status: 503 });
      }
      return new Response(stream, { status: 200, headers });
    }),
  );
}

async function registerUser() {
  const res = await request(server.app)
    .post("/api/v1/auth/register")
    .send({ email: "play@example.com", password: "Password1" })
    .expect(201);
  return res.body.accessToken as string;
}

beforeEach(() => {
  server = setupServer();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("playback proxy", () => {
  it("requiere autenticacion", async () => {
    await request(server.app).get(`/api/v1/playback/${RAW_STATION.stationuuid}`).expect(401);
    await request(server.app).get(`/api/v1/playback/${RAW_STATION.stationuuid}/status`).expect(401);
  });

  it("hace proxy del stream y propaga cabeceras", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(AUDIO_BYTES);
        controller.close();
      },
    });
    stubPlaybackStream(stream, { "content-type": "audio/mpeg" });
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${RAW_STATION.stationuuid}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("content-type", /audio\/mpeg/);
    const body = res.body as unknown;
    if (Buffer.isBuffer(body)) {
      expect(Buffer.from(body).length).toBe(AUDIO_BYTES.length);
    }
  });

  it("registra la reproduccion en el historial", async () => {
    const stream = new ReadableStream({ start(c) { c.enqueue(AUDIO_BYTES); c.close(); } });
    stubPlaybackStream(stream, { "content-type": "audio/mpeg" });
    const token = await registerUser();
    await request(server.app)
      .get(`/api/v1/playback/${RAW_STATION.stationuuid}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await new Promise((r) => setTimeout(r, 20));
    const history = await request(server.app).get("/api/v1/history").set("Authorization", `Bearer ${token}`).expect(200);
    expect(history.body.items).toHaveLength(1);
    expect(history.body.items[0].station.id).toBe(RAW_STATION.stationuuid);
  });

  it("devuelve 503 si el origen no esta disponible", async () => {
    stubPlaybackStream(new ReadableStream(), {}, false);
    const token = await registerUser();
    const res = await request(server.app)
      .get(`/api/v1/playback/${RAW_STATION.stationuuid}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(503);
    expect(res.body.error.code).toBe("STREAM_UNAVAILABLE");
  });

  it("devuelve 404 si la emisora no existe", async () => {
    stubPlaybackStream(new ReadableStream({ start(c) { c.close(); } }), {});
    const token = await registerUser();
    await request(server.app).get("/api/v1/playback/unknown").set("Authorization", `Bearer ${token}`).expect(404);
  });
});

describe("playback status", () => {
  it("reporta una emisora como reproducible", async () => {
    const stream = new ReadableStream({ start(c) { c.enqueue(AUDIO_BYTES); c.close(); } });
    stubPlaybackStream(stream, { appname: "x" });
    const token = await registerUser();
    const res = await request(server.app)
      .get(`/api/v1/playback/${RAW_STATION.stationuuid}/status`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({ id: RAW_STATION.stationuuid, playable: true });
  });

  it("reporta como no reproducible si el origen falla", async () => {
    stubPlaybackStream(new ReadableStream(), {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname.includes("/stations/byuuid/")) return Response.json([RAW_STATION]);
        throw new Error("origen caido");
      }),
    );
    const token = await registerUser();
    const res = await request(server.app)
      .get(`/api/v1/playback/${RAW_STATION.stationuuid}/status`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({ playable: false, reason: "STREAM_UNREACHABLE" });
  });
});