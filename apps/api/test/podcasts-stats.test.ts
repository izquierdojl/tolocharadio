import { afterEach, describe, expect, it, vi } from "vitest";
import { podcastListenSessions } from "../src/db/schema.js";
import { request, setupServer } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const DAY_MS = 86_400_000;

const FEED_TECH = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Tech Talks</title>
    <itunes:category text="Technology" />
    <itunes:category text="Business" />
    <item>
      <title>Episodio A</title>
      <guid>stats-a</guid>
      <enclosure url="https://audio.example.org/a.mp3" type="audio/mpeg" />
      <itunes:duration>600</itunes:duration>
    </item>
    <item>
      <title>Episodio B</title>
      <guid>stats-b</guid>
      <enclosure url="https://audio.example.org/b.mp3" type="audio/mpeg" />
      <itunes:duration>600</itunes:duration>
    </item>
  </channel>
</rss>`;

const FEED_OTHER = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Sin Categoria</title>
    <item>
      <title>Episodio C</title>
      <guid>stats-c</guid>
      <enclosure url="https://audio.example.org/c.mp3" type="audio/mpeg" />
      <itunes:duration>600</itunes:duration>
    </item>
  </channel>
</rss>`;

function dayOffset(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

function at(day: string, hour: number): number {
  return Date.parse(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
}

interface StatsFixture {
  srv: ReturnType<typeof setupServer>;
  token: string;
  userId: number;
  podcastOne: number;
  podcastTwo: number;
  episodeA: number;
  episodeB: number;
  episodeC: number;
  dayOne: string;
  dayTwo: string;
  dayZero: string;
}

async function setupStatsFixture(): Promise<StatsFixture> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return new Response(url.includes("other") ? FEED_OTHER : FEED_TECH, { status: 200 });
    }),
  );

  const srv = setupServer({ PODCASTS_ENABLED: "true", STATS_TIMEZONE: "UTC" });
  const reg = await request(srv.app)
    .post("/api/v1/auth/register")
    .send({ email: "stats-podcasts@example.com", password: "Password123!", name: "Stats" })
    .expect(201);
  const token = reg.body.accessToken as string;
  const userId = reg.body.user.id as number;

  const resolvedOne = await request(srv.app)
    .post("/api/v1/podcasts/resolve")
    .set("Authorization", `Bearer ${token}`)
    .send({ feedUrl: "https://audio.example.org/tech.xml" })
    .expect(200);
  const resolvedTwo = await request(srv.app)
    .post("/api/v1/podcasts/resolve")
    .set("Authorization", `Bearer ${token}`)
    .send({ feedUrl: "https://audio.example.org/other.xml" })
    .expect(200);

  const episodeA = resolvedOne.body.episodes.items.find(
    (episode: { title: string }) => episode.title === "Episodio A",
  ).id as number;
  const episodeB = resolvedOne.body.episodes.items.find(
    (episode: { title: string }) => episode.title === "Episodio B",
  ).id as number;
  const episodeC = resolvedTwo.body.episodes.items[0].id as number;

  const dayOne = dayOffset(2);
  const dayTwo = dayOffset(1);
  const dayZero = dayOffset(3);

  const progress = async (
    episodeId: number,
    body: Record<string, unknown>,
  ): Promise<void> => {
    await request(srv.app)
      .put(`/api/v1/podcasts/episodes/${episodeId}/progress`)
      .set("Authorization", `Bearer ${token}`)
      .send({ source: "web", ...body })
      .expect(200);
  };

  await progress(episodeA, {
    sessionId: "stats-a",
    sequence: 1,
    positionSec: 30,
    durationSec: 600,
    listenedMs: 60_000,
    occurredAt: at(dayOne, 10),
  });
  await progress(episodeB, {
    sessionId: "stats-b",
    sequence: 1,
    positionSec: 576,
    durationSec: 600,
    listenedMs: 90_000,
    completed: true,
    occurredAt: at(dayTwo, 11),
  });
  await progress(episodeC, {
    sessionId: "stats-c",
    sequence: 1,
    positionSec: 10,
    durationSec: 600,
    listenedMs: 20_000,
    occurredAt: at(dayTwo, 12),
  });

  return {
    srv,
    token,
    userId,
    podcastOne: resolvedOne.body.podcast.id as number,
    podcastTwo: resolvedTwo.body.podcast.id as number,
    episodeA,
    episodeB,
    episodeC,
    dayOne,
    dayTwo,
    dayZero,
  };
}

