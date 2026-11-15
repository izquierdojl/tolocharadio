import { and, count, desc, eq } from "drizzle-orm";
import type { Config } from "../../config/env.js";
import type { DB } from "../../db/client.js";
import { podcasts, podcastSubscriptions } from "../../db/schema.js";
import { badRequest } from "../../errors.js";
import type { PodcastCatalogService, PodcastSummary } from "./catalog.js";
import { resolveSafeHttpUrl } from "./feedParser.js";

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface BulkSubscriptionResult {
  imported: number;
  skipped: number;
  failed: number;
  items: PodcastSummary[];
  errors: Array<{ feedUrl: string; message: string }>;
}

export class PodcastSubscriptionsService {
  constructor(
    private readonly db: DB,
    private readonly config: Config,
    private readonly catalog: PodcastCatalogService,
    private readonly now: () => number = Date.now,
  ) {}

  list(userId: number): PodcastSummary[] {
    const rows = this.db
      .select({
        podcast: podcasts,
        subscribedAt: podcastSubscriptions.subscribedAt,
      })
      .from(podcastSubscriptions)
      .innerJoin(podcasts, eq(podcastSubscriptions.podcastId, podcasts.id))
      .where(eq(podcastSubscriptions.userId, userId))
      .orderBy(desc(podcastSubscriptions.subscribedAt))
      .all();

    return rows.map((r) =>
      this.catalog.toSummary(r.podcast, {
        isSubscribed: true,
        subscribedAt: r.subscribedAt,
      }),
    );
  }

  countForUser(userId: number): number {
    const row = this.db
      .select({ value: count() })
      .from(podcastSubscriptions)
      .where(eq(podcastSubscriptions.userId, userId))
      .get();
    return Number(row?.value ?? 0);
  }

  async subscribe(
    userId: number,
    input: { podcastId?: number; feedUrl?: string },
  ): Promise<PodcastSummary> {
    let podcastRow: typeof podcasts.$inferSelect;
    if (typeof input.podcastId === "number") {
      podcastRow = this.catalog.getPodcastRow(input.podcastId);
    } else if (typeof input.feedUrl === "string" && input.feedUrl.trim()) {
      podcastRow = await this.catalog.resolveAndIngestFeed(input.feedUrl);
    } else {
      throw badRequest("VALIDATION_ERROR", "Debes indicar podcastId o feedUrl");
    }

    const already = this.catalog.isUserSubscribed(userId, podcastRow.id);
    if (!already) {
      const currentCount = this.countForUser(userId);
      if (currentCount >= this.config.podcastSubscriptionsMax) {
        throw badRequest(
          "SUBSCRIPTION_LIMIT_REACHED",
          `Has alcanzado el limite maximo de ${this.config.podcastSubscriptionsMax} suscripciones`,
        );
      }

      const now = this.now();
      this.db
        .insert(podcastSubscriptions)
        .values({
          userId,
          podcastId: podcastRow.id,
          subscribedAt: now,
        })
        .onConflictDoNothing()
        .run();
    }

    const subRow = this.db
      .select()
      .from(podcastSubscriptions)
      .where(
        and(
          eq(podcastSubscriptions.userId, userId),
          eq(podcastSubscriptions.podcastId, podcastRow.id),
        ),
      )
      .get();

    return this.catalog.toSummary(podcastRow, {
      isSubscribed: true,
      subscribedAt: subRow?.subscribedAt ?? this.now(),
    });
  }

  unsubscribe(userId: number, podcastId: number): { ok: true } {
    this.db
      .delete(podcastSubscriptions)
      .where(
        and(
          eq(podcastSubscriptions.userId, userId),
          eq(podcastSubscriptions.podcastId, podcastId),
        ),
      )
      .run();
    return { ok: true };
  }

  async bulkSubscribe(userId: number, rawFeedUrls: string[]): Promise<BulkSubscriptionResult> {
    if (rawFeedUrls.length > this.config.podcastOpmlMaxFeeds) {
      throw badRequest(
        "OPML_LIMIT_EXCEEDED",
        `No se pueden importar mas de ${this.config.podcastOpmlMaxFeeds} feeds a la vez`,
      );
    }

    const uniqueUrls: string[] = [];
    const seen = new Set<string>();
    const errors: Array<{ feedUrl: string; message: string }> = [];

    for (const raw of rawFeedUrls) {
      const normalized = resolveSafeHttpUrl(raw);
      if (!normalized) {
        errors.push({ feedUrl: String(raw), message: "URL de feed invalida" });
        continue;
      }
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      uniqueUrls.push(normalized);
    }

    let imported = 0;
    let skipped = 0;
    const items: PodcastSummary[] = [];

    const existingSubs = new Set(this.list(userId).map((s) => s.feedUrl));
    const concurrency = 3;

    for (let i = 0; i < uniqueUrls.length; i += concurrency) {
      const batch = uniqueUrls.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(async (feedUrl) => {
          const already = existingSubs.has(feedUrl);
          const summary = await this.subscribe(userId, { feedUrl });
          return { feedUrl, summary, already };
        }),
      );

      for (let j = 0; j < results.length; j++) {
        const outcome = results[j]!;
        const feedUrl = batch[j]!;
        if (outcome.status === "fulfilled") {
          items.push(outcome.value.summary);
          if (outcome.value.already) {
            skipped += 1;
          } else {
            imported += 1;
            existingSubs.add(outcome.value.summary.feedUrl);
          }
        } else {
          const msg =
            outcome.reason instanceof Error
              ? outcome.reason.message
              : "No se pudo importar el feed";
          errors.push({ feedUrl, message: msg });
        }
      }
    }

    return {
      imported,
      skipped,
      failed: errors.length,
      items,
      errors,
    };
  }

  exportOpml(userId: number): string {
    const subs = this.list(userId);
    const outlines = subs
      .map((sub) => {
        const title = escapeXmlAttr(sub.title);
        const xmlUrl = escapeXmlAttr(sub.feedUrl);
        const htmlUrl = sub.link ? ` htmlUrl="${escapeXmlAttr(sub.link)}"` : "";
        return `      <outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}"${htmlUrl} />`;
      })
      .join("\n");

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<opml version="2.0">',
      "  <head>",
      "    <title>Suscripciones de TolochaRadio</title>",
      "  </head>",
      "  <body>",
      '    <outline text="Podcasts" title="Podcasts">',
      outlines,
      "    </outline>",
      "  </body>",
      "</opml>",
    ].join("\n");
  }
}
