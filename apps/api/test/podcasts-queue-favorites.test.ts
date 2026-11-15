import { afterEach, describe, expect, it, vi } from "vitest";
import { request, setupServer } from "./helpers.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const FEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Cola y Favoritos</title>
    <item>
      <title>Episodio Uno</title>
      <guid>ep-queue-1</guid>
      <pubDate>Mon, 19 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://audio.example.org/ep1.mp3" type="audio/mpeg" />
      <itunes:duration>600</itunes:duration>
    </item>
    <item>
      <title>Episodio Dos</title>
      <guid>ep-queue-2</guid>
      <pubDate>Tue, 20 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://audio.example.org/ep2.mp3" type="audio/mpeg" />
      <itunes:duration>900</itunes:duration>
    </item>
    <item>
      <title>Episodio Tres</title>
      <guid>ep-queue-3</guid>
      <pubDate>Wed, 21 Oct 2026 08:00:00 GMT</pubDate>
      <enclosure url="https://audio.example.org/ep3.mp3" type="audio/mpeg" />
      <itunes:duration>1200</itunes:duration>
    </item>
  </channel>
</rss>`;

async function setupFeed() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(FEED_XML, { status: 200 })),
  );

  const srv = setupServer({ PODCASTS_ENABLED: "true" });
  const reg = await request(srv.app)
    .post("/api/v1/auth/register")
    .send({ email: "queue@example.com", password: "Password123!", name: "Queue" })
    .expect(201);
  const token = reg.body.accessToken as string;

  const resolved = await request(srv.app)
    .post("/api/v1/podcasts/resolve")
    .set("Authorization", `Bearer ${token}`)
    .send({ feedUrl: "https://audio.example.org/feed.xml" })
    .expect(200);

  const podcastId = resolved.body.podcast.id as number;
  const episodes = resolved.body.episodes.items as Array<{ id: number; title: string }>;

  await request(srv.app)
    .post("/api/v1/podcasts/subscriptions")
    .set("Authorization", `Bearer ${token}`)
    .send({ podcastId })
    .expect(201);

  return { srv, token, podcastId, episodes };
}

describe("Cola sincronizada de podcasts", () => {
  it("añade al final y como siguiente, evita duplicados, reordena con revisión y detecta conflictos", async () => {
    const { srv, token, episodes } = await setupFeed();
    try {
      const first = episodes.find((e) => e.title === "Episodio Uno")!;
      const second = episodes.find((e) => e.title === "Episodio Dos")!;
      const third = episodes.find((e) => e.title === "Episodio Tres")!;

      const empty = await request(srv.app)
        .get("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(empty.body.queue.items).toHaveLength(0);
      expect(empty.body.queue.revision).toBe(0);
      expect(empty.body.queue.limit).toBe(200);

      const addFirst = await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: first.id })
        .expect(201);
      expect(addFirst.body.queue.items.map((i: { id: number }) => i.id)).toEqual([first.id]);
      expect(addFirst.body.queue.revision).toBe(1);

      // Duplicado: no añade y no incrementa la revisión
      const duplicate = await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: first.id })
        .expect(201);
      expect(duplicate.body.queue.items).toHaveLength(1);
      expect(duplicate.body.queue.revision).toBe(1);

      const addNext = await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: second.id, position: "next" })
        .expect(201);
      expect(addNext.body.queue.items.map((i: { id: number }) => i.id)).toEqual([
        second.id,
        first.id,
      ]);

      const addLast = await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: third.id, position: "end" })
        .expect(201);
      expect(addLast.body.queue.items.map((i: { id: number }) => i.id)).toEqual([
        second.id,
        first.id,
        third.id,
      ]);

      const baseRevision = addLast.body.queue.revision as number;
      const reordered = await request(srv.app)
        .put("/api/v1/podcasts/queue/order")
        .set("Authorization", `Bearer ${token}`)
        .send({ baseRevision, episodeIds: [third.id, second.id, first.id] })
        .expect(200);
      expect(reordered.body.queue.items.map((i: { id: number }) => i.id)).toEqual([
        third.id,
        second.id,
        first.id,
      ]);
      expect(reordered.body.queue.revision).toBe(baseRevision + 1);

      // Revisión obsoleta: 409 QUEUE_CONFLICT
      const conflict = await request(srv.app)
        .put("/api/v1/podcasts/queue/order")
        .set("Authorization", `Bearer ${token}`)
        .send({ baseRevision, episodeIds: [first.id, second.id, third.id] })
        .expect(409);
      expect(conflict.body.error.code).toBe("QUEUE_CONFLICT");

      const mismatch = await request(srv.app)
        .put("/api/v1/podcasts/queue/order")
        .set("Authorization", `Bearer ${token}`)
        .send({ baseRevision: reordered.body.queue.revision, episodeIds: [first.id, second.id] })
        .expect(400);
      expect(mismatch.body.error.code).toBe("QUEUE_MISMATCH");

      const removed = await request(srv.app)
        .delete(`/api/v1/podcasts/queue/${second.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(removed.body.queue.items.map((i: { id: number }) => i.id)).toEqual([
        third.id,
        first.id,
      ]);
      expect(removed.body.queue.revision).toBe(reordered.body.queue.revision + 1);

      const missingEpisode = await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: 999_999 })
        .expect(404);
      expect(missingEpisode.body.error.code).toBe("EPISODE_NOT_FOUND");
    } finally {
      srv.db.sqlite.close();
    }
  });
});

