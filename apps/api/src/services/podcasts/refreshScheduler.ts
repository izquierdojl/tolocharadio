import { eq } from "drizzle-orm";
import type { Config } from "../../config/env.js";
import type { DB } from "../../db/client.js";
import { podcasts, podcastSubscriptions } from "../../db/schema.js";
import type { PodcastCatalogService } from "./catalog.js";

const BACKOFF_STEPS_MS = [
  15 * 60 * 1000, // 15 min
  60 * 60 * 1000, // 1 h
  6 * 60 * 60 * 1000, // 6 h
  24 * 60 * 60 * 1000, // 24 h
] as const;
const REFRESH_CONCURRENCY = 3;

export function computeFeedBackoffMs(errorCount: number, defaultIntervalMs: number): number {
  if (errorCount <= 0) return defaultIntervalMs;
  const idx = Math.min(errorCount - 1, BACKOFF_STEPS_MS.length - 1);
  return Math.max(defaultIntervalMs, BACKOFF_STEPS_MS[idx]!);
}

export class PodcastRefreshService {
  private readonly inFlight = new Map<number, Promise<void>>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DB,
    private readonly config: Config,
    private readonly catalog: PodcastCatalogService,
    private readonly now: () => number = Date.now,
  ) {}

  start(): void {
    if (this.timer || !this.config.podcastsEnabled) return;
    this.timer = setInterval(() => {
      void this.refreshDueFeeds();
    }, this.config.podcastRefreshIntervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  refreshPodcast(podcastId: number): Promise<void> {
    const active = this.inFlight.get(podcastId);
    if (active) return active;

    const task = (async () => {
      try {
        const row = this.catalog.getPodcastRow(podcastId);
        await this.catalog.resolveAndIngestFeed(row.feedUrl, { force: true });
      } catch {
        // El error ya queda registrado en last_error y error_count por catalog.ts
      } finally {
        this.inFlight.delete(podcastId);
      }
    })();

    this.inFlight.set(podcastId, task);
    return task;
  }

  async refreshDueFeeds(): Promise<number> {
    const subscribedRows = this.db
      .selectDistinct({
        id: podcasts.id,
        lastFetchedAt: podcasts.lastFetchedAt,
        errorCount: podcasts.errorCount,
      })
      .from(podcasts)
      .innerJoin(podcastSubscriptions, eq(podcastSubscriptions.podcastId, podcasts.id))
      .all();

    const now = this.now();
    const dueIds = subscribedRows
      .filter((r) => {
        if (!r.lastFetchedAt) return true;
        const waitMs = computeFeedBackoffMs(r.errorCount, this.config.podcastRefreshIntervalMs);
        return now - r.lastFetchedAt >= waitMs;
      })
      .map((r) => r.id);

    for (let i = 0; i < dueIds.length; i += REFRESH_CONCURRENCY) {
      const batch = dueIds.slice(i, i + REFRESH_CONCURRENCY);
      await Promise.allSettled(batch.map((id) => this.refreshPodcast(id)));
    }

    return dueIds.length;
  }
}
