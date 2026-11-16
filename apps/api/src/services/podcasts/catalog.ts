import { and, asc, count, desc, eq, gt, isNull, notInArray, sql } from "drizzle-orm";
import type { Config } from "../../config/env.js";
import type { DB } from "../../db/client.js";
import {
  podcastEpisodes,
  podcastProgress,
  podcasts,
  podcastSubscriptions,
} from "../../db/schema.js";
import { badRequest, notFound } from "../../errors.js";
import { fetchAndParsePodcastFeed } from "./feedFetcher.js";
import { resolveSafeHttpUrl, type ParsedPodcastFeed } from "./feedParser.js";

export interface PodcastSummary {
  id: number;
  feedUrl: string;
  title: string;
  author: string | null;
  description: string | null;
  imageUrl: string | null;
  language: string | null;
  link: string | null;
  categories: string[];
  lastFetchedAt: number | null;
  episodeCount: number;
  isSubscribed: boolean;
  subscribedAt?: number | null;
  /** Solo en el listado de suscripciones: publicación del episodio pendiente más reciente. */
  latestPendingEpisodeAt?: number | null;
}

export interface PodcastEpisodeProgressView {
  positionSec: number;
  durationSec: number | null;
  completed: boolean;
  completedAt: number | null;
  updatedAt: number;
}

export interface PodcastEpisodeItem {
  id: number;
  podcastId: number;
  title: string;
  description: string | null;
  publishedAt: number | null;
  durationSec: number | null;
  imageUrl: string | null;
  episodeNumber: number | null;
  seasonNumber: number | null;
  explicit: boolean;
  progress: PodcastEpisodeProgressView | null;
  isFavorite?: boolean;
}

export type EpisodeSort = "recent" | "title" | "duration";
export type EpisodeFilter = "all" | "unplayed" | "in_progress" | "completed";

export interface ListEpisodesParams {
  sort?: EpisodeSort;
  filter?: EpisodeFilter;
  offset?: number;
  limit?: number;
}

export interface PodcastHomeView {
  continueListening: PodcastEpisodeItem[];
  latestEpisodes: PodcastEpisodeItem[];
  subscriptions: PodcastSummary[];
}

export interface PodcastHomeLimits {
  continueLimit?: number;
  latestLimit?: number;
  subscriptionLimit?: number;
}

const STALE_FEED_MS = 60 * 60 * 1000; // 1 hora