describe("Episodios favoritos de podcasts", () => {
  it("marca, lista y elimina favoritos sin tocar las emisoras favoritas de radio", async () => {
    const { srv, token, episodes } = await setupFeed();
    try {
      const first = episodes.find((e) => e.title === "Episodio Uno")!;
      const second = episodes.find((e) => e.title === "Episodio Dos")!;

      const added = await request(srv.app)
        .post("/api/v1/podcasts/favorites")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: first.id })
        .expect(201);
      expect(added.body.episode).toMatchObject({ id: first.id, isFavorite: true });

      const duplicate = await request(srv.app)
        .post("/api/v1/podcasts/favorites")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: first.id })
        .expect(201);
      expect(duplicate.body.episode.id).toBe(first.id);

      await request(srv.app)
        .post("/api/v1/podcasts/favorites")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: second.id })
        .expect(201);

      const list = await request(srv.app)
        .get("/api/v1/podcasts/favorites")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(list.body.items).toHaveLength(2);
      expect(list.body.items.map((i: { id: number }) => i.id).sort()).toEqual(
        [first.id, second.id].sort(),
      );
      expect(list.body.items.every((i: { isFavorite: boolean }) => i.isFavorite)).toBe(true);

      const radioFavorites = await request(srv.app)
        .get("/api/v1/favorites")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(radioFavorites.body.items).toHaveLength(0);

      const removed = await request(srv.app)
        .delete(`/api/v1/podcasts/favorites/${first.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(removed.body).toEqual({ ok: true });

      const afterRemove = await request(srv.app)
        .get("/api/v1/podcasts/favorites")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(afterRemove.body.items).toHaveLength(1);
      expect(afterRemove.body.items[0].id).toBe(second.id);
    } finally {
      srv.db.sqlite.close();
    }
  });
});

describe("Sección inicial del perfil", () => {
  it("guarda defaultSection y lo devuelve en el usuario", async () => {
    const srv = setupServer({ PODCASTS_ENABLED: "true" });
    try {
      const reg = await request(srv.app)
        .post("/api/v1/auth/register")
        .send({ email: "section@example.com", password: "Password123!", name: "Section" })
        .expect(201);
      const token = reg.body.accessToken as string;
      expect(reg.body.user.defaultSection).toBe("radio");

      const updated = await request(srv.app)
        .patch("/api/v1/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ defaultSection: "podcasts" })
        .expect(200);
      expect(updated.body.user.defaultSection).toBe("podcasts");

      const me = await request(srv.app)
        .get("/api/v1/users/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(me.body.user.defaultSection).toBe("podcasts");

      await request(srv.app)
        .patch("/api/v1/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ defaultSection: "otra" })
        .expect(422);
    } finally {
      srv.db.sqlite.close();
    }
  });
});

describe("Portada agregada /podcasts/home", () => {
  it("devuelve continuar escuchando, novedades de suscripciones, suscripciones y resumen de cola", async () => {
    const { srv, token, podcastId, episodes } = await setupFeed();
    try {
      const first = episodes.find((e) => e.title === "Episodio Uno")!;
      const second = episodes.find((e) => e.title === "Episodio Dos")!;

      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${first.id}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          sessionId: "home-sess",
          sequence: 1,
          positionSec: 120,
          durationSec: 600,
          listenedMs: 120_000,
          source: "web",
        })
        .expect(200);

      await request(srv.app)
        .post("/api/v1/podcasts/favorites")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: second.id })
        .expect(201);

      await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: second.id })
        .expect(201);

      const home = await request(srv.app)
        .get("/api/v1/podcasts/home")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(home.body.subscriptions).toHaveLength(1);
      expect(home.body.subscriptions[0].id).toBe(podcastId);

      expect(home.body.continueListening).toHaveLength(1);
      expect(home.body.continueListening[0]).toMatchObject({
        id: first.id,
        isFavorite: false,
        progress: { positionSec: 120, durationSec: 600, completed: false },
      });

      expect(home.body.latestEpisodes).toHaveLength(3);
      expect(home.body.latestEpisodes[0].title).toBe("Episodio Tres");

      expect(home.body.queue).toMatchObject({ revision: 1, count: 1, limit: 200 });
      expect(home.body.queue.next.id).toBe(second.id);
    } finally {
      srv.db.sqlite.close();
    }
  });
});
