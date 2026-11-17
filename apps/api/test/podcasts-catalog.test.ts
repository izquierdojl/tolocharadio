import { afterEach, describe, expect, it, vi } from "vitest";
import { computeFeedBackoffMs } from "../src/services/podcasts/refreshScheduler.js";
import { request, setupServer } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE_FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Historias del Bosque</title>
    <link>https://bosque.example.org</link>
    <description>Podcast sobre naturaleza y rutas</description>
    <itunes:author>Guardabosques</itunes:author>
    <itunes:image href="https://bosque.example.org/cover.jpg" />
    <itunes:category text="Nature" />
    <item>
      <title>Ruta 1: El Pinar</title>
      <guid>ep-1</guid>
      <pubDate>Mon, 19 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://bosque.example.org/ep1.mp3" type="audio/mpeg" />
      <itunes:duration>1200</itunes:duration>
    </item>
    <item>
      <title>Ruta 2: La Cumbre</title>
      <guid>ep-2</guid>
      <pubDate>Tue, 20 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://bosque.example.org/ep2.mp3" type="audio/mpeg" />
      <itunes:duration>1800</itunes:duration>
    </item>
  </channel>
</rss>`;

async function registerAndLogin(app: Parameters<typeof request>[0], email = "user@example.com") {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Password123!", name: "Test" })
    .expect(201);
  return res.body.accessToken as string;
}

describe("Podcasts catalog, subscriptions, discovery, OPML y scheduler", () => {
  it("bloquea con 403 PODCASTS_DISABLED cuando PODCASTS_ENABLED=false", async () => {
    const srv = setupServer({ PODCASTS_ENABLED: "false" });
    try {
      const token = await registerAndLogin(srv.app);
      const res = await request(srv.app)
        .get("/api/v1/podcasts/subscriptions")
        .set("Authorization", `Bearer ${token}`)
        .expect(403);
      expect(res.body.error.code).toBe("PODCASTS_DISABLED");
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("resuelve un feed, permite suscribirse a dos usuarios sin duplicar catalogo, pagina episodios y exporta OPML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(SAMPLE_FEED_XML, { status: 200 })),
    );

    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const tokenA = await registerAndLogin(srv.app, "a@example.com");
      const tokenB = await registerAndLogin(srv.app, "b@example.com");

      // Resolver feed
      const resolved = await request(srv.app)
        .post("/api/v1/podcasts/resolve")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ feedUrl: "https://bosque.example.org/feed.xml" })
        .expect(200);

      expect(resolved.body.podcast.title).toBe("Historias del Bosque");
      expect(resolved.body.podcast.isSubscribed).toBe(false);
      expect(resolved.body.episodes.items).toHaveLength(2);
      const podcastId = resolved.body.podcast.id as number;

      // Usuario A se suscribe por feedUrl; Usuario B se suscribe al mismo feedUrl
      const subA = await request(srv.app)
        .post("/api/v1/podcasts/subscriptions")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ feedUrl: "https://bosque.example.org/feed.xml" })
        .expect(201);
      expect(subA.body.podcast.id).toBe(podcastId);
      expect(subA.body.podcast.isSubscribed).toBe(true);

      const subB = await request(srv.app)
        .post("/api/v1/podcasts/subscriptions")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ feedUrl: "https://bosque.example.org/feed.xml" })
        .expect(201);
      expect(subB.body.podcast.id).toBe(podcastId);

      // Listado paginado y ordenado de episodios
      const epPage = await request(srv.app)
        .get(`/api/v1/podcasts/${podcastId}/episodes?sort=duration&offset=0&limit=1`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
      expect(epPage.body.items).toHaveLength(1);
      expect(epPage.body.items[0].title).toBe("Ruta 2: La Cumbre");
      expect(epPage.body.items[0].audioUrl).toBeUndefined();
      expect(epPage.body.pagination).toEqual({ offset: 0, limit: 1, hasMore: true });

      // Exportar OPML
      const opml = await request(srv.app)
        .get("/api/v1/podcasts/subscriptions/opml")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
      expect(opml.text).toContain("<opml version=\"2.0\">");
      expect(opml.text).toContain("https://bosque.example.org/feed.xml");

      // Importar OPML en lote (bulk)
      const bulk = await request(srv.app)
        .post("/api/v1/podcasts/subscriptions/bulk")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          feedUrls: ["https://bosque.example.org/feed.xml", "javascript:bad"],
        })
        .expect(200);
      expect(bulk.body.skipped).toBe(1);
      expect(bulk.body.failed).toBe(1);

      // Cancelar suscripcion
      await request(srv.app)
        .delete(`/api/v1/podcasts/subscriptions/${podcastId}`)
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);

      const listAfter = await request(srv.app)
        .get("/api/v1/podcasts/subscriptions")
        .set("Authorization", `Bearer ${tokenA}`)
        .expect(200);
      expect(listAfter.body.items).toHaveLength(0);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("filtra episodios por titulo con q sin distinguir mayusculas ni acentos, componiendo con filter y hasMore", async () => {
    const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Radio Sierra</title>
    <item>
      <title>El camión fantasma</title>
      <guid>camion-1</guid>
      <pubDate>Mon, 19 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://sierra.example.org/camion1.mp3" type="audio/mpeg" />
    </item>
    <item>
      <title>Historia del ferrocarril</title>
      <guid>ferrocarril</guid>
      <pubDate>Tue, 20 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://sierra.example.org/tren.mp3" type="audio/mpeg" />
    </item>
    <item>
      <title>Camión de radio</title>
      <guid>camion-3</guid>
      <pubDate>Wed, 21 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://sierra.example.org/camion3.mp3" type="audio/mpeg" />
    </item>
  </channel>
</rss>`;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(FEED_XML, { status: 200 })));

    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await registerAndLogin(srv.app);
      const resolved = await request(srv.app)
        .post("/api/v1/podcasts/resolve")
        .set("Authorization", `Bearer ${token}`)
        .send({ feedUrl: "https://sierra.example.org/feed.xml" })
        .expect(200);
      const podcastId = resolved.body.podcast.id as number;

      // Solo los titulos que contienen «camion» (con o sin acento), por recencia
      const byTitle = await request(srv.app)
        .get(`/api/v1/podcasts/${podcastId}/episodes?q=camion`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(byTitle.body.items.map((i: { title: string }) => i.title)).toEqual([
        "Camión de radio",
        "El camión fantasma",
      ]);
      expect(byTitle.body.items[0].audioUrl).toBeUndefined();

      // hasMore refleja el conjunto filtrado
      const paged = await request(srv.app)
        .get(`/api/v1/podcasts/${podcastId}/episodes?q=camion&limit=1`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(paged.body.items).toHaveLength(1);
      expect(paged.body.pagination).toEqual({ offset: 0, limit: 1, hasMore: true });

      // Sin coincidencias
      const none = await request(srv.app)
        .get(`/api/v1/podcasts/${podcastId}/episodes?q=inexistente`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(none.body.items).toHaveLength(0);
      expect(none.body.pagination.hasMore).toBe(false);

      // q se compone con el filtro de estado
      const camionFantasmaId = byTitle.body.items[1].id as number;
      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${camionFantasmaId}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          sessionId: "s1",
          sequence: 0,
          positionSec: 60,
          listenedMs: 60_000,
          completed: true,
        })
        .expect(200);

      const unplayed = await request(srv.app)
        .get(`/api/v1/podcasts/${podcastId}/episodes?q=camion&filter=unplayed`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(unplayed.body.items.map((i: { title: string }) => i.title)).toEqual([
        "Camión de radio",
      ]);

      const completed = await request(srv.app)
        .get(`/api/v1/podcasts/${podcastId}/episodes?q=camion&filter=completed`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(completed.body.items.map((i: { title: string }) => i.title)).toEqual([
        "El camión fantasma",
      ]);

      // Sin q el comportamiento no cambia
      const all = await request(srv.app)
        .get(`/api/v1/podcasts/${podcastId}/episodes`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(all.body.items).toHaveLength(3);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("busca en iTunes con cache y respeta PODCAST_DISCOVERY_PROVIDER=none", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          results: [
            {
              collectionName: "Sierra Cast",
              artistName: "Tolocha",
              feedUrl: "https://sierra.example.org/rss.xml",
              artworkUrl600: "https://sierra.example.org/art.jpg",
              genres: ["Podcasts", "History"],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const srv = setupServer({
      PODCASTS_ENABLED: "true",
      PODCAST_DISCOVERY_PROVIDER: "itunes",
    });
    try {
      const token = await registerAndLogin(srv.app);
      const r1 = await request(srv.app)
        .get("/api/v1/podcasts/search?q=sierra")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(r1.body.items).toHaveLength(1);
      expect(r1.body.items[0]).toMatchObject({
        title: "Sierra Cast",
        feedUrl: "https://sierra.example.org/rss.xml",
        categories: ["History"],
      });

      // Segunda llamada sale de cache
      await request(srv.app)
        .get("/api/v1/podcasts/search?q=sierra")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      srv.db.sqlite.close();
    }

    const srvNone = setupServer({
      PODCASTS_ENABLED: "true",
      PODCAST_DISCOVERY_PROVIDER: "none",
    });
    try {
      const token = await registerAndLogin(srvNone.app);
      const res = await request(srvNone.app)
        .get("/api/v1/podcasts/search?q=sierra")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      expect(res.body.error.code).toBe("DISCOVERY_DISABLED");
    } finally {
      srvNone.db.sqlite.close();
    }
  });

  it("calcula backoff exponencial y ejecuta refresh con single-flight", async () => {
    expect(computeFeedBackoffMs(0, 900_000)).toBe(900_000);
    expect(computeFeedBackoffMs(1, 900_000)).toBe(900_000);
    expect(computeFeedBackoffMs(2, 900_000)).toBe(3_600_000);
    expect(computeFeedBackoffMs(3, 900_000)).toBe(21_600_000);
    expect(computeFeedBackoffMs(4, 900_000)).toBe(86_400_000);

    let fetchCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        fetchCalls += 1;
        await new Promise((r) => setTimeout(r, 20));
        return new Response(SAMPLE_FEED_XML, { status: 200 });
      }),
    );

    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const row = await srv.ctx.podcastCatalog.resolveAndIngestFeed(
        "https://bosque.example.org/feed.xml",
      );
      fetchCalls = 0;
      await Promise.all([
        srv.ctx.podcastRefresh.refreshPodcast(row.id),
        srv.ctx.podcastRefresh.refreshPodcast(row.id),
      ]);
      expect(fetchCalls).toBe(1);
    } finally {
      srv.db.sqlite.close();
    }
  });
});
