import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { podcastEpisodes } from "../src/db/schema.js";
import { request, setupServer } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const FEED_URL = "https://pendientes.example.org/feed.xml";

const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Podcast Pendientes</title>
    <item>
      <title>Nuevo</title>
      <guid>ep-nuevo</guid>
      <pubDate>Tue, 20 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://pendientes.example.org/nuevo.mp3" type="audio/mpeg" />
      <itunes:duration>100</itunes:duration>
    </item>
    <item>
      <title>Medio</title>
      <guid>ep-medio</guid>
      <pubDate>Sat, 10 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://pendientes.example.org/medio.mp3" type="audio/mpeg" />
      <itunes:duration>100</itunes:duration>
    </item>
    <item>
      <title>Antiguo</title>
      <guid>ep-antiguo</guid>
      <pubDate>Thu, 01 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://pendientes.example.org/antiguo.mp3" type="audio/mpeg" />
      <itunes:duration>100</itunes:duration>
    </item>
    <item>
      <title>Sin fecha</title>
      <guid>ep-sin-fecha</guid>
      <enclosure url="https://pendientes.example.org/sinfecha.mp3" type="audio/mpeg" />
      <itunes:duration>100</itunes:duration>
    </item>
  </channel>
</rss>`;

const NUEVO = Date.UTC(2026, 9, 20, 8);
const MEDIO = Date.UTC(2026, 9, 10, 8);

async function register(app: Parameters<typeof request>[0], email: string) {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Password123!", name: "Test" })
    .expect(201);
  return res.body.accessToken as string;
}

describe("Listado de suscripciones: latestPendingEpisodeAt", () => {
  it("calcula el episodio pendiente más reciente por usuario", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(FEED_XML, { status: 200 })));

    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const tokenA = await register(srv.app, "a@example.com");
      const tokenB = await register(srv.app, "b@example.com");
      const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

      const resolved = await request(srv.app)
        .post("/api/v1/podcasts/resolve")
        .set(auth(tokenA))
        .send({ feedUrl: FEED_URL })
        .expect(200);
      const podcastId = resolved.body.podcast.id as number;
      const episodes = resolved.body.episodes.items as Array<{ id: number; title: string }>;
      const idOf = (title: string) => episodes.find((e) => e.title === title)!.id;

      for (const token of [tokenA, tokenB]) {
        await request(srv.app)
          .post("/api/v1/podcasts/subscriptions")
          .set(auth(token))
          .send({ podcastId })
          .expect(201);
      }

      const latest = async (token: string) => {
        const res = await request(srv.app)
          .get("/api/v1/podcasts/subscriptions")
          .set(auth(token))
          .expect(200);
        expect(res.body.items).toHaveLength(1);
        return res.body.items[0].latestPendingEpisodeAt as number | null;
      };

      let sequence = 0;
      const sendProgress = (token: string, episodeId: number, body: Record<string, unknown>) =>
        request(srv.app)
          .put(`/api/v1/podcasts/episodes/${episodeId}/progress`)
          .set(auth(token))
          .send({
            sessionId: `s-${episodeId}-${token.slice(-6)}`,
            sequence: ++sequence,
            durationSec: 100,
            listenedMs: 0,
            source: "web",
            ...body,
          })
          .expect(200);

      // Sin progreso: el más reciente con fecha
      expect(await latest(tokenA)).toBe(NUEVO);

      // Empezado a medias sigue siendo pendiente
      await sendProgress(tokenA, idOf("Nuevo"), { positionSec: 30 });
      expect(await latest(tokenA)).toBe(NUEVO);

      // Completado: pasa al siguiente; el otro usuario no se ve afectado
      await sendProgress(tokenA, idOf("Nuevo"), { positionSec: 100, completed: true });
      expect(await latest(tokenA)).toBe(MEDIO);
      expect(await latest(tokenB)).toBe(NUEVO);

      // Un episodio eliminado del feed no cuenta (para B)
      srv.db.db
        .update(podcastEpisodes)
        .set({ removedAt: Date.now() })
        .where(eq(podcastEpisodes.id, idOf("Nuevo")))
        .run();
      expect(await latest(tokenB)).toBe(MEDIO);

      // Todo completado (el episodio sin fecha no cuenta): null
      await sendProgress(tokenA, idOf("Medio"), { positionSec: 100, completed: true });
      await sendProgress(tokenA, idOf("Antiguo"), { positionSec: 100, completed: true });
      expect(await latest(tokenA)).toBeNull();
    } finally {
      srv.db.sqlite.close();
    }
  });
});
