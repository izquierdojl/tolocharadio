import { afterEach, describe, expect, it, vi } from "vitest";
import { request, setupServer } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

async function registerAndLogin(app: Parameters<typeof request>[0]) {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email: "user@example.com", password: "Password123!", name: "Test" })
    .expect(201);
  return res.body.accessToken as string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const NEW_FEED_URL = "https://rss.marketingtools.apple.com/api/v2/es/podcasts/top/";

/** Simula Apple: ranking nuevo, feed antiguo por categoria y lookup. */
function appleMock(opts: { legacyFails?: boolean; newFails?: boolean } = {}) {
  return vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.startsWith("https://rss.marketingtools.apple.com/")) {
      if (opts.newFails) return json({}, 502);
      return json({
        feed: {
          results: [
            { id: "30", name: "Tercero" },
            { id: "10", name: "Primero" },
            { id: "20", name: "Sin feed" },
            { id: "10", name: "Duplicado" },
          ],
        },
      });
    }
    if (url.startsWith("https://itunes.apple.com/es/rss/toppodcasts/")) {
      if (opts.legacyFails) return json({}, 500);
      return json({
        feed: { entry: [{ id: { attributes: { "im:id": "10" } } }] },
      });
    }
    if (url.startsWith("https://itunes.apple.com/lookup")) {
      return json({
        results: [
          {
            collectionId: 10,
            collectionName: "Primero",
            artistName: "Autor 1",
            feedUrl: "https://uno.example.org/rss.xml",
            artworkUrl600: "https://uno.example.org/a.jpg",
            genres: ["Podcasts", "Comedia"],
          },
          { collectionId: 20, collectionName: "Sin feed" },
          {
            collectionId: 30,
            collectionName: "Tercero",
            feedUrl: "https://tres.example.org/rss.xml",
            genres: ["Deportes"],
          },
        ],
      });
    }
    return json({}, 404);
  });
}

async function withServer(
  env: Record<string, string>,
  fn: (srv: ReturnType<typeof setupServer>, token: string) => Promise<void>,
) {
  const srv = setupServer({ PODCASTS_ENABLED: "true", ...env });
  try {
    await fn(srv, await registerAndLogin(srv.app));
  } finally {
    srv.db.sqlite.close();
  }
}

