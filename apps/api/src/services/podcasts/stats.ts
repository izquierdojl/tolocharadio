import { and, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type { Config } from "../../config/env.js";
import type { DB } from "../../db/client.js";
import {
  podcastEpisodes,
  podcastListenSessions,
  podcastProgress,
  podcasts,
  userPodcastStatsHourly,
} from "../../db/schema.js";
import {
  bucketKey,
  sortEntries,
  zeroFill,
  type StatsRange,
  type TimelineEntry,
  type TimelineGranularity,
} from "../../lib/statsQuery.js";
import { isoWeekday, zonedBucket, zonedDayBounds } from "../../lib/time.js";

/// Un episodio cuenta como empezado tras 30 s de contenido acumulado.
export const PODCAST_STARTED_THRESHOLD_MS = 30_000;

export const UNKNOWN_PODCAST_CATEGORY = "desconocido";

const DAY_MS = 86_400_000;
const PURGE_INTERVAL_MS = DAY_MS;

export interface PodcastStatsSummary {
  totalMs: number;
  episodesStarted: number;
  episodesCompleted: number;
  completionRate: number;
  podcastsCount: number;
  averageEpisodeMs: number;
}

export interface TopPodcastEntry {
  podcastId: number;
  title: string;
  author: string | null;
  imageUrl: string | null;
  totalMs: number;
  episodesStarted: number;
  episodesCompleted: number;
}

export interface TopEpisodeEntry {
  episodeId: number;
  podcastId: number;
  title: string;
  podcastTitle: string;
  imageUrl: string | null;
  totalMs: number;
  completed: boolean;
}

export interface PodcastCategoryEntry {
  category: string;
  totalMs: number;
}

export interface RecentPodcastEntry {
  episodeId: number;
  podcastId: number;
  episodeTitle: string;
  podcastTitle: string;
  imageUrl: string | null;
  startedAt: number;
  endedAt: number;
  listenedMs: number;
  positionSec: number | null;
  durationSec: number | null;
  completed: boolean;
}

function parseCategories(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string" && value.trim() !== "")
      : [];
  } catch {
    return [];
  }
}

