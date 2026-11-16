import { and, asc, eq, max, ne, sql } from "drizzle-orm";
import type { Config } from "../../config/env.js";
import type { DB } from "../../db/client.js";
import { podcastEpisodes, podcastQueueItems, podcastQueueState } from "../../db/schema.js";
import { badRequest, conflict } from "../../errors.js";
import { toEpisodeItem, type PodcastCatalogService, type PodcastEpisodeItem } from "./catalog.js";

export interface PodcastQueueView {
  revision: number;
  updatedAt: number | null;
  items: PodcastEpisodeItem[];
  limit: number;
}

export type QueueInsertPosition = "end" | "next";

export class PodcastQueueService {
  constructor(
    private readonly db: DB,
    private readonly config: Config,
    private readonly catalog: PodcastCatalogService,
    private readonly now: () => number = Date.now,
  ) {}

  private ensureState(userId: number): typeof podcastQueueState.$inferSelect {
    const existing = this.db
      .select()
      .from(podcastQueueState)
      .where(eq(podcastQueueState.userId, userId))
      .get();
    if (existing) return existing;

    const created = this.db
      .insert(podcastQueueState)
      .values({ userId, revision: 0, updatedAt: this.now() })
      .onConflictDoNothing()
      .returning()
      .get();
    if (created) return created;

    return this.db
      .select()
      .from(podcastQueueState)
      .where(eq(podcastQueueState.userId, userId))
      .get()!;
  }

  get(userId: number): PodcastQueueView {
    const state = this.ensureState(userId);
    const rows = this.db
      .select({ episode: podcastEpisodes, position: podcastQueueItems.position })
      .from(podcastQueueItems)
      .innerJoin(podcastEpisodes, eq(podcastQueueItems.episodeId, podcastEpisodes.id))
      .where(eq(podcastQueueItems.userId, userId))
      .orderBy(asc(podcastQueueItems.position))
      .all();

    const episodeIds = rows.map((r) => r.episode.id);
    const progressMap = this.catalog.loadUserProgressMap(userId, episodeIds);
    const favoritesSet = this.catalog.loadUserFavoritesSet(userId, episodeIds);

    return {
      revision: state.revision,
      updatedAt: state.updatedAt,
      limit: this.config.podcastQueueMax,
      items: rows.map((r) =>
        toEpisodeItem(r.episode, progressMap.get(r.episode.id) ?? null, favoritesSet.has(r.episode.id)),
      ),
    };
  }

  summary(userId: number): {
    revision: number;
    count: number;
    limit: number;
    next: PodcastEpisodeItem | null;
  } {
    const view = this.get(userId);
    return {
      revision: view.revision,
      count: view.items.length,
      limit: view.limit,
      next: view.items[0] ?? null,
    };
  }

  countForUser(userId: number): number {    const row = this.db
      .select({ value: sql<number>`COUNT(*)` })
      .from(podcastQueueItems)
      .where(eq(podcastQueueItems.userId, userId))
      .get();
    return Number(row?.value ?? 0);
  }

  add(
    userId: number,
    episodeId: number,
    position: QueueInsertPosition = "end",
  ): PodcastQueueView {
    this.catalog.getEpisodeRow(episodeId);

    return this.db.transaction((tx) => {
      const state = this.ensureState(userId);

      const existing = tx
        .select({ position: podcastQueueItems.position })
        .from(podcastQueueItems)
        .where(
          and(
            eq(podcastQueueItems.userId, userId),
            eq(podcastQueueItems.episodeId, episodeId),
          ),
        )
        .get();
      if (existing) {
        const now = this.now();
        let moved = false;

        if (position === "next" && existing.position !== 0) {
          tx.update(podcastQueueItems)
            .set({ position: sql`${podcastQueueItems.position} + 1` })
            .where(eq(podcastQueueItems.userId, userId))
            .run();
          tx.update(podcastQueueItems)
            .set({ position: 0 })
            .where(
              and(
                eq(podcastQueueItems.userId, userId),
                eq(podcastQueueItems.episodeId, episodeId),
              ),
            )
            .run();
          moved = true;
        } else if (position === "end") {
          const maxRow = tx
            .select({ value: max(podcastQueueItems.position) })
            .from(podcastQueueItems)
            .where(eq(podcastQueueItems.userId, userId))
            .get();
          const lastPosition = Number(maxRow?.value ?? -1);
          if (existing.position !== lastPosition) {
            tx.update(podcastQueueItems)
              .set({ position: lastPosition + 1 })
              .where(
                and(
                  eq(podcastQueueItems.userId, userId),
                  eq(podcastQueueItems.episodeId, episodeId),
                ),
              )
              .run();
            moved = true;
          }
        }

        if (moved) {
          tx.update(podcastQueueState)
            .set({ revision: sql`${podcastQueueState.revision} + 1`, updatedAt: now })
            .where(eq(podcastQueueState.userId, state.userId))
            .run();
        }

        return this.get(userId);
      }

      const countRow = tx
        .select({ value: sql<number>`COUNT(*)` })
        .from(podcastQueueItems)
        .where(eq(podcastQueueItems.userId, userId))
        .get();
      if (Number(countRow?.value ?? 0) >= this.config.podcastQueueMax) {
        throw badRequest(
          "QUEUE_LIMIT_REACHED",
          `La cola de podcasts permite un maximo de ${this.config.podcastQueueMax} episodios`,
        );
      }

      const now = this.now();

      if (position === "next") {
        tx.update(podcastQueueItems)
          .set({ position: sql`${podcastQueueItems.position} + 1` })
          .where(eq(podcastQueueItems.userId, userId))
          .run();
        tx.insert(podcastQueueItems)
          .values({ userId, episodeId, position: 0, addedAt: now })
          .run();
      } else {
        const maxRow = tx
          .select({ value: max(podcastQueueItems.position) })
          .from(podcastQueueItems)
          .where(eq(podcastQueueItems.userId, userId))
          .get();
        const nextPosition = Number(maxRow?.value ?? -1) + 1;
        tx.insert(podcastQueueItems)
          .values({ userId, episodeId, position: nextPosition, addedAt: now })
          .run();
      }

      tx.update(podcastQueueState)
        .set({ revision: sql`${podcastQueueState.revision} + 1`, updatedAt: now })
        .where(eq(podcastQueueState.userId, state.userId))
        .run();

      return this.get(userId);
    });
  }

