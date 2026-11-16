import { and, eq, sql } from "drizzle-orm";
import type { Config } from "../../config/env.js";
import type { DB } from "../../db/client.js";
import {
  podcastListenSessions,
  podcastProgress,
  userPodcastStatsHourly,
} from "../../db/schema.js";
import { zonedBucket } from "../../lib/time.js";
import type { PodcastCatalogService, PodcastEpisodeProgressView } from "./catalog.js";

const MAX_SESSION_LISTENED_MS = 24 * 60 * 60 * 1000; // 24 h
const MAX_CLOCK_DRIFT_PAST_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const MAX_CLOCK_DRIFT_FUTURE_MS = 5 * 60 * 1000; // 5 min

export type PodcastProgressSource = "web" | "android" | "desktop";

export interface UpsertProgressInput {
  sessionId: string;
  sequence: number;
  positionSec: number;
  durationSec?: number | null;
  listenedMs: number;
  completed?: boolean;
  occurredAt?: number;
  source?: PodcastProgressSource;
}

export class PodcastProgressService {
  constructor(
    private readonly db: DB,
    private readonly config: Config,
    private readonly catalog: PodcastCatalogService,
    private readonly now: () => number = Date.now,
  ) {}

  getProgress(userId: number, episodeId: number): PodcastEpisodeProgressView | null {
    this.catalog.getEpisodeRow(episodeId);
    const row = this.db
      .select()
      .from(podcastProgress)
      .where(
        and(eq(podcastProgress.userId, userId), eq(podcastProgress.episodeId, episodeId)),
      )
      .get();

    if (!row) return null;
    return {
      positionSec: row.positionSec,
      durationSec: row.durationSec,
      completed: row.completedAt !== null,
      completedAt: row.completedAt,
      updatedAt: row.updatedAt,
    };
  }

  dismissFromContinue(userId: number, episodeId: number): { dismissed: boolean } {
    this.catalog.getEpisodeRow(episodeId);
    const existing = this.db
      .select({ episodeId: podcastProgress.episodeId })
      .from(podcastProgress)
      .where(
        and(eq(podcastProgress.userId, userId), eq(podcastProgress.episodeId, episodeId)),
      )
      .get();

    if (!existing) return { dismissed: false };

    this.db
      .update(podcastProgress)
      .set({ dismissedAt: this.now() })
      .where(
        and(eq(podcastProgress.userId, userId), eq(podcastProgress.episodeId, episodeId)),
      )
      .run();
    return { dismissed: true };
  }

