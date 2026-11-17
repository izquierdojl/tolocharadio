import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { podcastEpisodes } from "../src/db/schema.js";
import { request, setupServer } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const BOSQUE_URL = "https://bosque.example.org/feed.xml";
const SIERRA_URL = "https://sierra.example.org/feed.xml";

const BOSQUE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Historias del Bosque</title>
    <item>
      <title>El camión fantasma</title>
      <guid>camion-1</guid>
      <pubDate>Mon, 19 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://bosque.example.org/camion1.mp3" type="audio/mpeg" />
    </item>
    <item>
      <title>Ruta 2: La Cumbre</title>
      <guid>ep-2</guid>
      <pubDate>Tue, 20 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://bosque.example.org/ep2.mp3" type="audio/mpeg" />
    </item>
  </channel>
</rss>`;

const SIERRA_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Radio Sierra</title>
    <item>
      <title>Camión de radio</title>
      <guid>camion-3</guid>
      <pubDate>Wed, 21 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://sierra.example.org/camion3.mp3" type="audio/mpeg" />
    </item>
    <item>
      <title>Historia del ferrocarril</title>
      <guid>ferrocarril</guid>
      <pubDate>Sun, 18 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://sierra.example.org/tren.mp3" type="audio/mpeg" />
    </item>
  </channel>
</rss>`;

function stubFeeds(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = String(input);
      const xml = url === SIERRA_URL ? SIERRA_XML : BOSQUE_XML;
      return new Response(xml, { status: 200 });
    }),
  );
}

async function register(app: Parameters<typeof request>[0], email: string) {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Password123!", name: "Test" })
    .expect(201);
  return res.body.accessToken as string;
}

type EpisodeItem = { id: number; title: string; progress: unknown; isFavorite?: boolean; podcast: { title: string; isSubscribed: boolean; episodeCount: number } };

describe("GET /api/v1/podcasts/episodes/search", () => {
  it("exige termino de busqueda q", async () => {
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await register(srv.app, "a@example.com");
      const missing = await request(srv.app)
        .get("/api/v1/podcasts/episodes/search")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      expect(missing.body.error.code).toBe("VALIDATION_ERROR");

      const blank = await request(srv.app)
        .get("/api/v1/podcasts/episodes/search?q=%20%20")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      expect(blank.body.error.code).toBe("VALIDATION_ERROR");
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("busca episodios de todas las suscripciones del usuario sin distinguir mayusculas ni acentos", async () => {
    stubFeeds();
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const tokenA = await register(srv.app, "a@example.com");
      const tokenB = await register(srv.app, "b@example.com");
      const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

      // A se suscribe a ambos feeds; B solo al bosque
      for (const [token, feedUrl] of [
        [tokenA, BOSQUE_URL],
        [tokenA, SIERRA_URL],
        [tokenB, BOSQUE_URL],
      ] as Array<[string, string]>) {
        await request(srv.app)
          .post("/api/v1/podcasts/subscriptions")
          .set(auth(token))
          .send({ feedUrl })
          .expect(201);
      }

      const res = await request(srv.app)
        .get("/api/v1/podcasts/episodes/search?q=camion")
        .set(auth(tokenA))
        .expect(200);

      const items = res.body.items as EpisodeItem[];
      const first = items[0]!;
      const second = items[1]!;
      expect(items.map((i) => i.title)).toEqual(["Camión de radio", "El camión fantasma"]);
      expect(first.podcast.title).toBe("Radio Sierra");
      expect(first.podcast.isSubscribed).toBe(true);
      expect(first.podcast.episodeCount).toBe(2);
      expect(second.podcast.title).toBe("Historias del Bosque");
      expect(res.body.pagination).toEqual({ offset: 0, limit: 50, hasMore: false });

      // Progreso y favorito reflejados
      const fantasma = second;
      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${fantasma.id}/progress`)
        .set(auth(tokenA))
        .send({ sessionId: "s1", sequence: 0, positionSec: 30, listenedMs: 30_000 })
        .expect(200);
      await request(srv.app)
        .post("/api/v1/podcasts/favorites")
        .set(auth(tokenA))
        .send({ episodeId: fantasma.id })
        .expect(201);

      const resAgain = await request(srv.app)
        .get("/api/v1/podcasts/episodes/search?q=camion")
        .set(auth(tokenA))
        .expect(200);
      const fantasmaAgain = (resAgain.body.items as EpisodeItem[]).find(
        (i) => i.title === "El camión fantasma",
      )!;
      expect(fantasmaAgain.progress).toMatchObject({ positionSec: 30 });
      expect(fantasmaAgain.isFavorite).toBe(true);

      // Aislamiento: B solo ve episodios de su suscripcion, con su estado
      const resB = await request(srv.app)
        .get("/api/v1/podcasts/episodes/search?q=camion")
        .set(auth(tokenB))
        .expect(200);
      expect((resB.body.items as EpisodeItem[]).map((i) => i.title)).toEqual([
        "El camión fantasma",
      ]);
      const fantasmaB = (resB.body.items as EpisodeItem[])[0]!;
      expect(fantasmaB.progress).toBeNull();
      expect(fantasmaB.isFavorite).toBeFalsy();
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("pagina resultados, excluye episodios eliminados del feed y responde vacio sin coincidencias", async () => {
    stubFeeds();
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const token = await register(srv.app, "a@example.com");
      const auth = { Authorization: `Bearer ${token}` };

      const resolvedSierra = await request(srv.app)
        .post("/api/v1/podcasts/resolve")
        .set(auth)
        .send({ feedUrl: SIERRA_URL })
        .expect(200);
      const sierraEpisodes = resolvedSierra.body.episodes.items as Array<{
        id: number;
        title: string;
      }>;

      for (const feedUrl of [BOSQUE_URL, SIERRA_URL]) {
        await request(srv.app)
          .post("/api/v1/podcasts/subscriptions")
          .set(auth)
          .send({ feedUrl })
          .expect(201);
      }

      // Paginacion: dos coincidencias, una por pagina
      const paged = await request(srv.app)
        .get("/api/v1/podcasts/episodes/search?q=camion&limit=1")
        .set(auth)
        .expect(200);
      expect((paged.body.items as EpisodeItem[])).toHaveLength(1);
      expect(paged.body.pagination.hasMore).toBe(true);

      const second = await request(srv.app)
        .get("/api/v1/podcasts/episodes/search?q=camion&limit=1&offset=1")
        .set(auth)
        .expect(200);
      expect((second.body.items as EpisodeItem[]).map((i) => i.title)).toEqual([
        "El camión fantasma",
      ]);
      expect(second.body.pagination).toEqual({ offset: 1, limit: 1, hasMore: false });

      // Un episodio eliminado del feed desaparece de los resultados
      const camionRadioId = sierraEpisodes.find((e) => e.title === "Camión de radio")!.id;
      srv.db.db
        .update(podcastEpisodes)
        .set({ removedAt: Date.now() })
        .where(eq(podcastEpisodes.id, camionRadioId))
        .run();

      const afterRemoval = await request(srv.app)
        .get("/api/v1/podcasts/episodes/search?q=camion")
        .set(auth)
        .expect(200);
      expect((afterRemoval.body.items as EpisodeItem[]).map((i) => i.title)).toEqual([
        "El camión fantasma",
      ]);

      // Sin coincidencias
      const none = await request(srv.app)
        .get("/api/v1/podcasts/episodes/search?q=inexistente")
        .set(auth)
        .expect(200);
      expect(none.body.items).toHaveLength(0);
      expect(none.body.pagination.hasMore).toBe(false);
    } finally {
      srv.db.sqlite.close();
    }
  });
});