  clear(userId: number, keepEpisodeId?: number): PodcastQueueView {
    const state = this.ensureState(userId);
    const now = this.now();

    this.db.transaction((tx) => {
      const kept =
        keepEpisodeId === undefined
          ? undefined
          : tx
              .select({ episodeId: podcastQueueItems.episodeId })
              .from(podcastQueueItems)
              .where(
                and(
                  eq(podcastQueueItems.userId, userId),
                  eq(podcastQueueItems.episodeId, keepEpisodeId),
                ),
              )
              .get();

      if (!kept || keepEpisodeId === undefined) {
        tx.delete(podcastQueueItems)
          .where(eq(podcastQueueItems.userId, userId))
          .run();
      } else {
        tx.delete(podcastQueueItems)
          .where(
            and(
              eq(podcastQueueItems.userId, userId),
              ne(podcastQueueItems.episodeId, keepEpisodeId),
            ),
          )
          .run();
        tx.update(podcastQueueItems)
          .set({ position: 0 })
          .where(
            and(
              eq(podcastQueueItems.userId, userId),
              eq(podcastQueueItems.episodeId, keepEpisodeId),
            ),
          )
          .run();
      }

      tx.update(podcastQueueState)
        .set({ revision: sql`${podcastQueueState.revision} + 1`, updatedAt: now })
        .where(eq(podcastQueueState.userId, state.userId))
        .run();
    });

    return this.get(userId);
  }

  remove(userId: number, episodeId: number): PodcastQueueView {
    const state = this.ensureState(userId);
    const now = this.now();
    this.db.transaction((tx) => {
      tx.delete(podcastQueueItems)
        .where(
          and(
            eq(podcastQueueItems.userId, userId),
            eq(podcastQueueItems.episodeId, episodeId),
          ),
        )
        .run();
      tx.update(podcastQueueState)
        .set({ revision: sql`${podcastQueueState.revision} + 1`, updatedAt: now })
        .where(eq(podcastQueueState.userId, state.userId))
        .run();
    });
    return this.get(userId);
  }

  reorder(userId: number, baseRevision: number, episodeIds: number[]): PodcastQueueView {
    const state = this.ensureState(userId);
    if (state.revision !== baseRevision) {
      throw conflict(
        "QUEUE_CONFLICT",
        "La cola se ha modificado en otra sesion; recarga para continuar",
      );
    }

    const unique = new Set(episodeIds);
    if (unique.size !== episodeIds.length) {
      throw badRequest("VALIDATION_ERROR", "La cola no puede contener episodios duplicados");
    }

    const current = this.db
      .select({ episodeId: podcastQueueItems.episodeId })
      .from(podcastQueueItems)
      .where(eq(podcastQueueItems.userId, userId))
      .all()
      .map((r) => r.episodeId);

    if (current.length !== episodeIds.length) {
      throw badRequest(
        "QUEUE_MISMATCH",
        "El orden enviado debe incluir exactamente los episodios de la cola",
      );
    }
    const currentSet = new Set(current);
    for (const id of episodeIds) {
      if (!currentSet.has(id)) {
        throw badRequest(
          "QUEUE_MISMATCH",
          "El orden enviado debe incluir exactamente los episodios de la cola",
        );
      }
    }

    const now = this.now();
    this.db.transaction((tx) => {
      episodeIds.forEach((episodeId, index) => {
        tx.update(podcastQueueItems)
          .set({ position: index })
          .where(
            and(
              eq(podcastQueueItems.userId, userId),
              eq(podcastQueueItems.episodeId, episodeId),
            ),
          )
          .run();
      });
      tx.update(podcastQueueState)
        .set({ revision: sql`${podcastQueueState.revision} + 1`, updatedAt: now })
        .where(eq(podcastQueueState.userId, state.userId))
        .run();
    });

    return this.get(userId);
  }
}
