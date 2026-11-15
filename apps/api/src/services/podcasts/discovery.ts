import { createHash } from "node:crypto";
import type { Config } from "../../config/env.js";
import { badRequest, serviceUnavailable } from "../../errors.js";
import { Cache } from "../cache.js";
import { sanitizeText } from "../normalize.js";
import { resolveSafeHttpUrl } from "./feedParser.js";

export interface PodcastSearchResult {
  title: string;
  author: string | null;
  feedUrl: string;
  imageUrl: string | null;
  categories: string[];
  description: string | null;
}

const DISCOVERY_TIMEOUT_MS = 8_000;

export class PodcastDiscoveryService {
  private readonly cache: Cache<PodcastSearchResult[]>;

  constructor(private readonly config: Config) {
    this.cache = new Cache<PodcastSearchResult[]>(
      config.cacheMaxEntries,
      config.cacheTtlMs,
    );
  }

  async search(rawQuery: string, limit = 20): Promise<PodcastSearchResult[]> {
    const provider = this.config.podcastDiscoveryProvider;
    if (provider === "none") {
      throw badRequest(
        "DISCOVERY_DISABLED",
        "La busqueda en directorio externo esta deshabilitada en este servidor",
      );
    }

    const query = rawQuery.trim();
    if (!query) return [];
    const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit)));
    const cacheKey = `${provider}:${safeLimit}:${query.toLocaleLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const results =
      provider === "podcastindex"
        ? await this.searchPodcastIndex(query, safeLimit)
        : await this.searchItunes(query, safeLimit);

    this.cache.set(cacheKey, results);
    return results;
  }

  private async searchItunes(query: string, limit: number): Promise<PodcastSearchResult[]> {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("media", "podcast");
    url.searchParams.set("entity", "podcast");
    url.searchParams.set("term", query);
    url.searchParams.set("limit", String(limit));

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          "User-Agent": this.config.radioBrowserAppName,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
      });
    } catch {
      throw serviceUnavailable(
        "DISCOVERY_UNAVAILABLE",
        "No se pudo consultar el directorio de podcasts",
      );
    }

    if (!response.ok) {
      throw serviceUnavailable(
        "DISCOVERY_UNAVAILABLE",
        "El directorio de podcasts no esta disponible en este momento",
      );
    }

    const body = (await response.json()) as { results?: Array<Record<string, unknown>> };
    const out: PodcastSearchResult[] = [];
    const seen = new Set<string>();

    for (const item of body.results ?? []) {
      const feedUrl = resolveSafeHttpUrl(item.feedUrl);
      if (!feedUrl || seen.has(feedUrl)) continue;
      const title = sanitizeText(item.collectionName ?? item.trackName, 300);
      if (!title) continue;
      seen.add(feedUrl);

      const author = sanitizeText(item.artistName, 200) || null;
      const imageUrl =
        resolveSafeHttpUrl(item.artworkUrl600) ??
        resolveSafeHttpUrl(item.artworkUrl100) ??
        null;
      const rawGenres = Array.isArray(item.genres) ? item.genres : [];
      const categories = rawGenres
        .map((g) => sanitizeText(g, 80))
        .filter((g) => g.length > 0 && g.toLowerCase() !== "podcasts")
        .slice(0, 6);

      out.push({
        title,
        author,
        feedUrl,
        imageUrl,
        categories,
        description: null,
      });
    }

    return out;
  }

  private async searchPodcastIndex(query: string, limit: number): Promise<PodcastSearchResult[]> {
    const apiKey = this.config.podcastIndexApiKey;
    const apiSecret = this.config.podcastIndexApiSecret;
    if (!apiKey || !apiSecret) {
      throw serviceUnavailable(
        "DISCOVERY_MISCONFIGURED",
        "Faltan las credenciales de Podcast Index en el servidor",
      );
    }

    const authDate = String(Math.floor(Date.now() / 1000));
    const authHash = createHash("sha1")
      .update(`${apiKey}${apiSecret}${authDate}`)
      .digest("hex");

    const url = new URL("https://api.podcastindex.org/api/1.0/search/byterm");
    url.searchParams.set("q", query);
    url.searchParams.set("max", String(limit));

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          "User-Agent": this.config.radioBrowserAppName,
          "X-Auth-Date": authDate,
          "X-Auth-Key": apiKey,
          Authorization: authHash,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
      });
    } catch {
      throw serviceUnavailable(
        "DISCOVERY_UNAVAILABLE",
        "No se pudo consultar Podcast Index",
      );
    }

    if (!response.ok) {
      throw serviceUnavailable(
        "DISCOVERY_UNAVAILABLE",
        "Podcast Index no esta disponible en este momento",
      );
    }

    const body = (await response.json()) as { feeds?: Array<Record<string, unknown>> };
    const out: PodcastSearchResult[] = [];
    const seen = new Set<string>();

    for (const item of body.feeds ?? []) {
      const feedUrl = resolveSafeHttpUrl(item.url);
      if (!feedUrl || seen.has(feedUrl)) continue;
      const title = sanitizeText(item.title, 300);
      if (!title) continue;
      seen.add(feedUrl);

      const author = sanitizeText(item.author ?? item.ownerName, 200) || null;
      const imageUrl = resolveSafeHttpUrl(item.artwork ?? item.image);
      const description = sanitizeText(item.description, 1000) || null;
      const rawCats =
        typeof item.categories === "object" && item.categories !== null
          ? Object.values(item.categories as Record<string, unknown>)
          : [];
      const categories = rawCats
        .map((c) => sanitizeText(c, 80))
        .filter(Boolean)
        .slice(0, 6);

      out.push({
        title,
        author,
        feedUrl,
        imageUrl,
        categories,
        description,
      });
    }

    return out;
  }
}
