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
const TOP_CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const TOP_MAX_LIMIT = 100;
const TOP_DEFAULT_LIMIT = 50;
const TOP_FEED_SIZES = [25, 50, 100];
const COUNTRY_RE = /^[a-z]{2}$/;
const GENRE_RE = /^\d{1,6}$/;
const LOOKUP_CHUNK = 50;

export class PodcastDiscoveryService {
  private readonly cache: Cache<PodcastSearchResult[]>;
  private readonly topCache: Cache<PodcastSearchResult[]>;

  constructor(private readonly config: Config) {
    this.cache = new Cache<PodcastSearchResult[]>(
      config.cacheMaxEntries,
      config.cacheTtlMs,
    );
    this.topCache = new Cache<PodcastSearchResult[]>(
      config.cacheMaxEntries,
      TOP_CACHE_TTL_MS,
    );
  }

  /**
   * Ranking de podcasts populares del directorio de Apple. Sin `genre` usa el
   * feed nuevo (top general por pais); con `genre` usa el feed antiguo, unico
   * que admite categoria. Los `feedUrl` se resuelven con `lookup` en lote.
   */
  async getTop(
    rawCountry = "es",
    rawGenre?: string,
    rawLimit = TOP_DEFAULT_LIMIT,
  ): Promise<PodcastSearchResult[]> {
    const provider = this.config.podcastDiscoveryProvider;
    if (provider === "none") {
      throw badRequest(
        "DISCOVERY_DISABLED",
        "La busqueda en directorio externo esta deshabilitada en este servidor",
      );
    }
    if (provider !== "itunes") {
      throw badRequest(
        "DISCOVERY_UNSUPPORTED",
        "El ranking de podcasts solo esta disponible con el directorio de Apple",
      );
    }

    const country = rawCountry.trim().toLowerCase();
    if (!COUNTRY_RE.test(country)) {
      throw badRequest("VALIDATION_ERROR", "El parametro 'country' debe ser un codigo de pais de dos letras");
    }
    const genre = rawGenre?.trim() || undefined;
    if (genre !== undefined && !GENRE_RE.test(genre)) {
      throw badRequest("VALIDATION_ERROR", "El parametro 'genre' debe ser un identificador numerico");
    }
    const limit = Math.min(
      TOP_MAX_LIMIT,
      Math.max(1, Math.trunc(Number.isFinite(rawLimit) ? rawLimit : TOP_DEFAULT_LIMIT)),
    );

    const cacheKey = `${country}:${genre ?? ""}:${limit}`;
    const cached = this.topCache.get(cacheKey);
    if (cached) return cached;

    const ids = genre
      ? await this.fetchLegacyTopIds(country, genre, limit)
      : await this.fetchTopIds(country, limit);
    const results = await this.lookupPodcasts(ids);

    this.topCache.set(cacheKey, results);
    return results;
  }

  private async fetchJson(url: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url, {
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
    try {
      return await response.json();
    } catch {
      throw serviceUnavailable(
        "DISCOVERY_UNAVAILABLE",
        "El directorio de podcasts devolvio una respuesta no valida",
      );
    }
  }

  /** Top general (feed nuevo): se pide el tamano admitido mas cercano y se recorta. */
  private async fetchTopIds(country: string, limit: number): Promise<string[]> {
    const size = TOP_FEED_SIZES.find((n) => n >= limit) ?? TOP_MAX_LIMIT;
    const body = (await this.fetchJson(
      `https://rss.marketingtools.apple.com/api/v2/${country}/podcasts/top/${size}/podcasts.json`,
    )) as { feed?: { results?: Array<Record<string, unknown>> } };
    const ids: string[] = [];
    for (const item of body.feed?.results ?? []) {
      const id = typeof item.id === "string" || typeof item.id === "number" ? String(item.id) : "";
      if (/^\d+$/.test(id) && !ids.includes(id)) ids.push(id);
      if (ids.length >= limit) break;
    }
    return ids;
  }

  /** Top por categoria (feed antiguo, puede ser retirado por Apple). */
  private async fetchLegacyTopIds(country: string, genre: string, limit: number): Promise<string[]> {
    const body = (await this.fetchJson(
      `https://itunes.apple.com/${country}/rss/toppodcasts/limit=${limit}/genre=${genre}/json`,
    )) as { feed?: { entry?: unknown } };
    const raw = body.feed?.entry;
    const entries = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const ids: string[] = [];
    for (const entry of entries) {
      const id = legacyEntryId(entry);
      if (id !== null && !ids.includes(id)) ids.push(id);
      if (ids.length >= limit) break;
    }
    return ids;
  }

  /** Resuelve ids de Apple a resultados con `feedUrl`, conservando el orden del ranking. */
  private async lookupPodcasts(ids: string[]): Promise<PodcastSearchResult[]> {
    const byId = new Map<string, PodcastSearchResult>();
    for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
      const chunk = ids.slice(i, i + LOOKUP_CHUNK);
      const url = new URL("https://itunes.apple.com/lookup");
      url.searchParams.set("id", chunk.join(","));
      url.searchParams.set("entity", "podcast");
      const body = (await this.fetchJson(url.toString())) as {
        results?: Array<Record<string, unknown>>;
      };
      for (const item of body.results ?? []) {
        const mapped = mapItunesItem(item);
        const rawId = item.collectionId ?? item.trackId;
        const id = typeof rawId === "number" || typeof rawId === "string" ? String(rawId) : "";
        if (mapped && id) byId.set(id, mapped);
      }
    }

    const out: PodcastSearchResult[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      const item = byId.get(id);
      if (!item || seen.has(item.feedUrl)) continue;
      seen.add(item.feedUrl);
      out.push(item);
    }
    return out;
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
      const mapped = mapItunesItem(item);
      if (!mapped || seen.has(mapped.feedUrl)) continue;
      seen.add(mapped.feedUrl);
      out.push(mapped);
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

function mapItunesItem(item: Record<string, unknown>): PodcastSearchResult | null {
  const feedUrl = resolveSafeHttpUrl(item.feedUrl);
  if (!feedUrl) return null;
  const title = sanitizeText(item.collectionName ?? item.trackName, 300);
  if (!title) return null;

  const author = sanitizeText(item.artistName, 200) || null;
  const imageUrl =
    resolveSafeHttpUrl(item.artworkUrl600) ?? resolveSafeHttpUrl(item.artworkUrl100) ?? null;
  const rawGenres = Array.isArray(item.genres) ? item.genres : [];
  const categories = rawGenres
    .map((g) => sanitizeText(g, 80))
    .filter((g) => g.length > 0 && g.toLowerCase() !== "podcasts")
    .slice(0, 6);

  return { title, author, feedUrl, imageUrl, categories, description: null };
}

/** Extrae `id.attributes["im:id"]` de una entrada del feed antiguo, si es un id numerico. */
function legacyEntryId(entry: unknown): string | null {
  if (typeof entry !== "object" || entry === null) return null;
  const idNode = (entry as { id?: unknown }).id;
  if (typeof idNode !== "object" || idNode === null) return null;
  const attrs = (idNode as { attributes?: unknown }).attributes;
  if (typeof attrs !== "object" || attrs === null) return null;
  const id = (attrs as Record<string, unknown>)["im:id"];
  return typeof id === "string" && /^\d+$/.test(id) ? id : null;
}
