import { and, desc, eq } from "drizzle-orm";
import type { DB } from "../../db/client.js";
import { podcastEpisodes, podcastFavorites } from "../../db/schema.js";
import { toEpisodeItem, type PodcastCatalogService, type PodcastEpisodeItem } from "./catalog.js";

export class PodcastFavoritesService {
  constructor(
    private readonly db: DB,
    private readonly catalog: PodcastCatalogService,
    private readonly now: () => number = Date.now,
  ) {}

  list(userId: number): PodcastEpisodeItem[] {
    const rows = this.db
      .select({ episode: podcastEpisodes })
      .from(podcastFavorites)
      .innerJoin(podcastEpisodes, eq(podcastFavorites.episodeId, podcastEpisodes.id))
      .where(eq(podcastFavorites.userId, userId))
      .orderBy(desc(podcastFavorites.createdAt))
      .all();

    const episodeIds = rows.map((r) => r.episode.id);
    const progressMap = this.catalog.loadUserProgressMap(userId, episodeIds);
    return rows.map((r) => toEpisodeItem(r.episode, progressMap.get(r.episode.id) ?? null, true));
  }

  add(userId: number, episodeId: number): PodcastEpisodeItem {
    const episode = this.catalog.getEpisodeRow(episodeId);
    this.db
      .insert(podcastFavorites)
      .values({ userId, episodeId, createdAt: this.now() })
      .onConflictDoNothing()
      .run();
    const progressMap = this.catalog.loadUserProgressMap(userId, [episodeId]);
    return toEpisodeItem(episode, progressMap.get(episodeId) ?? null, true);
  }

  remove(userId: number, episodeId: number): { ok: true } {
    this.db
      .delete(podcastFavorites)
      .where(
        and(eq(podcastFavorites.userId, userId), eq(podcastFavorites.episodeId, episodeId)),
      )
      .run();
    return { ok: true };
  }
}
