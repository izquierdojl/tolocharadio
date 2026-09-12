import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSubresourceUrl, validateSubresourceRequest } from "../src/lib/hls.js";
import { RAW_STATION } from "./fixtures.js";
import type { TestServer } from "./helpers.js";
import { request, setupServer, TEST_ACCESS_SECRET } from "./helpers.js";

let server: TestServer;

const AUDIO_BYTES = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x12, 0x34]);
const LIST_UUID = "22222222-3333-4444-5555-666666666666";
const HLS_UUID = "33333333-4444-5555-6666-777777777777";

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

function audioResponse() {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(AUDIO_BYTES);
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "audio/mpeg" } },
  );
}

function listStation(overrides: Record<string, unknown> = {}) {
  return {
    ...RAW_STATION,
    stationuuid: LIST_UUID,
    name: "Radio Lista",
    url: "https://lists.example.org/radio.m3u",
    url_resolved: "https://lists.example.org/radio.m3u",
    codec: null,
    ...overrides,
  };
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

function responseText(res: { body?: unknown; text?: string }): string {
  if (typeof res.text === "string" && res.text.length > 0) return res.text;
  if (Buffer.isBuffer(res.body)) return res.body.toString("utf8");
  if (typeof res.body === "string") return res.body;
  return "";
}

function proxiedUrls(body: string): string[] {
  return [...body.matchAll(/\/api\/v1\/playback\/[^\s"]+/g)].map((match) => match[0]);
}


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

describe("playback proxy de listas de texto", () => {
  const M3U_URL = "https://lists.example.org/radio.m3u";

  it("resuelve un .m3u, sirve la primera entrada y registra historial", async () => {
    stubStation(listStation(), [
      (url) =>
        url.href === M3U_URL
          ? new Response(
              "#EXTM3U\n#EXTINF:-1,Radio Lista\nhttps://cdn.example.org/a.mp3\nhttps://cdn.example.org/b.mp3\n",
              { status: 200, headers: { "content-type": "audio/x-mpegurl" } },
            )
          : undefined,
      (url) => (url.href === "https://cdn.example.org/a.mp3" ? audioResponse() : undefined),
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("content-type", /audio\/mpeg/);
    expect(Buffer.from(res.body as Buffer).length).toBe(AUDIO_BYTES.length);

    await new Promise((r) => setTimeout(r, 20));
    const history = await request(server.app)
      .get("/api/v1/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(history.body.items).toHaveLength(1);
    expect(history.body.items[0].station.id).toBe(LIST_UUID);
  });

  it("usa el siguiente candidato si el primero falla", async () => {
    stubStation(listStation(), [
      (url) =>
        url.href === M3U_URL
          ? new Response("#EXTM3U\nhttps://cdn.example.org/caida.mp3\nhttps://cdn.example.org/ok.mp3\n", {
              status: 200,
            })
          : undefined,
      (url) =>
        url.href === "https://cdn.example.org/caida.mp3"
          ? new Response("caida", { status: 503 })
          : undefined,
      (url) => (url.href === "https://cdn.example.org/ok.mp3" ? audioResponse() : undefined),
    ]);
    const token = await registerUser();

    await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("content-type", /audio\/mpeg/);
  });

  it("resuelve relativas contra la URL final tras redirects", async () => {
    stubStation(listStation(), [
      (url) =>
        url.href === M3U_URL
          ? new Response(null, { status: 302, headers: { location: "https://cdn.example.org/dir/radio.m3u" } })
          : undefined,
      (url) =>
        url.href === "https://cdn.example.org/dir/radio.m3u"
          ? new Response("#EXTM3U\nlive.aac\n", { status: 200 })
          : undefined,
      (url) => (url.href === "https://cdn.example.org/dir/live.aac" ? audioResponse() : undefined),
    ]);
    const token = await registerUser();

    await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const calls = vi.mocked(fetch).mock.calls.map((call) => (typeof call[0] === "string" ? call[0] : ""));
    expect(calls).toContain("https://cdn.example.org/dir/live.aac");
  });

  it("no reenvia el Bearer del cliente al origen", async () => {
    stubStation(listStation(), [
      (url) => (url.href === M3U_URL ? new Response("#EXTM3U\nhttps://cdn.example.org/a.mp3\n", { status: 200 }) : undefined),
      (url) => (url.href === "https://cdn.example.org/a.mp3" ? audioResponse() : undefined),
    ]);
    const token = await registerUser();

    await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    for (const call of vi.mocked(fetch).mock.calls) {
      const headers = call[1]?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBeUndefined();
      expect(headers?.authorization).toBeUndefined();
    }
  });

  it("devuelve PLAYLIST_INSECURE_ONLY si solo hay entradas HTTP", async () => {
    stubStation(listStation(), [
      (url) => (url.href === M3U_URL ? new Response("#EXTM3U\nhttp://insegura.example/live\n", { status: 200 }) : undefined),
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(503);
    expect(res.body.error.code).toBe("PLAYLIST_INSECURE_ONLY");
    expect(res.body.error.status).toBe(503);
  });

  it("devuelve PLAYLIST_EMPTY si la lista esta vacia", async () => {
    stubStation(listStation(), [
      (url) => (url.href === M3U_URL ? new Response("#EXTM3U\n#EXTINF:-1,Sin entradas\n", { status: 200 }) : undefined),
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(503);
    expect(res.body.error.code).toBe("PLAYLIST_EMPTY");
  });

  it("devuelve PLAYLIST_MALFORMED si el texto no es una lista", async () => {
    stubStation(listStation(), [
      (url) => (url.href === M3U_URL ? new Response("<html><body>error</body></html>", { status: 200 }) : undefined),
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(503);
    expect(res.body.error.code).toBe("PLAYLIST_MALFORMED");
  });

  it("devuelve STREAM_UNAVAILABLE si ningun candidato responde", async () => {
    stubStation(listStation(), [
      (url) =>
        url.href === M3U_URL
          ? new Response("#EXTM3U\nhttps://cdn.example.org/caida.mp3\n", { status: 200 })
          : undefined,
      (url) => (url.href === "https://cdn.example.org/caida.mp3" ? new Response("no", { status: 503 }) : undefined),
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(503);
    expect(res.body.error.code).toBe("STREAM_UNAVAILABLE");
  });

  it("resuelve un .pls con Files desordenados", async () => {
    const plsUrl = "https://lists.example.org/radio.pls";
    stubStation(listStation({ url: plsUrl, url_resolved: plsUrl }), [
      (url) =>
        url.href === plsUrl
          ? new Response("[playlist]\nFile2=https://cdn.example.org/b.mp3\nFile1=https://cdn.example.org/a.mp3\n", {
              status: 200,
              headers: { "content-type": "audio/x-scpls" },
            })
          : undefined,
      (url) => (url.href === "https://cdn.example.org/a.mp3" ? audioResponse() : undefined),
    ]);
    const token = await registerUser();

    await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("content-type", /audio\/mpeg/);

    const calls = vi.mocked(fetch).mock.calls.map((call) => (typeof call[0] === "string" ? call[0] : ""));
    expect(calls).toContain("https://cdn.example.org/a.mp3");
  });
});

describe("playback proxy HLS", () => {
  const MASTER_URL = "https://cdn.example.org/hls/master.m3u8";
  const VARIANT_URL = "https://cdn.example.org/hls/media.m3u8";
  const SEGMENT_URL = "https://cdn.example.org/hls/seg-1.ts";

  function validateProxied(url: string) {
    const parsed = new URL(url, "https://api.example.org");
    return validateSubresourceRequest({
      secret: TEST_ACCESS_SECRET,
      stationId: HLS_UUID,
      rawUrl: parsed.searchParams.get("u"),
      rawDepth: parsed.searchParams.get("d"),
      signature: parsed.searchParams.get("s"),
    });
  }

  it("sirve el manifiesto reescrito con URLs firmadas y registra historial", async () => {
    stubStation(hlsStation(), [
      (url) =>
        url.href === MASTER_URL
          ? new Response("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1280000\nmedia.m3u8\n", {
              status: 200,
              headers: { "content-type": "application/vnd.apple.mpegurl" },
            })
          : undefined,
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${HLS_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect("content-type", /application\/vnd\.apple\.mpegurl/);
    expect(res.headers["cache-control"]).toBe("no-store");

    const body = responseText(res);
    const [proxied] = proxiedUrls(body);
    expect(proxied).toBeDefined();
    expect(validateProxied(proxied!)).toEqual({ url: VARIANT_URL, depth: 1 });

    await new Promise((r) => setTimeout(r, 20));
    const history = await request(server.app)
      .get("/api/v1/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(history.body.items).toHaveLength(1);
    expect(history.body.items[0].station.id).toBe(HLS_UUID);
  });

  it("reescribe una variante a segmentos mas profundos", async () => {
    stubStation(hlsStation(), [
      (url) =>
        url.href === VARIANT_URL
          ? new Response("#EXTM3U\n#EXTINF:6.006,\nseg-1.ts\n#EXT-X-ENDLIST\n", {
              status: 200,
              headers: { "content-type": "application/vnd.apple.mpegurl" },
            })
          : undefined,
    ]);
    const token = await registerUser();
    const variantPath = buildSubresourceUrl(TEST_ACCESS_SECRET, HLS_UUID, "/api/v1", VARIANT_URL, 1);

    const res = await request(server.app)
      .get(variantPath)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const body = responseText(res);
    const [proxied] = proxiedUrls(body);
    expect(proxied).toBeDefined();
    expect(validateProxied(proxied!)).toEqual({ url: SEGMENT_URL, depth: 2 });
  });

  it("retransmite segmentos propagando Range y 206", async () => {
    let sentRange: string | undefined;
    stubStation(hlsStation(), [
      (url, init) => {
        if (url.href !== SEGMENT_URL) return undefined;
        sentRange = (init?.headers as Record<string, string> | undefined)?.Range;
        return new Response(AUDIO_BYTES, {
          status: 206,
          headers: { "content-type": "audio/aac", "content-range": "bytes 0-8/9" },
        });
      },
    ]);
    const token = await registerUser();
    const segmentPath = buildSubresourceUrl(TEST_ACCESS_SECRET, HLS_UUID, "/api/v1", SEGMENT_URL, 2);

    const res = await request(server.app)
      .get(segmentPath)
      .set("Authorization", `Bearer ${token}`)
      .set("Range", "bytes=0-8")
      .expect(206);
    expect(sentRange).toBe("bytes=0-8");
    expect(res.headers["content-range"]).toBe("bytes 0-8/9");
    expect(res.headers["content-type"]).toContain("audio/aac");
  });

  it("no registra historial para subrecursos", async () => {
    stubStation(hlsStation(), [
      (url) =>
        url.href === MASTER_URL
          ? new Response("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nmedia.m3u8\n", { status: 200 })
          : undefined,
      (url) =>
        url.href === VARIANT_URL
          ? new Response("#EXTM3U\n#EXTINF:6,\nseg-1.ts\n", {
              status: 200,
              headers: { "content-type": "application/vnd.apple.mpegurl" },
            })
          : undefined,
    ]);
    const token = await registerUser();

    await request(server.app)
      .get(`/api/v1/playback/${HLS_UUID}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await new Promise((r) => setTimeout(r, 20));
    await request(server.app)
      .get(buildSubresourceUrl(TEST_ACCESS_SECRET, HLS_UUID, "/api/v1", VARIANT_URL, 1))
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    await new Promise((r) => setTimeout(r, 20));

    const history = await request(server.app)
      .get("/api/v1/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(history.body.items).toHaveLength(1);
  });

  it("rechaza firmas invalidas con 403", async () => {
    stubStation(hlsStation(), []);
    const token = await registerUser();
    const url = `/api/v1/playback/${HLS_UUID}/hls?u=${Buffer.from(VARIANT_URL).toString("base64url")}&d=1&s=deadbeef`;

    const res = await request(server.app)
      .get(url)
      .set("Authorization", `Bearer ${token}`)
      .expect(403);
    expect(res.body.error.code).toBe("HLS_INVALID_SIGNATURE");
    expect(res.body.error.status).toBe(403);
  });

  it("rechaza URLs no HTTPS con 400", async () => {
    stubStation(hlsStation(), []);
    const token = await registerUser();
    const httpPath = buildSubresourceUrl(
      TEST_ACCESS_SECRET,
      HLS_UUID,
      "/api/v1",
      "http://insegura.example/media.m3u8",
      1,
    );

    const res = await request(server.app)
      .get(httpPath)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    expect(res.body.error.code).toBe("HLS_INVALID_URL");
  });

  it("rechaza profundidades fuera de rango con 400", async () => {
    stubStation(hlsStation(), []);
    const token = await registerUser();
    const deepPath = buildSubresourceUrl(TEST_ACCESS_SECRET, HLS_UUID, "/api/v1", VARIANT_URL, 3);

    const res = await request(server.app)
      .get(deepPath)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    expect(res.body.error.code).toBe("HLS_INVALID_URL");
  });

  it("requiere autenticacion en el endpoint de subrecursos", async () => {
    await request(server.app)
      .get(`/api/v1/playback/${HLS_UUID}/hls?u=${Buffer.from(VARIANT_URL).toString("base64url")}&d=1&s=x`)
      .expect(401);
  });
});

describe("playback status de listas", () => {
  it("reporta un .m3u como reproducible si un candidato responde", async () => {
    stubStation(listStation(), [
      (url) =>
        url.href === "https://lists.example.org/radio.m3u"
          ? new Response("#EXTM3U\nhttps://cdn.example.org/a.mp3\n", { status: 200 })
          : undefined,
      (url) => (url.href === "https://cdn.example.org/a.mp3" ? audioResponse() : undefined),
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}/status`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({ id: LIST_UUID, playable: true });
  });

  it("reporta PLAYLIST_INSECURE_ONLY para un .m3u solo HTTP", async () => {
    stubStation(listStation(), [
      (url) =>
        url.href === "https://lists.example.org/radio.m3u"
          ? new Response("#EXTM3U\nhttp://insegura.example/live\n", { status: 200 })
          : undefined,
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${LIST_UUID}/status`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({
      playable: false,
      reason: "PLAYLIST_INSECURE_ONLY",
    });
  });

  it("reporta un .m3u8 accesible como reproducible", async () => {
    stubStation(hlsStation(), [
      (url) =>
        url.href === "https://cdn.example.org/hls/master.m3u8"
          ? new Response("#EXTM3U\n#EXT-X-VERSION:3\n", {
              status: 200,
              headers: { "content-type": "application/vnd.apple.mpegurl" },
            })
          : undefined,
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${HLS_UUID}/status`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({ id: HLS_UUID, playable: true });
  });

  it("reporta PLAYLIST_MALFORMED para un manifiesto invalido", async () => {
    stubStation(hlsStation(), [
      (url) =>
        url.href === "https://cdn.example.org/hls/master.m3u8"
          ? new Response("<html>error</html>", {
              status: 200,
              headers: { "content-type": "application/vnd.apple.mpegurl" },
            })
          : undefined,
    ]);
    const token = await registerUser();

    const res = await request(server.app)
      .get(`/api/v1/playback/${HLS_UUID}/status`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({ playable: false, reason: "PLAYLIST_MALFORMED" });
  });
});