describe("GET /podcasts/top", () => {
  it("devuelve el ranking de Espana por defecto, en orden, con feedUrl y sin omitidos", async () => {
    const fetchMock = appleMock();
    vi.stubGlobal("fetch", fetchMock);
    await withServer({ PODCAST_DISCOVERY_PROVIDER: "itunes" }, async (srv, token) => {
      const res = await request(srv.app)
        .get("/api/v1/podcasts/top")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.items.map((i: { title: string }) => i.title)).toEqual(["Tercero", "Primero"]);
      expect(res.body.items[1]).toMatchObject({
        feedUrl: "https://uno.example.org/rss.xml",
        categories: ["Comedia"],
      });
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls[0]).toContain(`${NEW_FEED_URL}50/podcasts.json`);
    });
  });

  it("respeta limit y el pais indicado", async () => {
    const fetchMock = appleMock();
    vi.stubGlobal("fetch", fetchMock);
    await withServer({ PODCAST_DISCOVERY_PROVIDER: "itunes" }, async (srv, token) => {
      const res = await request(srv.app)
        .get("/api/v1/podcasts/top?country=ES&limit=1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(String(fetchMock.mock.calls[0]![0])).toContain(`${NEW_FEED_URL}25/podcasts.json`);
      const lookup = new URL(String(fetchMock.mock.calls[1]![0]));
      expect(lookup.searchParams.get("id")).toBe("30");
    });
  });

  it("usa el feed antiguo cuando se filtra por categoria", async () => {
    const fetchMock = appleMock();
    vi.stubGlobal("fetch", fetchMock);
    await withServer({ PODCAST_DISCOVERY_PROVIDER: "itunes" }, async (srv, token) => {
      const res = await request(srv.app)
        .get("/api/v1/podcasts/top?country=es&genre=1303")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.items.map((i: { title: string }) => i.title)).toEqual(["Primero"]);
      expect(String(fetchMock.mock.calls[0]![0])).toContain("genre=1303");
    });
  });

  it("rechaza pais, categoria y sin sesion sin consultar a Apple", async () => {
    const fetchMock = appleMock();
    vi.stubGlobal("fetch", fetchMock);
    await withServer({ PODCAST_DISCOVERY_PROVIDER: "itunes" }, async (srv, token) => {
      await request(srv.app)
        .get("/api/v1/podcasts/top?country=xyz")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      await request(srv.app)
        .get("/api/v1/podcasts/top?genre=../x")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      await request(srv.app).get("/api/v1/podcasts/top").expect(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("sirve la segunda peticion desde cache", async () => {
    const fetchMock = appleMock();
    vi.stubGlobal("fetch", fetchMock);
    await withServer({ PODCAST_DISCOVERY_PROVIDER: "itunes" }, async (srv, token) => {
      await request(srv.app).get("/api/v1/podcasts/top").set("Authorization", `Bearer ${token}`).expect(200);
      const calls = fetchMock.mock.calls.length;
      await request(srv.app).get("/api/v1/podcasts/top").set("Authorization", `Bearer ${token}`).expect(200);
      expect(fetchMock.mock.calls.length).toBe(calls);
    });
  });

  it("falla de forma aislada: la categoria caida no rompe el top general", async () => {
    vi.stubGlobal("fetch", appleMock({ legacyFails: true }));
    await withServer({ PODCAST_DISCOVERY_PROVIDER: "itunes" }, async (srv, token) => {
      const res = await request(srv.app)
        .get("/api/v1/podcasts/top?genre=1303")
        .set("Authorization", `Bearer ${token}`)
        .expect(503);
      expect(res.body.error.code).toBe("DISCOVERY_UNAVAILABLE");
      await request(srv.app).get("/api/v1/podcasts/top").set("Authorization", `Bearer ${token}`).expect(200);
    });
  });

  it("responde DISCOVERY_UNAVAILABLE si Apple devuelve error", async () => {
    vi.stubGlobal("fetch", appleMock({ newFails: true }));
    await withServer({ PODCAST_DISCOVERY_PROVIDER: "itunes" }, async (srv, token) => {
      const res = await request(srv.app)
        .get("/api/v1/podcasts/top")
        .set("Authorization", `Bearer ${token}`)
        .expect(503);
      expect(res.body.error.code).toBe("DISCOVERY_UNAVAILABLE");
    });
  });

  it("responde DISCOVERY_DISABLED con none y DISCOVERY_UNSUPPORTED con podcastindex", async () => {
    const fetchMock = appleMock();
    vi.stubGlobal("fetch", fetchMock);
    await withServer({ PODCAST_DISCOVERY_PROVIDER: "none" }, async (srv, token) => {
      const res = await request(srv.app).get("/api/v1/podcasts/top").set("Authorization", `Bearer ${token}`).expect(400);
      expect(res.body.error.code).toBe("DISCOVERY_DISABLED");
    });
    await withServer({ PODCAST_DISCOVERY_PROVIDER: "podcastindex" }, async (srv, token) => {
      const res = await request(srv.app).get("/api/v1/podcasts/top").set("Authorization", `Bearer ${token}`).expect(400);
      expect(res.body.error.code).toBe("DISCOVERY_UNSUPPORTED");
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve 403 PODCASTS_DISABLED con los podcasts deshabilitados", async () => {
    await withServer({ PODCASTS_ENABLED: "false" }, async (srv, token) => {
      const res = await request(srv.app).get("/api/v1/podcasts/top").set("Authorization", `Bearer ${token}`).expect(403);
      expect(res.body.error.code).toBe("PODCASTS_DISABLED");
    });
  });
});