  recordProgress(
    userId: number,
    episodeId: number,
    input: UpsertProgressInput,
  ): PodcastEpisodeProgressView {
    const episode = this.catalog.getEpisodeRow(episodeId);
    const now = this.now();

    const effectiveDurationSec =
      input.durationSec && input.durationSec > 0
        ? Math.round(input.durationSec)
        : episode.durationSec ?? null;

    const maxPos = effectiveDurationSec ?? 86_400;
    const clampedPosSec = Math.max(0, Math.min(Math.round(input.positionSec), maxPos));

    const maxListenedMs = effectiveDurationSec
      ? Math.min(MAX_SESSION_LISTENED_MS, effectiveDurationSec * 1000 * 3)
      : MAX_SESSION_LISTENED_MS;
    const clampedListenedMs = Math.max(
      0,
      Math.min(Math.round(input.listenedMs), maxListenedMs),
    );

    const occurredAt =
      typeof input.occurredAt === "number" &&
      input.occurredAt >= now - MAX_CLOCK_DRIFT_PAST_MS &&
      input.occurredAt <= now + MAX_CLOCK_DRIFT_FUTURE_MS
        ? Math.round(input.occurredAt)
        : now;

    const source: PodcastProgressSource = input.source ?? "web";
    const sequence = Math.max(0, Math.trunc(input.sequence));

    return this.db.transaction((tx) => {
      const existingSession = tx
        .select()
        .from(podcastListenSessions)
        .where(
          and(
            eq(podcastListenSessions.userId, userId),
            eq(podcastListenSessions.clientSessionId, input.sessionId),
          ),
        )
        .get();

      const existingProgress = tx
        .select()
        .from(podcastProgress)
        .where(
          and(eq(podcastProgress.userId, userId), eq(podcastProgress.episodeId, episodeId)),
        )
        .get();

      if (existingSession && sequence <= existingSession.lastSequence) {
        if (existingProgress) {
          return {
            positionSec: existingProgress.positionSec,
            durationSec: existingProgress.durationSec,
            completed: existingProgress.completedAt !== null,
            completedAt: existingProgress.completedAt,
            updatedAt: existingProgress.updatedAt,
          };
        }
      }

      const prevListenedMs = existingSession?.listenedMs ?? 0;
      const newSessionListenedMs = Math.max(prevListenedMs, clampedListenedMs);
      const deltaMs = Math.max(0, newSessionListenedMs - prevListenedMs);

      // Total acumulado de este episodio entre todas las sesiones del usuario
      const otherSessionsRow = tx.get<{ total: number }>(
        sql`SELECT COALESCE(SUM(listened_ms), 0) AS total FROM podcast_listen_sessions WHERE user_id = ${userId} AND episode_id = ${episodeId} AND client_session_id != ${input.sessionId}`,
      );
      const totalEpisodeListenedMs = Number(otherSessionsRow?.total ?? 0) + newSessionListenedMs;

      const autoCompleted =
        effectiveDurationSec !== null &&
        effectiveDurationSec > 0 &&
        clampedPosSec >= Math.floor(effectiveDurationSec * 0.95) &&
        totalEpisodeListenedMs >= Math.floor(effectiveDurationSec * 1000 * 0.8);

      const isCompleted =
        Boolean(input.completed) ||
        autoCompleted ||
        Boolean(existingProgress?.completedAt !== null && existingProgress?.completedAt !== undefined);

      const completedAt = isCompleted
        ? existingProgress?.completedAt ?? occurredAt
        : null;

      if (!existingSession) {
        tx.insert(podcastListenSessions)
          .values({
            userId,
            episodeId,
            podcastId: episode.podcastId,
            clientSessionId: input.sessionId,
            source,
            startedAt: occurredAt,
            endedAt: occurredAt,
            listenedMs: newSessionListenedMs,
            lastPositionSec: clampedPosSec,
            durationSec: effectiveDurationSec,
            completed: isCompleted ? 1 : 0,
            completedAt,
            lastSequence: sequence,
            updatedAt: now,
          })
          .run();
      } else {
        tx.update(podcastListenSessions)
          .set({
            endedAt: Math.max(existingSession.endedAt, occurredAt),
            listenedMs: newSessionListenedMs,
            lastPositionSec: clampedPosSec,
            durationSec: effectiveDurationSec ?? existingSession.durationSec,
            completed: isCompleted ? 1 : existingSession.completed,
            completedAt: completedAt ?? existingSession.completedAt,
            lastSequence: sequence,
            updatedAt: now,
          })
          .where(eq(podcastListenSessions.id, existingSession.id))
          .run();
      }

      tx.insert(podcastProgress)
        .values({
          userId,
          episodeId,
          positionSec: clampedPosSec,
          durationSec: effectiveDurationSec,
          completedAt,
          dismissedAt: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [podcastProgress.userId, podcastProgress.episodeId],
          set: {
            positionSec: clampedPosSec,
            durationSec: effectiveDurationSec ?? existingProgress?.durationSec ?? null,
            completedAt,
            dismissedAt: null,
            updatedAt: now,
          },
        })
        .run();

      if (deltaMs > 0) {
        const bucket = zonedBucket(occurredAt, this.config.statsTimezone);
        tx.insert(userPodcastStatsHourly)
          .values({
            userId,
            podcastId: episode.podcastId,
            episodeId,
            bucket,
            totalMs: deltaMs,
          })
          .onConflictDoUpdate({
            target: [
              userPodcastStatsHourly.userId,
              userPodcastStatsHourly.episodeId,
              userPodcastStatsHourly.bucket,
            ],
            set: {
              totalMs: sql`${userPodcastStatsHourly.totalMs} + ${deltaMs}`,
            },
          })
          .run();
      }

      return {
        positionSec: clampedPosSec,
        durationSec: effectiveDurationSec ?? existingProgress?.durationSec ?? null,
        completed: completedAt !== null,
        completedAt,
        updatedAt: now,
      };
    });
  }
}
