import { afterEach, describe, expect, it, vi } from "vitest";
import { PodcastQueueService } from "../src/services/podcasts/queue.js";
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

  return { srv, token, podcastId, episodes, userId: reg.body.user.id as number };
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

  it("nombra la cola de reproducción al rechazar por límite", async () => {
    const { srv, episodes, userId } = await setupFeed();
    try {
      const service = new PodcastQueueService(
        srv.db.db,
        { ...srv.config, podcastQueueMax: 2 },
        srv.ctx.podcastCatalog,
      );
      const first = episodes.find((e) => e.title === "Episodio Uno")!;
      const second = episodes.find((e) => e.title === "Episodio Dos")!;
      const third = episodes.find((e) => e.title === "Episodio Tres")!;

      service.add(userId, first.id);
      service.add(userId, second.id);

      expect(() => service.add(userId, third.id)).toThrowError(
        "La cola de reproducción permite un máximo de 2 episodios",
      );
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("mueve un episodio ya encolado a continuación o al final sin duplicarlo", async () => {
    const { srv, token, episodes } = await setupFeed();
    try {
      const first = episodes.find((e) => e.title === "Episodio Uno")!;
      const second = episodes.find((e) => e.title === "Episodio Dos")!;
      const third = episodes.find((e) => e.title === "Episodio Tres")!;

      for (const episode of [first, second, third]) {
        await request(srv.app)
          .post("/api/v1/podcasts/queue")
          .set("Authorization", `Bearer ${token}`)
          .send({ episodeId: episode.id })
          .expect(201);
      }

      const base = await request(srv.app)
        .get("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(base.body.queue.items.map((i: { id: number }) => i.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
      const baseRevision = base.body.queue.revision as number;

      const moveNext = await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: third.id, position: "next" })
        .expect(201);
      expect(moveNext.body.queue.items.map((i: { id: number }) => i.id)).toEqual([
        third.id,
        first.id,
        second.id,
      ]);
      expect(moveNext.body.queue.items).toHaveLength(3);
      expect(moveNext.body.queue.revision).toBe(baseRevision + 1);

      const nextNoop = await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: third.id, position: "next" })
        .expect(201);
      expect(nextNoop.body.queue.items.map((i: { id: number }) => i.id)).toEqual([
        third.id,
        first.id,
        second.id,
      ]);
      expect(nextNoop.body.queue.revision).toBe(baseRevision + 1);

      const moveEnd = await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: third.id, position: "end" })
        .expect(201);
      expect(moveEnd.body.queue.items.map((i: { id: number }) => i.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
      expect(moveEnd.body.queue.items).toHaveLength(3);
      expect(moveEnd.body.queue.revision).toBe(baseRevision + 2);

      const endNoop = await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: third.id, position: "end" })
        .expect(201);
      expect(endNoop.body.queue.items.map((i: { id: number }) => i.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
      expect(endNoop.body.queue.revision).toBe(baseRevision + 2);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("vacía la cola, conserva opcionalmente un episodio y se aísla por usuario", async () => {
    const { srv, token, episodes } = await setupFeed();
    try {
      const first = episodes.find((e) => e.title === "Episodio Uno")!;
      const second = episodes.find((e) => e.title === "Episodio Dos")!;
      const third = episodes.find((e) => e.title === "Episodio Tres")!;

      for (const episode of [first, second, third]) {
        await request(srv.app)
          .post("/api/v1/podcasts/queue")
          .set("Authorization", `Bearer ${token}`)
          .send({ episodeId: episode.id })
          .expect(201);
      }

      const cleared = await request(srv.app)
        .delete("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(cleared.body.queue.items).toHaveLength(0);
      expect(cleared.body.queue.revision).toBe(4);

      for (const episode of [first, second]) {
        await request(srv.app)
          .post("/api/v1/podcasts/queue")
          .set("Authorization", `Bearer ${token}`)
          .send({ episodeId: episode.id })
          .expect(201);
      }

      const kept = await request(srv.app)
        .delete(`/api/v1/podcasts/queue?keepEpisodeId=${second.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(kept.body.queue.items.map((i: { id: number }) => i.id)).toEqual([second.id]);
      expect(kept.body.queue.revision).toBe(7);

      const keptAgain = await request(srv.app)
        .delete(`/api/v1/podcasts/queue?keepEpisodeId=${second.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(keptAgain.body.queue.items.map((i: { id: number }) => i.id)).toEqual([second.id]);
      expect(keptAgain.body.queue.revision).toBe(8);

      const unknownKeep = await request(srv.app)
        .delete("/api/v1/podcasts/queue?keepEpisodeId=999999")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(unknownKeep.body.queue.items).toHaveLength(0);
      expect(unknownKeep.body.queue.revision).toBe(9);

      const invalidKeep = await request(srv.app)
        .delete("/api/v1/podcasts/queue?keepEpisodeId=abc")
        .set("Authorization", `Bearer ${token}`)
        .expect(400);
      expect(invalidKeep.body.error.code).toBe("VALIDATION_ERROR");

      await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: first.id })
        .expect(201);

      const reg = await request(srv.app)
        .post("/api/v1/auth/register")
        .send({ email: "queue-other@example.com", password: "Password123!", name: "Queue Other" })
        .expect(201);
      const otherToken = reg.body.accessToken as string;

      await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ episodeId: first.id })
        .expect(201);

      const otherBefore = await request(srv.app)
        .get("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(200);
      expect(otherBefore.body.queue.items.map((i: { id: number }) => i.id)).toEqual([first.id]);

      const isolated = await request(srv.app)
        .delete(`/api/v1/podcasts/queue?keepEpisodeId=${first.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(isolated.body.queue.items.map((i: { id: number }) => i.id)).toEqual([first.id]);
      expect(isolated.body.queue.revision).toBe(11);

      const otherAfter = await request(srv.app)
        .get("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(200);
      expect(otherAfter.body.queue.items.map((i: { id: number }) => i.id)).toEqual([first.id]);

      const empty = await request(srv.app)
        .delete("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(empty.body.queue.items).toHaveLength(0);
      expect(empty.body.queue.revision).toBe(12);

      const emptyAgain = await request(srv.app)
        .delete("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(emptyAgain.body.queue.items).toHaveLength(0);
      expect(emptyAgain.body.queue.revision).toBe(13);

      const otherFinal = await request(srv.app)
        .get("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(200);
      expect(otherFinal.body.queue.items.map((i: { id: number }) => i.id)).toEqual([first.id]);
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

  it("expone el estado de favorito de los episodios de la cola", async () => {
    const { srv, token, episodes } = await setupFeed();
    try {
      const first = episodes.find((e) => e.title === "Episodio Uno")!;

      await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: first.id })
        .expect(201);

      const before = await request(srv.app)
        .get("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(before.body.queue.items[0]).toMatchObject({ id: first.id, isFavorite: false });

      await request(srv.app)
        .post("/api/v1/podcasts/favorites")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: first.id })
        .expect(201);

      const afterAdd = await request(srv.app)
        .get("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(afterAdd.body.queue.items[0]).toMatchObject({ id: first.id, isFavorite: true });

      await request(srv.app)
        .delete(`/api/v1/podcasts/favorites/${first.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const afterRemove = await request(srv.app)
        .get("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(afterRemove.body.queue.items[0]).toMatchObject({ id: first.id, isFavorite: false });
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

describe("Descarte de Continuar escuchando", () => {
  it("descarta con progreso, lo excluye del home, no crea progreso sin datos y reaparece con nuevo progreso", async () => {
    const { srv, token, episodes } = await setupFeed();
    try {
      const first = episodes.find((e) => e.title === "Episodio Uno")!;
      const second = episodes.find((e) => e.title === "Episodio Dos")!;

      const dismissWithoutProgress = await request(srv.app)
        .post(`/api/v1/podcasts/episodes/${second.id}/dismiss`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(dismissWithoutProgress.body.dismissed).toBe(false);

      const secondProgress = await request(srv.app)
        .get(`/api/v1/podcasts/episodes/${second.id}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(secondProgress.body.progress).toBeNull();

      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${first.id}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          sessionId: "dismiss-sess-1",
          sequence: 1,
          positionSec: 120,
          durationSec: 600,
          listenedMs: 120_000,
          source: "web",
        })
        .expect(200);

      const before = await request(srv.app)
        .get("/api/v1/podcasts/home")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(before.body.continueListening.map((e: { id: number }) => e.id)).toEqual([first.id]);

      const dismissed = await request(srv.app)
        .post(`/api/v1/podcasts/episodes/${first.id}/dismiss`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(dismissed.body).toEqual({ dismissed: true });

      const after = await request(srv.app)
        .get("/api/v1/podcasts/home")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(after.body.continueListening).toHaveLength(0);

      await request(srv.app)
        .post("/api/v1/podcasts/episodes/999999/dismiss")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);

      await request(srv.app)
        .put(`/api/v1/podcasts/episodes/${first.id}/progress`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          sessionId: "dismiss-sess-2",
          sequence: 1,
          positionSec: 130,
          durationSec: 600,
          listenedMs: 130_000,
          source: "web",
        })
        .expect(200);

      const restored = await request(srv.app)
        .get("/api/v1/podcasts/home")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(restored.body.continueListening.map((e: { id: number }) => e.id)).toEqual([first.id]);
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("el descarte de un usuario no afecta al home de otro", async () => {
    const { srv, token, episodes } = await setupFeed();
    try {
      const first = episodes.find((e) => e.title === "Episodio Uno")!;

      const reg = await request(srv.app)
        .post("/api/v1/auth/register")
        .send({ email: "other@example.com", password: "Password123!", name: "Other" })
        .expect(201);
      const otherToken = reg.body.accessToken as string;

      for (const [index, userToken] of [token, otherToken].entries()) {
        await request(srv.app)
          .put(`/api/v1/podcasts/episodes/${first.id}/progress`)
          .set("Authorization", `Bearer ${userToken}`)
          .send({
            sessionId: `dismiss-user-${index + 1}`,
            sequence: 1,
            positionSec: 60,
            durationSec: 600,
            listenedMs: 60_000,
            source: "web",
          })
          .expect(200);
      }

      await request(srv.app)
        .post(`/api/v1/podcasts/episodes/${first.id}/dismiss`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const ownerHome = await request(srv.app)
        .get("/api/v1/podcasts/home")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(ownerHome.body.continueListening).toHaveLength(0);

      const otherHome = await request(srv.app)
        .get("/api/v1/podcasts/home")
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(200);
      expect(otherHome.body.continueListening.map((e: { id: number }) => e.id)).toEqual([first.id]);
    } finally {
      srv.db.sqlite.close();
    }
  });
});

describe("Conteo de cola", () => {
  it("devuelve el numero de episodios y el limite, y se aisla por usuario", async () => {
    const { srv, token, episodes } = await setupFeed();
    try {
      const first = episodes.find((e) => e.title === "Episodio Uno")!;
      const second = episodes.find((e) => e.title === "Episodio Dos")!;

      const empty = await request(srv.app)
        .get("/api/v1/podcasts/queue/count")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(empty.body).toEqual({ count: 0, limit: 200 });

      await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: first.id })
        .expect(201);
      await request(srv.app)
        .post("/api/v1/podcasts/queue")
        .set("Authorization", `Bearer ${token}`)
        .send({ episodeId: second.id })
        .expect(201);

      const two = await request(srv.app)
        .get("/api/v1/podcasts/queue/count")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(two.body).toEqual({ count: 2, limit: 200 });

      const reg = await request(srv.app)
        .post("/api/v1/auth/register")
        .send({ email: "count@example.com", password: "Password123!", name: "Count" })
        .expect(201);
      const otherToken = reg.body.accessToken as string;
      const other = await request(srv.app)
        .get("/api/v1/podcasts/queue/count")
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(200);
      expect(other.body.count).toBe(0);

      await request(srv.app)
        .delete(`/api/v1/podcasts/queue/${first.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      const one = await request(srv.app)
        .get("/api/v1/podcasts/queue/count")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(one.body.count).toBe(1);
    } finally {
      srv.db.sqlite.close();
    }
  });
});
