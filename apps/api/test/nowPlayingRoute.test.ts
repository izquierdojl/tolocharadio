import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NowPlayingService } from "../src/services/nowPlaying.js";
import { RAW_STATION } from "./fixtures.js";
import type { TestServer } from "./helpers.js";
import { request, setupServer } from "./helpers.js";

let server: TestServer;

function padded(text: string): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  const out = new Uint8Array(Math.ceil(bytes.length / 16) * 16);
  out.set(bytes);
  return out;
}

function icyResponse(title: string | null, metaint = 16): Response {
  const meta = title === null ? new Uint8Array(0) : padded(`StreamTitle='${title}';`);
  const body = new Uint8Array(metaint + 1 + meta.length);
  body[metaint] = meta.length / 16;
  body.set(meta, metaint + 1);
  return new Response(body, {
    status: 200,
    headers: { "content-type": "audio/mpeg", "icy-metaint": String(metaint) },
  });
}

type OriginHandler = (url: URL, init?: RequestInit) => Response;

function stubOrigin(handler: OriginHandler) {
  const fn = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname.includes("/stations/byuuid/")) {
      const uuid = url.pathname.split("/").pop()!;
      return Response.json(uuid === RAW_STATION.stationuuid ? [RAW_STATION] : []);
    }
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

async function registerUser() {
  const res = await request(server.app)
    .post("/api/v1/auth/register")
    .send({ email: "nowplaying@example.com", password: "Password1" })
    .expect(201);
  return res.body.accessToken as string;
}

const path = `/api/v1/playback/${RAW_STATION.stationuuid}/now-playing`;

beforeEach(() => {
  server = setupServer();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /playback/:stationId/now-playing", () => {
  it("exige autenticación", async () => {
    await request(server.app).get(path).expect(401);
  });

  it("responde 404 para una emisora desconocida", async () => {
    stubOrigin(() => icyResponse("x - y"));
    const token = await registerUser();
    await request(server.app)
      .get("/api/v1/playback/unknown/now-playing")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("devuelve el título actual y no reenvía el Bearer al origen", async () => {
    const fetchMock = stubOrigin(() => icyResponse("Maná - Clavado en un bar"));
    const token = await registerUser();
    const res = await request(server.app).get(path).set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ id: RAW_STATION.stationuuid, title: "Maná - Clavado en un bar" });

    const originCall = fetchMock.mock.calls.find(([input]) => String(input).includes("live.mp3"));
    expect(originCall).toBeDefined();
    const headers = (originCall![1]?.headers ?? {}) as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain("authorization");
    expect(JSON.stringify(headers)).not.toContain(token);
  });

  it("devuelve title null si no hay metadatos o el origen falla", async () => {
    stubOrigin(() => icyResponse(null));
    const token = await registerUser();
    const res = await request(server.app).get(path).set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body).toEqual({ id: RAW_STATION.stationuuid, title: null });

    // Servicio nuevo para no reutilizar la caché de la consulta anterior.
    server.ctx.nowPlaying = new NowPlayingService({ userAgent: "x" });
    stubOrigin(() => {
      throw new Error("origen caído");
    });
    const failed = await request(server.app).get(path).set("Authorization", `Bearer ${token}`).expect(200);
    expect(failed.body).toEqual({ id: RAW_STATION.stationuuid, title: null });
  });

  it("no registra historial ni estadísticas", async () => {
    stubOrigin(() => icyResponse("Uno - Dos"));
    const token = await registerUser();
    await request(server.app).get(path).set("Authorization", `Bearer ${token}`).expect(200);
    await new Promise((r) => setTimeout(r, 30));
    server.ctx.stats.flush();

    const history = await request(server.app)
      .get("/api/v1/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(history.body.items).toEqual([]);

    const recent = await request(server.app)
      .get("/api/v1/stats/me/recent")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(recent.body.items).toEqual([]);
  });
});

describe("GET /playback/:stationId/now-playing (HLS)", () => {
  const HLS_UUID = "33333333-4444-5555-6666-777777777777";
  const hlsStation = {
    ...RAW_STATION,
    stationuuid: HLS_UUID,
    name: "Cadena100",
    url: "https://cdn.example.org/live/playlist.m3u8",
    url_resolved: "https://cdn.example.org/live/playlist.m3u8",
    codec: "AAC",
  };

  function id3Segment(title: string): Uint8Array {
    const data = [3, ...Buffer.from(title, "utf8")];
    const frame = [...Buffer.from("TIT2"), 0, 0, 0, data.length, 0, 0, ...data];
    return Uint8Array.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, frame.length, ...frame, 0xff, 0xf1]);
  }

  it("devuelve el título ID3 del último segmento y no registra historial", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname.includes("/stations/byuuid/")) return Response.json([hlsStation]);
        if (url.pathname.endsWith("playlist.m3u8")) {
          return new Response("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=64000\nchunks.m3u8\n");
        }
        if (url.pathname.endsWith("chunks.m3u8")) {
          return new Response("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6.0,\nseg_1.aac\n#EXTINF:6.0,\nseg_2.aac\n");
        }
        if (url.pathname.endsWith("seg_2.aac")) {
          return new Response(id3Segment("Teddy Swims - Mr. know it all"), { status: 206 });
        }
        throw new Error(`fetch sin stub para ${url.toString()}`);
      }),
    );
    const token = await registerUser();
    const res = await request(server.app)
      .get(`/api/v1/playback/${HLS_UUID}/now-playing`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual({ id: HLS_UUID, title: "Teddy Swims - Mr. know it all" });

    const history = await request(server.app)
      .get("/api/v1/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(history.body.items).toEqual([]);
  });
});
