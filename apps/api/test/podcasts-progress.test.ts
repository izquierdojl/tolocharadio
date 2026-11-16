import { afterEach, describe, expect, it, vi } from "vitest";
import { userPodcastStatsHourly } from "../src/db/schema.js";
import { request, setupServer } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Podcast Progreso</title>
    <item>
      <title>Episodio de 100s</title>
      <guid>ep-prog-1</guid>
      <enclosure url="https://audio.example.org/ep100.mp3" type="audio/mpeg" />
      <itunes:duration>100</itunes:duration>
    </item>
  </channel>
</rss>`;

describe("Progreso idempotente de episodios y sesiones de escucha", () => {
  it("actualiza posicion, no duplica tiempo en reintentos y marca completado al superar 95% posicion y 80% escuchado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(FEED_XML, { status: 200 })),
    );

    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const reg = await request(srv.app)
        .post("/api/v1/auth/register")
        .send({ email: "prog@example.com", password: "Password123!", name: "Prog" })
        .expect(201);
      const token = reg.body.accessToken as string;

      const resolved = await request(srv.app)
        .post("/api/v1/podcasts/resolve")
        .set("Authorization", `Bearer ${token}`)
        .send({ feedUrl: "https://audio.example.org/feed.xml" })
        .expect(200);
      const episodeId = resolved.body.episodes.items[0].id as number;

      // Primer pulso: 40s escuchados, posicion 40s
      const p1 = await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${episodeId}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          sessionId: "sess-1",
          sequence: 1,
          positionSec: 40,
          durationSec: 100,
          listenedMs: 40_000,
          source: "web",
        })
        .expect(200);
      expect(p1.body.progress).toMatchObject({
        positionSec: 40,
        durationSec: 100,
        completed: false,
      });

      // Reintento idempotente con mismo sequence=1 y listenedMs=40_000
      await request(srv.app)
        .post(`/api/v1/podcasts/episodes/${episodeId}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          sessionId: "sess-1",
          sequence: 1,
          positionSec: 40,
          durationSec: 100,
          listenedMs: 40_000,
          source: "web",
        })
        .expect(200);

      const hourlyAfterRetry = srv.db.db.select().from(userPodcastStatsHourly).all();
      expect(hourlyAfterRetry).toHaveLength(1);
      expect(hourlyAfterRetry[0]!.totalMs).toBe(40_000);

      // Segundo pulso: posicion 96s (>=95%) y listenedMs 85_000 (>=80% de 100_000) -> auto-completado
      const p2 = await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${episodeId}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          sessionId: "sess-1",
          sequence: 2,
          positionSec: 96,
          durationSec: 100,
          listenedMs: 85_000,
          source: "web",
        })
        .expect(200);
      expect(p2.body.progress.completed).toBe(true);
      expect(p2.body.progress.completedAt).toEqual(expect.any(Number));

      const hourlyFinal = srv.db.db.select().from(userPodcastStatsHourly).all();
      expect(hourlyFinal[0]!.totalMs).toBe(85_000);

      // Filtrado por completed en el listado de episodios del podcast
      const completedEps = await request(srv.app)
        .get(`/api/v1/podcasts/${resolved.body.podcast.id}/episodes?filter=completed`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(completedEps.body.items).toHaveLength(1);
      expect(completedEps.body.items[0].progress.completed).toBe(true);
    } finally {
      srv.db.sqlite.close();
    }
  });
});

describe("Descarte desde Continuar escuchando", () => {
  it("restaura el episodio al registrar nuevo progreso tras el descarte", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(FEED_XML, { status: 200 })),
    );

    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const reg = await request(srv.app)
        .post("/api/v1/auth/register")
        .send({ email: "restore@example.com", password: "Password123!", name: "Restore" })
        .expect(201);
      const token = reg.body.accessToken as string;

      const resolved = await request(srv.app)
        .post("/api/v1/podcasts/resolve")
        .set("Authorization", `Bearer ${token}`)
        .send({ feedUrl: "https://audio.example.org/feed.xml" })
        .expect(200);
      const episodeId = resolved.body.episodes.items[0].id as number;

      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${episodeId}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          sessionId: "restore-sess-1",
          sequence: 1,
          positionSec: 40,
          durationSec: 100,
          listenedMs: 40_000,
          source: "web",
        })
        .expect(200);

      await request(srv.app)
        .post(`/api/v1/podcasts/episodes/${episodeId}/dismiss`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const dismissedHome = await request(srv.app)
        .get("/api/v1/podcasts/home")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(dismissedHome.body.continueListening).toHaveLength(0);

      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${episodeId}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          sessionId: "restore-sess-2",
          sequence: 1,
          positionSec: 50,
          durationSec: 100,
          listenedMs: 50_000,
          source: "web",
        })
        .expect(200);

      const restoredHome = await request(srv.app)
        .get("/api/v1/podcasts/home")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(restoredHome.body.continueListening.map((e: { id: number }) => e.id)).toEqual([
        episodeId,
      ]);
    } finally {
      srv.db.sqlite.close();
    }
  });
});