function parseCategoriesJson(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function clampLimit(raw: number | undefined, fallback: number, max: number): number {
  const value = raw === undefined || !Number.isFinite(raw) ? fallback : Math.trunc(raw);
  return Math.min(max, Math.max(0, value));
}

export function toEpisodeItem(
  row: typeof podcastEpisodes.$inferSelect,
  progress: PodcastEpisodeProgressView | null = null,
  isFavorite = false,
): PodcastEpisodeItem {
  return {
    id: row.id,
    podcastId: row.podcastId,
    title: row.title,
    description: row.description,
    publishedAt: row.publishedAt,
    durationSec: row.durationSec,
    imageUrl: row.imageUrl,
    episodeNumber: row.episodeNumber,
    seasonNumber: row.seasonNumber,
    explicit: Boolean(row.explicit),
    progress,
    isFavorite,
  };
}

export class PodcastCatalogService {
  constructor(
    private readonly db: DB,
    private readonly config: Config,
    private readonly now: () => number = Date.now,
  ) {}

  toSummary(
    row: typeof podcasts.$inferSelect,
    opts: { episodeCount?: number; isSubscribed?: boolean; subscribedAt?: number | null } = {},
  ): PodcastSummary {
    return {
      id: row.id,
      feedUrl: row.feedUrl,
      title: row.title,
      author: row.author,
      description: row.description,
      imageUrl: row.imageUrl,
      language: row.language,
      link: row.link,
      categories: parseCategoriesJson(row.categories),
      lastFetchedAt: row.lastFetchedAt,
      episodeCount: opts.episodeCount ?? this.countActiveEpisodes(row.id),
      isSubscribed: opts.isSubscribed ?? false,
      ...(opts.subscribedAt !== undefined ? { subscribedAt: opts.subscribedAt } : {}),
    };
  }

  countActiveEpisodes(podcastId: number): number {
    const row = this.db
      .select({ value: count() })
      .from(podcastEpisodes)
      .where(and(eq(podcastEpisodes.podcastId, podcastId), isNull(podcastEpisodes.removedAt)))
      .get();
    return Number(row?.value ?? 0);
  }

  isUserSubscribed(userId: number, podcastId: number): boolean {
    const row = this.db
      .select({ podcastId: podcastSubscriptions.podcastId })
      .from(podcastSubscriptions)
      .where(
        and(
          eq(podcastSubscriptions.userId, userId),
          eq(podcastSubscriptions.podcastId, podcastId),
        ),
      )
      .get();
    return Boolean(row);
  }

  getPodcastRow(podcastId: number): typeof podcasts.$inferSelect {
    const row = this.db.select().from(podcasts).where(eq(podcasts.id, podcastId)).get();
    if (!row) {
      throw notFound("PODCAST_NOT_FOUND", "El podcast no existe");
    }
    return row;
  }

  getEpisodeRow(episodeId: number): typeof podcastEpisodes.$inferSelect {
    const row = this.db
      .select()
      .from(podcastEpisodes)
      .where(eq(podcastEpisodes.id, episodeId))
      .get();
    if (!row) {
      throw notFound("EPISODE_NOT_FOUND", "El episodio no existe");
    }
    return row;
  }

  async resolveAndIngestFeed(
    rawFeedUrl: string,
    options: { force?: boolean } = {},
  ): Promise<typeof podcasts.$inferSelect> {
    const normalizedUrl = resolveSafeHttpUrl(rawFeedUrl);
    if (!normalizedUrl) {
      throw badRequest("FEED_INVALID_URL", "La URL del feed no es valida");
    }

    const existing = this.db
      .select()
      .from(podcasts)
      .where(eq(podcasts.feedUrl, normalizedUrl))
      .get();

    const now = this.now();
    if (
      existing &&
      !options.force &&
      existing.lastFetchedAt &&
      now - existing.lastFetchedAt < STALE_FEED_MS
    ) {
      return existing;
    }

    try {
      const fetched = await fetchAndParsePodcastFeed(normalizedUrl, {
        etag: existing?.etag ?? null,
        lastModified: existing?.lastModified ?? null,
        maxBytes: this.config.podcastFeedMaxBytes,
        userAgent: this.config.radioBrowserAppName,
      });

      if (fetched.notModified && existing) {
        this.db
          .update(podcasts)
          .set({
            lastFetchedAt: now,
            etag: fetched.etag,
            lastModified: fetched.lastModified,
            lastError: null,
            errorCount: 0,
          })
          .where(eq(podcasts.id, existing.id))
          .run();
        return this.getPodcastRow(existing.id);
      }

      if (!fetched.notModified) {
        return this.persistParsedFeed(normalizedUrl, fetched.feed, {
          etag: fetched.etag,
          lastModified: fetched.lastModified,
          now,
        });
      }
    } catch (err) {
      if (existing) {
        const message = err instanceof Error ? err.message : "Error al refrescar el feed";
        this.db
          .update(podcasts)
          .set({
            lastError: message.slice(0, 500),
            errorCount: sql`${podcasts.errorCount} + 1`,
          })
          .where(eq(podcasts.id, existing.id))
          .run();
      }
      throw err;
    }

    throw badRequest("FEED_INVALID", "No se pudo resolver el feed");
  }

  persistParsedFeed(
    feedUrl: string,
    parsed: ParsedPodcastFeed,
    meta: { etag: string | null; lastModified: string | null; now?: number },
  ): typeof podcasts.$inferSelect {
    const now = meta.now ?? this.now();
    const maxEpisodes = this.config.podcastMaxEpisodesPerFeed;
    const sortedEpisodes = [...parsed.episodes]
      .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
      .slice(0, maxEpisodes);

    return this.db.transaction((tx) => {
      let podcast = tx.select().from(podcasts).where(eq(podcasts.feedUrl, feedUrl)).get();

      if (!podcast) {
        podcast = tx
          .insert(podcasts)
          .values({
            feedUrl,
            title: parsed.title,
            author: parsed.author,
            description: parsed.description,
            imageUrl: parsed.imageUrl,
            language: parsed.language,
            link: parsed.link,
            categories: JSON.stringify(parsed.categories),
            lastFetchedAt: now,
            etag: meta.etag,
            lastModified: meta.lastModified,
            lastError: null,
            errorCount: 0,
            createdAt: now,
          })
          .returning()
          .get();
      } else {
        podcast = tx
          .update(podcasts)
          .set({
            title: parsed.title,
            author: parsed.author,
            description: parsed.description,
            imageUrl: parsed.imageUrl ?? podcast.imageUrl,
            language: parsed.language ?? podcast.language,
            link: parsed.link ?? podcast.link,
            categories: JSON.stringify(parsed.categories),
            lastFetchedAt: now,
            etag: meta.etag,
            lastModified: meta.lastModified,
            lastError: null,
            errorCount: 0,
          })
          .where(eq(podcasts.id, podcast.id))
          .returning()
          .get()!;
      }

      const seenGuids: string[] = [];
      for (const ep of sortedEpisodes) {
        seenGuids.push(ep.guid);
        tx.insert(podcastEpisodes)
          .values({
            podcastId: podcast.id,
            guid: ep.guid,
            title: ep.title,
            description: ep.description,
            audioUrl: ep.audioUrl,
            publishedAt: ep.publishedAt,
            durationSec: ep.durationSec,
            imageUrl: ep.imageUrl ?? podcast.imageUrl,
            episodeNumber: ep.episodeNumber,
            seasonNumber: ep.seasonNumber,
            explicit: ep.explicit ? 1 : 0,
            lastSeenAt: now,
            removedAt: null,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: [podcastEpisodes.podcastId, podcastEpisodes.guid],
            set: {
              title: ep.title,
              description: ep.description,
              audioUrl: ep.audioUrl,
              publishedAt: ep.publishedAt,
              durationSec: ep.durationSec,
              imageUrl: ep.imageUrl ?? podcast.imageUrl,
              episodeNumber: ep.episodeNumber,
              seasonNumber: ep.seasonNumber,
              explicit: ep.explicit ? 1 : 0,
              lastSeenAt: now,
              removedAt: null,
            },
          })
          .run();
      }

      if (seenGuids.length > 0) {
        tx.update(podcastEpisodes)
          .set({ removedAt: now })
          .where(
            and(
              eq(podcastEpisodes.podcastId, podcast.id),
              isNull(podcastEpisodes.removedAt),
              notInArray(podcastEpisodes.guid, seenGuids),
            ),
          )
          .run();
      }

      this.pruneExcessEpisodesInTx(tx, podcast.id, maxEpisodes);
      return podcast;
    });
  }

  private pruneExcessEpisodesInTx(
    tx: Parameters<Parameters<DB["transaction"]>[0]>[0],
    podcastId: number,
    maxEpisodes: number,
  ): void {
    const allIds = tx
      .select({ id: podcastEpisodes.id })
      .from(podcastEpisodes)
      .where(eq(podcastEpisodes.podcastId, podcastId))
      .orderBy(desc(podcastEpisodes.publishedAt), desc(podcastEpisodes.id))
      .all()
      .map((r) => r.id);

    if (allIds.length <= maxEpisodes) return;
    const candidates = allIds.slice(maxEpisodes);
    const protectedIds = new Set<number>();

    const refTables = [
      "podcast_progress",
      "podcast_favorites",
      "podcast_queue_items",
      "podcast_listen_sessions",
      "user_podcast_stats_hourly",
    ];
    for (const tableName of refTables) {
      try {
        const exists = tx.get<{ name: string }>(
          sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${tableName}`,
        );
        if (!exists) continue;
        const rows = tx.all<{ episode_id: number }>(
          sql.raw(
            `SELECT DISTINCT episode_id FROM ${tableName} WHERE episode_id IN (${candidates.join(",")})`,
          ),
        );
        for (const r of rows) protectedIds.add(Number(r.episode_id));
      } catch {
        // Tabla aún no creada en migraciones tempranas
      }
    }

    for (const candidateId of candidates) {
      if (protectedIds.has(candidateId)) continue;
      tx.delete(podcastEpisodes).where(eq(podcastEpisodes.id, candidateId)).run();
    }
  }

  getPodcastForUser(podcastId: number, userId: number): PodcastSummary {
    const row = this.getPodcastRow(podcastId);
    const isSubscribed = this.isUserSubscribed(userId, podcastId);
    return this.toSummary(row, { isSubscribed });
  }

  home(userId: number, limits: PodcastHomeLimits = {}): PodcastHomeView {
    const continueLimit = clampLimit(limits.continueLimit, 20, 50);
    const latestLimit = clampLimit(limits.latestLimit, 30, 100);
    const subscriptionLimit = clampLimit(limits.subscriptionLimit, 100, 200);

    const continueRows =
      continueLimit === 0 || !this.hasTable("podcast_progress")
        ? []
        : this.db
            .select({ episode: podcastEpisodes })
            .from(podcastProgress)
            .innerJoin(podcastEpisodes, eq(podcastProgress.episodeId, podcastEpisodes.id))
            .where(
              and(
                eq(podcastProgress.userId, userId),
                isNull(podcastProgress.completedAt),
                isNull(podcastProgress.dismissedAt),
                gt(podcastProgress.positionSec, 0),
                isNull(podcastEpisodes.removedAt),
              ),
            )
            .orderBy(desc(podcastProgress.updatedAt), desc(podcastProgress.episodeId))
            .limit(continueLimit)
            .all();

    const latestRows =
      latestLimit === 0
        ? []
        : this.db
            .select({ episode: podcastEpisodes })
            .from(podcastEpisodes)
            .innerJoin(
              podcastSubscriptions,
              eq(podcastEpisodes.podcastId, podcastSubscriptions.podcastId),
            )
            .where(
              and(
                eq(podcastSubscriptions.userId, userId),
                isNull(podcastEpisodes.removedAt),
              ),
            )
            .orderBy(desc(podcastEpisodes.publishedAt), desc(podcastEpisodes.id))
            .limit(latestLimit)
            .all();

    const subscriptionRows =
      subscriptionLimit === 0
        ? []
        : this.db
            .select({ podcast: podcasts, subscribedAt: podcastSubscriptions.subscribedAt })
            .from(podcastSubscriptions)
            .innerJoin(podcasts, eq(podcastSubscriptions.podcastId, podcasts.id))
            .where(eq(podcastSubscriptions.userId, userId))
            .orderBy(desc(podcastSubscriptions.subscribedAt))
            .limit(subscriptionLimit)
            .all();

    const episodeIds = [
      ...new Set([
        ...continueRows.map((r) => r.episode.id),
        ...latestRows.map((r) => r.episode.id),
      ]),
    ];
    const progressMap = this.loadUserProgressMap(userId, episodeIds);
    const favoritesSet = this.loadUserFavoritesSet(userId, episodeIds);

    return {
      continueListening: continueRows.map((r) =>
        toEpisodeItem(
          r.episode,
          progressMap.get(r.episode.id) ?? null,
          favoritesSet.has(r.episode.id),
        ),
      ),
      latestEpisodes: latestRows.map((r) =>
        toEpisodeItem(
          r.episode,
          progressMap.get(r.episode.id) ?? null,
          favoritesSet.has(r.episode.id),
        ),
      ),
      subscriptions: subscriptionRows.map((r) =>
        this.toSummary(r.podcast, { isSubscribed: true, subscribedAt: r.subscribedAt }),
      ),
    };
  }

  private hasTable(name: string): boolean {
    try {
      const row = this.db.get<{ name: string }>(
        sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${name}`,
      );
      return Boolean(row);
    } catch {
      return false;
    }
  }

  listEpisodesForUser(
    podcastId: number,
    _userId: number,
    params: ListEpisodesParams = {},
  ): {
    items: PodcastEpisodeItem[];
    pagination: { offset: number; limit: number; hasMore: boolean };
  } {
    this.getPodcastRow(podcastId);
    const sort: EpisodeSort = params.sort ?? "recent";
    const filter: EpisodeFilter = params.filter ?? "all";
    const offset = Math.max(0, Math.trunc(params.offset ?? 0));
    const limit = Math.min(
      100,
      Math.max(1, Math.trunc(params.limit ?? this.config.podcastEpisodesPageSize)),
    );

    const orderBy =
      sort === "title"
        ? [asc(podcastEpisodes.title), desc(podcastEpisodes.id)]
        : sort === "duration"
          ? [desc(podcastEpisodes.durationSec), desc(podcastEpisodes.id)]
          : [desc(podcastEpisodes.publishedAt), desc(podcastEpisodes.id)];

    const allRows = this.db
      .select()
      .from(podcastEpisodes)
      .where(and(eq(podcastEpisodes.podcastId, podcastId), isNull(podcastEpisodes.removedAt)))
      .orderBy(...orderBy)
      .all();

    const progressMap = this.loadUserProgressMap(_userId, allRows.map((r) => r.id));
    const favoritesSet = this.loadUserFavoritesSet(_userId, allRows.map((r) => r.id));

    const filtered = allRows.filter((row) => {
      if (filter === "all") return true;
      const prog = progressMap.get(row.id);
      if (filter === "completed") return Boolean(prog?.completed);
      if (filter === "in_progress") return Boolean(prog && !prog.completed && prog.positionSec > 0);
      if (filter === "unplayed") return !prog || (!prog.completed && prog.positionSec === 0);
      return true;
    });

    const slice = filtered.slice(offset, offset + limit);
    const hasMore = offset + limit < filtered.length;

    return {
      items: slice.map((r) =>
        toEpisodeItem(r, progressMap.get(r.id) ?? null, favoritesSet.has(r.id)),
      ),
      pagination: { offset, limit, hasMore },
    };
  }

  loadUserProgressMap(
    userId: number,
    episodeIds: number[],
  ): Map<number, PodcastEpisodeProgressView> {
    const map = new Map<number, PodcastEpisodeProgressView>();
    if (episodeIds.length === 0) return map;
    try {
      const exists = this.db.get<{ name: string }>(
        sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'podcast_progress'`,
      );
      if (!exists) return map;
      const rows = this.db.all<{
        episode_id: number;
        position_sec: number;
        duration_sec: number | null;
        completed_at: number | null;
        updated_at: number;
      }>(
        sql.raw(
          `SELECT episode_id, position_sec, duration_sec, completed_at, updated_at FROM podcast_progress WHERE user_id = ${Number(userId)} AND episode_id IN (${episodeIds.map(Number).join(",")})`,
        ),
      );
      for (const r of rows) {
        map.set(Number(r.episode_id), {
          positionSec: Number(r.position_sec),
          durationSec: r.duration_sec !== null ? Number(r.duration_sec) : null,
          completed: r.completed_at !== null,
          completedAt: r.completed_at !== null ? Number(r.completed_at) : null,
          updatedAt: Number(r.updated_at),
        });
      }
    } catch {
      // Tabla podcast_progress se añade en el Change 2
    }
    return map;
  }

  loadUserFavoritesSet(userId: number, episodeIds: number[]): Set<number> {
    const set = new Set<number>();
    if (episodeIds.length === 0) return set;
    try {
      const exists = this.db.get<{ name: string }>(
        sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'podcast_favorites'`,
      );
      if (!exists) return set;
      const rows = this.db.all<{ episode_id: number }>(
        sql.raw(
          `SELECT episode_id FROM podcast_favorites WHERE user_id = ${Number(userId)} AND episode_id IN (${episodeIds.map(Number).join(",")})`,
        ),
      );
      for (const r of rows) set.add(Number(r.episode_id));
    } catch {
      // Tabla podcast_favorites se añade en el Change 3
    }
    return set;
  }
}