describe("Estadisticas de podcasts", () => {
  it("resume tiempo, episodios unicos y tasa de finalizacion sin penalizar sesiones", async () => {
    const fixture = await setupStatsFixture();
    const { srv, token } = fixture;
    try {
      const summary = await request(srv.app)
        .get(`/api/v1/podcasts/stats/summary?from=${fixture.dayOne}&to=${fixture.dayTwo}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(summary.body).toMatchObject({
        totalMs: 170_000,
        episodesStarted: 2,
        episodesCompleted: 1,
        completionRate: 0.5,
        podcastsCount: 2,
        averageEpisodeMs: 85_000,
      });

      const onlyDayTwo = await request(srv.app)
        .get(`/api/v1/podcasts/stats/summary?from=${fixture.dayTwo}&to=${fixture.dayTwo}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(onlyDayTwo.body).toMatchObject({
        totalMs: 110_000,
        episodesStarted: 1,
        episodesCompleted: 1,
        completionRate: 1,
      });
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("devuelve rankings de podcasts, episodios y categorias ordenados por tiempo", async () => {
    const fixture = await setupStatsFixture();
    const { srv, token } = fixture;
    try {
      const topPodcasts = await request(srv.app)
        .get("/api/v1/podcasts/stats/top-podcasts?limit=5")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(topPodcasts.body.items).toHaveLength(2);
      expect(topPodcasts.body.items[0]).toMatchObject({
        podcastId: fixture.podcastOne,
        title: "Tech Talks",
        totalMs: 150_000,
        episodesStarted: 2,
        episodesCompleted: 1,
      });
      expect(topPodcasts.body.items[1]).toMatchObject({
        podcastId: fixture.podcastTwo,
        totalMs: 20_000,
        episodesStarted: 0,
        episodesCompleted: 0,
      });

      const topEpisodes = await request(srv.app)
        .get("/api/v1/podcasts/stats/top-episodes?limit=2")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(topEpisodes.body.items).toHaveLength(2);
      expect(topEpisodes.body.items[0]).toMatchObject({
        episodeId: fixture.episodeB,
        title: "Episodio B",
        podcastTitle: "Tech Talks",
        totalMs: 90_000,
        completed: true,
      });
      expect(topEpisodes.body.items[1]).toMatchObject({
        episodeId: fixture.episodeA,
        totalMs: 60_000,
        completed: false,
      });

      const categories = await request(srv.app)
        .get("/api/v1/podcasts/stats/categories")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      const byCategory = new Map(
        (categories.body.items as Array<{ category: string; totalMs: number }>).map((item) => [
          item.category,
          item.totalMs,
        ]),
      );
      expect(byCategory.get("Technology")).toBe(150_000);
      expect(byCategory.get("Business")).toBe(150_000);
      expect(byCategory.get("desconocido")).toBe(20_000);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("rellena dias sin actividad, agrupa habitos y lista sesiones recientes", async () => {
    const fixture = await setupStatsFixture();
    const { srv, token } = fixture;
    try {
      const timeline = await request(srv.app)
        .get(
          `/api/v1/podcasts/stats/timeline?from=${fixture.dayZero}&to=${fixture.dayTwo}&granularity=day`,
        )
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(timeline.body.granularity).toBe("day");
      expect(timeline.body.items).toEqual([
        { bucket: fixture.dayZero, totalMs: 0 },
        { bucket: fixture.dayOne, totalMs: 60_000 },
        { bucket: fixture.dayTwo, totalMs: 110_000 },
      ]);

      const week = await request(srv.app)
        .get(
          `/api/v1/podcasts/stats/timeline?from=${fixture.dayZero}&to=${fixture.dayTwo}&granularity=week`,
        )
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(week.body.items.length).toBeGreaterThanOrEqual(1);
      expect(
        (week.body.items as Array<{ totalMs: number }>).reduce(
          (total, item) => total + item.totalMs,
          0,
        ),
      ).toBe(170_000);

      const habits = await request(srv.app)
        .get("/api/v1/podcasts/stats/habits")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      const totalHabitMs = (habits.body.items as Array<{ totalMs: number }>).reduce(
        (total, item) => total + item.totalMs,
        0,
      );
      expect(totalHabitMs).toBe(170_000);
      expect(
        (habits.body.items as Array<{ hour: number }>).some((item) => item.hour === 12),
      ).toBe(true);

      const recent = await request(srv.app)
        .get("/api/v1/podcasts/stats/recent?limit=2")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(recent.body.items).toHaveLength(2);
      expect(recent.body.items[0]).toMatchObject({
        episodeId: fixture.episodeC,
        podcastId: fixture.podcastTwo,
        episodeTitle: "Episodio C",
        podcastTitle: "Sin Categoria",
        listenedMs: 20_000,
        completed: false,
      });
      expect(recent.body.items[1].episodeId).toBe(fixture.episodeB);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("valida parametros y responde 403 si los podcasts estan deshabilitados", async () => {
    const fixture = await setupStatsFixture();
    const { srv, token } = fixture;
    try {
      await request(srv.app)
        .get("/api/v1/podcasts/stats/summary?from=2026-13-01")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      await request(srv.app)
        .get("/api/v1/podcasts/stats/top-podcasts?limit=0")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      await request(srv.app)
        .get("/api/v1/podcasts/stats/timeline?granularity=hour")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      await request(srv.app)
        .get("/api/v1/podcasts/stats/summary")
        .expect(401);
    } finally {
      srv.db.sqlite.close();
    }

    const disabled = setupServer({ PODCASTS_ENABLED: "false" });
    try {
      const reg = await request(disabled.app)
        .post("/api/v1/auth/register")
        .send({ email: "stats-off@example.com", password: "Password123!" })
        .expect(201);
      await request(disabled.app)
        .get("/api/v1/podcasts/stats/summary")
        .set("Authorization", `Bearer ${reg.body.accessToken as string}`)
        .expect(403);
    } finally {
      disabled.db.sqlite.close();
    }
  });

  it("purga sesiones fuera de retencion conservando los agregados horarios", async () => {
    const fixture = await setupStatsFixture();
    const { srv, userId } = fixture;
    try {
      const oldStartedAt = Date.now() - 800 * DAY_MS;
      srv.db.db
        .insert(podcastListenSessions)
        .values({
          userId,
          episodeId: fixture.episodeA,
          podcastId: fixture.podcastOne,
          clientSessionId: "old-session",
          source: "web",
          startedAt: oldStartedAt,
          endedAt: oldStartedAt + 60_000,
          listenedMs: 60_000,
          lastPositionSec: 60,
          durationSec: 600,
          completed: 0,
          lastSequence: 1,
          updatedAt: oldStartedAt,
        })
        .run();

      const deleted = srv.ctx.podcastStats.purgeRetention();
      expect(deleted).toBe(1);
      const remaining = srv.db.db.select().from(podcastListenSessions).all();
      expect(remaining.every((row) => row.clientSessionId !== "old-session")).toBe(true);

      const aggregates = srv.ctx.podcastStats.summary(userId, { from: null, to: null });
      expect(aggregates.totalMs).toBe(170_000);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("reinicia las estadisticas y conserva suscripciones, favoritos, cola y progreso", async () => {
    const fixture = await setupStatsFixture();
    const { srv, token } = fixture;
    const auth = { Authorization: `Bearer ${token}` };
    try {
      await request(srv.app)
        .post("/api/v1/podcasts/subscriptions")
        .set(auth)
        .send({ podcastId: fixture.podcastOne })
        .expect(201);
      await request(srv.app)
        .post("/api/v1/podcasts/favorites")
        .set(auth)
        .send({ episodeId: fixture.episodeA })
        .expect(201);
      await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set(auth)
        .send({ episodeId: fixture.episodeB })
        .expect(201);

      const reset = await request(srv.app)
        .delete("/api/v1/podcasts/stats")
        .set(auth)
        .expect(200);
      expect(reset.body).toEqual({ ok: true });

      const summary = await request(srv.app)
        .get("/api/v1/podcasts/stats/summary")
        .set(auth)
        .expect(200);
      expect(summary.body).toEqual({
        totalMs: 0,
        episodesStarted: 0,
        episodesCompleted: 0,
        completionRate: 0,
        podcastsCount: 0,
        averageEpisodeMs: 0,
      });

      for (const path of [
        "/api/v1/podcasts/stats/top-podcasts",
        "/api/v1/podcasts/stats/top-episodes",
        "/api/v1/podcasts/stats/categories",
        "/api/v1/podcasts/stats/recent",
        "/api/v1/podcasts/stats/habits",
      ]) {
        const res = await request(srv.app).get(path).set(auth).expect(200);
        expect(res.body.items).toEqual([]);
      }

      const timeline = await request(srv.app)
        .get(
          `/api/v1/podcasts/stats/timeline?from=${fixture.dayZero}&to=${fixture.dayTwo}&granularity=day`,
        )
        .set(auth)
        .expect(200);
      expect(timeline.body.items).toHaveLength(3);
      expect(
        (timeline.body.items as Array<{ totalMs: number }>).every((item) => item.totalMs === 0),
      ).toBe(true);

      const subscriptions = await request(srv.app)
        .get("/api/v1/podcasts/subscriptions")
        .set(auth)
        .expect(200);
      expect(subscriptions.body.items).toHaveLength(1);
      const favorites = await request(srv.app)
        .get("/api/v1/podcasts/favorites")
        .set(auth)
        .expect(200);
      expect(favorites.body.items).toHaveLength(1);
      const queue = await request(srv.app)
        .get("/api/v1/podcasts/queue")
        .set(auth)
        .expect(200);
      expect(queue.body.queue.items).toHaveLength(1);

      const progress = await request(srv.app)
        .get(`/api/v1/podcasts/episodes/${fixture.episodeA}/progress`)
        .set(auth)
        .expect(200);
      expect(progress.body.progress.positionSec).toBe(30);
      const completedProgress = await request(srv.app)
        .get(`/api/v1/podcasts/episodes/${fixture.episodeB}/progress`)
        .set(auth)
        .expect(200);
      expect(completedProgress.body.progress.completed).toBe(true);

      await request(srv.app).delete("/api/v1/podcasts/stats").set(auth).expect(200);
      const afterSecondReset = await request(srv.app)
        .get("/api/v1/podcasts/stats/summary")
        .set(auth)
        .expect(200);
      expect(afterSecondReset.body.totalMs).toBe(0);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("aplica el corte a las sesiones anteriores y solo suma el delta posterior", async () => {
    const fixture = await setupStatsFixture();
    const { srv, token } = fixture;
    const auth = { Authorization: `Bearer ${token}` };
    try {
      await request(srv.app).delete("/api/v1/podcasts/stats").set(auth).expect(200);

      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${fixture.episodeA}/progress`)
        .set(auth)
        .send({
          sessionId: "stats-a",
          sequence: 2,
          positionSec: 45,
          durationSec: 600,
          listenedMs: 75_000,
          occurredAt: Date.now(),
          source: "web",
        })
        .expect(200);

      const summary = await request(srv.app)
        .get("/api/v1/podcasts/stats/summary")
        .set(auth)
        .expect(200);
      expect(summary.body).toMatchObject({
        totalMs: 15_000,
        episodesStarted: 0,
        episodesCompleted: 0,
        podcastsCount: 0,
      });
      const recent = await request(srv.app)
        .get("/api/v1/podcasts/stats/recent")
        .set(auth)
        .expect(200);
      expect(recent.body.items).toEqual([]);

      const today = new Date().toISOString().slice(0, 10);
      const timeline = await request(srv.app)
        .get(`/api/v1/podcasts/stats/timeline?from=${today}&to=${today}&granularity=day`)
        .set(auth)
        .expect(200);
      expect(timeline.body.items).toEqual([{ bucket: today, totalMs: 15_000 }]);

      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${fixture.episodeC}/progress`)
        .set(auth)
        .send({
          sessionId: "after-reset",
          sequence: 1,
          positionSec: 20,
          durationSec: 600,
          listenedMs: 40_000,
          occurredAt: Date.now(),
          source: "web",
        })
        .expect(200);

      const afterNewSession = await request(srv.app)
        .get("/api/v1/podcasts/stats/summary")
        .set(auth)
        .expect(200);
      expect(afterNewSession.body).toMatchObject({
        totalMs: 55_000,
        episodesStarted: 1,
        podcastsCount: 1,
      });
      const newRecent = await request(srv.app)
        .get("/api/v1/podcasts/stats/recent")
        .set(auth)
        .expect(200);
      expect(newRecent.body.items).toHaveLength(1);
      expect(newRecent.body.items[0].episodeId).toBe(fixture.episodeC);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("protege el reinicio y aisla las estadisticas entre usuarios", async () => {
    const fixture = await setupStatsFixture();
    const { srv, token } = fixture;
    try {
      await request(srv.app).delete("/api/v1/podcasts/stats").expect(401);

      const second = await request(srv.app)
        .post("/api/v1/auth/register")
        .send({ email: "stats-other@example.com", password: "Password123!" })
        .expect(201);
      const secondToken = second.body.accessToken as string;
      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${fixture.episodeA}/progress`)
        .set("Authorization", `Bearer ${secondToken}`)
        .send({
          sessionId: "other-session",
          sequence: 1,
          positionSec: 30,
          durationSec: 600,
          listenedMs: 60_000,
          occurredAt: Date.now(),
          source: "web",
        })
        .expect(200);

      await request(srv.app)
        .delete("/api/v1/podcasts/stats")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const secondSummary = await request(srv.app)
        .get("/api/v1/podcasts/stats/summary")
        .set("Authorization", `Bearer ${secondToken}`)
        .expect(200);
      expect(secondSummary.body).toMatchObject({
        totalMs: 60_000,
        episodesStarted: 1,
        podcastsCount: 1,
      });
    } finally {
      srv.db.sqlite.close();
    }
  });
});