export class PodcastStatsService {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DB,
    private readonly config: Config,
    private readonly now: () => number = Date.now,
  ) {}

  start(): void {
    if (this.timer) return;
    this.purgeRetention();
    this.timer = setInterval(() => this.purgeRetention(), PURGE_INTERVAL_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /// Borra sesiones detalladas fuera de retención; los agregados horarios se conservan.
  purgeRetention(): number {
    const cutoff = this.now() - this.config.podcastStatsRetentionDays * DAY_MS;
    const result = this.db
      .delete(podcastListenSessions)
      .where(lt(podcastListenSessions.startedAt, cutoff))
      .run();
    return result.changes;
  }

  summary(userId: number, range: StatsRange): PodcastStatsSummary {
    const totalMs = this.totalMs(userId, range);
    const episodesStarted = this.startedEpisodeIds(userId, range).length;
    const episodesCompleted = this.completedEpisodeCount(userId, range);
    const podcastsCount = this.db
      .select({ podcastId: podcastListenSessions.podcastId })
      .from(podcastListenSessions)
      .where(and(...this.sessionConditions(userId, range)))
      .groupBy(podcastListenSessions.podcastId)
      .all().length;

    return {
      totalMs,
      episodesStarted,
      episodesCompleted,
      completionRate:
        episodesStarted > 0 ? Math.min(1, episodesCompleted / episodesStarted) : 0,
      podcastsCount,
      averageEpisodeMs: episodesStarted > 0 ? Math.round(totalMs / episodesStarted) : 0,
    };
  }

  topPodcasts(userId: number, range: StatsRange, limit: number): TopPodcastEntry[] {
    const totalMs = sql<number>`sum(${userPodcastStatsHourly.totalMs})`;
    const rows = this.db
      .select({ podcastId: userPodcastStatsHourly.podcastId, totalMs })
      .from(userPodcastStatsHourly)
      .where(this.bucketWhere(userId, range))
      .groupBy(userPodcastStatsHourly.podcastId)
      .orderBy(desc(totalMs))
      .limit(limit)
      .all();

    if (rows.length === 0) return [];

    const podcastIds = rows.map((row) => row.podcastId);
    const podcastsById = new Map(
      this.db
        .select()
        .from(podcasts)
        .where(inArray(podcasts.id, podcastIds))
        .all()
        .map((podcast) => [podcast.id, podcast]),
    );

    const startedByPodcast = this.startedCountByPodcast(userId, range);
    const completedByPodcast = this.completedCountByPodcast(userId, range);

    return rows.flatMap((row) => {
      const podcast = podcastsById.get(row.podcastId);
      if (!podcast) return [];
      return [
        {
          podcastId: podcast.id,
          title: podcast.title,
          author: podcast.author,
          imageUrl: podcast.imageUrl,
          totalMs: Number(row.totalMs),
          episodesStarted: startedByPodcast.get(podcast.id) ?? 0,
          episodesCompleted: completedByPodcast.get(podcast.id) ?? 0,
        },
      ];
    });
  }

  topEpisodes(userId: number, range: StatsRange, limit: number): TopEpisodeEntry[] {
    const totalMs = sql<number>`sum(${userPodcastStatsHourly.totalMs})`;
    const rows = this.db
      .select({
        episodeId: userPodcastStatsHourly.episodeId,
        podcastId: userPodcastStatsHourly.podcastId,
        title: podcastEpisodes.title,
        imageUrl: podcastEpisodes.imageUrl,
        podcastImageUrl: podcasts.imageUrl,
        podcastTitle: podcasts.title,
        totalMs,
      })
      .from(userPodcastStatsHourly)
      .innerJoin(
        podcastEpisodes,
        eq(userPodcastStatsHourly.episodeId, podcastEpisodes.id),
      )
      .innerJoin(podcasts, eq(userPodcastStatsHourly.podcastId, podcasts.id))
      .where(this.bucketWhere(userId, range))
      .groupBy(
        userPodcastStatsHourly.episodeId,
        userPodcastStatsHourly.podcastId,
        podcastEpisodes.title,
        podcastEpisodes.imageUrl,
        podcasts.imageUrl,
        podcasts.title,
      )
      .orderBy(desc(totalMs))
      .limit(limit)
      .all();

    const completed = this.completedEpisodeIds(
      userId,
      rows.map((row) => row.episodeId),
    );

    return rows.map((row) => ({
      episodeId: row.episodeId,
      podcastId: row.podcastId,
      title: row.title,
      podcastTitle: row.podcastTitle,
      imageUrl: row.imageUrl ?? row.podcastImageUrl,
      totalMs: Number(row.totalMs),
      completed: completed.has(row.episodeId),
    }));
  }

  timeline(
    userId: number,
    range: StatsRange,
    granularity: TimelineGranularity,
  ): TimelineEntry[] {
    const totalMs = sql<number>`sum(${userPodcastStatsHourly.totalMs})`;
    const rows = this.db
      .select({ bucket: userPodcastStatsHourly.bucket, totalMs })
      .from(userPodcastStatsHourly)
      .where(this.bucketWhere(userId, range))
      .groupBy(userPodcastStatsHourly.bucket)
      .all();

    const totals = new Map<string, number>();
    let firstDay: string | null = null;
    let lastDay: string | null = null;
    for (const row of rows) {
      const key = bucketKey(row.bucket, granularity);
      totals.set(key, (totals.get(key) ?? 0) + Number(row.totalMs));
      const day = row.bucket.slice(0, 10);
      if (firstDay === null || day < firstDay) firstDay = day;
      if (lastDay === null || day > lastDay) lastDay = day;
    }

    const startDay = range.from ?? firstDay;
    const endDay = range.to ?? lastDay;
    if (!startDay || !endDay) return [];
    return zeroFill(startDay, endDay, granularity, totals);
  }

  habits(userId: number, range: StatsRange): Array<{ weekday: number; hour: number; totalMs: number }> {
    const totalMs = sql<number>`sum(${userPodcastStatsHourly.totalMs})`;
    const rows = this.db
      .select({ bucket: userPodcastStatsHourly.bucket, totalMs })
      .from(userPodcastStatsHourly)
      .where(this.bucketWhere(userId, range))
      .groupBy(userPodcastStatsHourly.bucket)
      .all();

    const totals = new Map<string, number>();
    for (const row of rows) {
      const day = row.bucket.slice(0, 10);
      const hour = Number(row.bucket.slice(11, 13));
      const key = `${isoWeekday(day)}:${hour}`;
      totals.set(key, (totals.get(key) ?? 0) + Number(row.totalMs));
    }

    return [...totals.entries()]
      .map(([key, total]) => {
        const [weekday, hour] = key.split(":").map(Number);
        return { weekday: weekday!, hour: hour!, totalMs: total };
      })
      .sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
  }

  categories(userId: number, range: StatsRange, limit: number): PodcastCategoryEntry[] {
    const totalMs = sql<number>`sum(${userPodcastStatsHourly.totalMs})`;
    const rows = this.db
      .select({ podcastId: userPodcastStatsHourly.podcastId, totalMs })
      .from(userPodcastStatsHourly)
      .where(this.bucketWhere(userId, range))
      .groupBy(userPodcastStatsHourly.podcastId)
      .all();

    if (rows.length === 0) return [];

    const podcastsById = new Map(
      this.db
        .select({
          id: podcasts.id,
          categories: podcasts.categories,
        })
        .from(podcasts)
        .where(
          inArray(
            podcasts.id,
            rows.map((row) => row.podcastId),
          ),
        )
        .all()
        .map((podcast) => [podcast.id, podcast.categories]),
    );

    const totals = new Map<string, number>();
    for (const row of rows) {
      const categories = parseCategories(podcastsById.get(row.podcastId));
      const ms = Number(row.totalMs);
      if (categories.length === 0) {
        totals.set(
          UNKNOWN_PODCAST_CATEGORY,
          (totals.get(UNKNOWN_PODCAST_CATEGORY) ?? 0) + ms,
        );
        continue;
      }
      for (const category of categories) {
        totals.set(category, (totals.get(category) ?? 0) + ms);
      }
    }

    return sortEntries(
      [...totals.entries()].map(([category, ms]) => ({ category, totalMs: ms })),
    ).slice(0, limit);
  }

  recent(userId: number, limit: number): RecentPodcastEntry[] {
    return this.db
      .select({
        episodeId: podcastListenSessions.episodeId,
        podcastId: podcastListenSessions.podcastId,
        episodeTitle: podcastEpisodes.title,
        imageUrl: podcastEpisodes.imageUrl,
        podcastImageUrl: podcasts.imageUrl,
        podcastTitle: podcasts.title,
        startedAt: podcastListenSessions.startedAt,
        endedAt: podcastListenSessions.endedAt,
        listenedMs: podcastListenSessions.listenedMs,
        positionSec: podcastListenSessions.lastPositionSec,
        durationSec: podcastListenSessions.durationSec,
        completed: podcastListenSessions.completed,
      })
      .from(podcastListenSessions)
      .innerJoin(podcastEpisodes, eq(podcastListenSessions.episodeId, podcastEpisodes.id))
      .innerJoin(podcasts, eq(podcastListenSessions.podcastId, podcasts.id))
      .where(eq(podcastListenSessions.userId, userId))
      .orderBy(desc(podcastListenSessions.startedAt))
      .limit(limit)
      .all()
      .map((row) => ({
        episodeId: row.episodeId,
        podcastId: row.podcastId,
        episodeTitle: row.episodeTitle,
        podcastTitle: row.podcastTitle,
        imageUrl: row.imageUrl ?? row.podcastImageUrl,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        listenedMs: row.listenedMs,
        positionSec: row.positionSec,
        durationSec: row.durationSec,
        completed: row.completed === 1,
      }));
  }

  private totalMs(userId: number, range: StatsRange): number {
    const totalMs = sql<number>`sum(${userPodcastStatsHourly.totalMs})`;
    const row = this.db
      .select({ totalMs })
      .from(userPodcastStatsHourly)
      .where(this.bucketWhere(userId, range))
      .get();
    return Number(row?.totalMs ?? 0);
  }

  private startedEpisodeIds(userId: number, range: StatsRange): number[] {
    return this.db
      .select({ episodeId: podcastListenSessions.episodeId })
      .from(podcastListenSessions)
      .where(and(...this.sessionConditions(userId, range)))
      .groupBy(podcastListenSessions.episodeId)
      .having(sql`sum(${podcastListenSessions.listenedMs}) >= ${PODCAST_STARTED_THRESHOLD_MS}`)
      .all()
      .map((row) => row.episodeId);
  }

  private completedEpisodeCount(userId: number, range: StatsRange): number {
    return this.db
      .select({ episodeId: podcastListenSessions.episodeId })
      .from(podcastListenSessions)
      .where(
        and(
          ...this.sessionConditions(userId, range),
          eq(podcastListenSessions.completed, 1),
        ),
      )
      .groupBy(podcastListenSessions.episodeId)
      .all().length;
  }

  private startedCountByPodcast(userId: number, range: StatsRange): Map<number, number> {
    const rows = this.db
      .select({
        podcastId: podcastListenSessions.podcastId,
        episodeId: podcastListenSessions.episodeId,
      })
      .from(podcastListenSessions)
      .where(and(...this.sessionConditions(userId, range)))
      .groupBy(podcastListenSessions.podcastId, podcastListenSessions.episodeId)
      .having(sql`sum(${podcastListenSessions.listenedMs}) >= ${PODCAST_STARTED_THRESHOLD_MS}`)
      .all();

    const counts = new Map<number, number>();
    for (const row of rows) {
      counts.set(row.podcastId, (counts.get(row.podcastId) ?? 0) + 1);
    }
    return counts;
  }

  private completedCountByPodcast(userId: number, range: StatsRange): Map<number, number> {
    const rows = this.db
      .select({
        podcastId: podcastListenSessions.podcastId,
        episodeId: podcastListenSessions.episodeId,
      })
      .from(podcastListenSessions)
      .where(
        and(
          ...this.sessionConditions(userId, range),
          eq(podcastListenSessions.completed, 1),
        ),
      )
      .groupBy(podcastListenSessions.podcastId, podcastListenSessions.episodeId)
      .all();

    const counts = new Map<number, number>();
    for (const row of rows) {
      counts.set(row.podcastId, (counts.get(row.podcastId) ?? 0) + 1);
    }
    return counts;
  }

  private completedEpisodeIds(userId: number, episodeIds: number[]): Set<number> {
    if (episodeIds.length === 0) return new Set();
    const rows = this.db
      .select({ episodeId: podcastProgress.episodeId })
      .from(podcastProgress)
      .where(
        and(
          eq(podcastProgress.userId, userId),
          inArray(podcastProgress.episodeId, episodeIds),
          isNotNull(podcastProgress.completedAt),
        ),
      )
      .all();
    return new Set(rows.map((row) => row.episodeId));
  }

  private sessionConditions(userId: number, range: StatsRange) {
    const conditions = [eq(podcastListenSessions.userId, userId)];
    if (range.from) {
      conditions.push(
        gte(
          podcastListenSessions.startedAt,
          zonedDayBounds(range.from, this.config.statsTimezone).startMs,
        ),
      );
    }
    if (range.to) {
      conditions.push(
        lt(
          podcastListenSessions.startedAt,
          zonedDayBounds(range.to, this.config.statsTimezone).endMs,
        ),
      );
    }
    return conditions;
  }

  private bucketWhere(userId: number, range: StatsRange) {
    const conditions = [eq(userPodcastStatsHourly.userId, userId)];
    if (range.from) {
      conditions.push(sql`substr(${userPodcastStatsHourly.bucket}, 1, 10) >= ${range.from}`);
    }
    if (range.to) {
      conditions.push(sql`substr(${userPodcastStatsHourly.bucket}, 1, 10) <= ${range.to}`);
    }
    return and(...conditions);
  }
}

/// Reexporta el helper de bucket para consumidores del servicio (p. ej. tests).
export { zonedBucket };
