import type { Config } from "../config/env.js";
import { AppError, notFound, serviceUnavailable } from "../errors.js";
import { Cache } from "./cache.js";
import { isCustomId, type CustomStationsService } from "./customStations.js";
import { normalizeOptions, normalizeStationList, type OptionsSort, type Station } from "./normalize.js";
import { RadioBrowserClient } from "./radiobrowser.js";

export interface StationPage {
  items: Station[];
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface StationQuery {
  name?: string;
  country?: string;
  language?: string;
  tag?: string;
  limit: number;
  offset: number;
  unique: boolean;
}

function dedupeByName(items: Station[]): Station[] {
  const seen = new Set<string>();
  const out: Station[] = [];
  for (const station of items) {
    const key = station.name.toLocaleLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(station);
  }
  return out;
}

export class StationsService {
  private readonly client: RadioBrowserClient;
  private readonly cache: Cache<unknown>;
  private readonly maxLimit = 100;

  constructor(
    config: Config,
    private readonly customStations?: CustomStationsService,
  ) {
    this.client = new RadioBrowserClient(config);
    this.cache = new Cache(config.cacheMaxEntries, config.cacheTtlMs);
  }

  async search(query: StationQuery): Promise<StationPage> {
    const limit = Math.min(Math.max(1, query.limit), this.maxLimit);
    const offset = Math.max(0, query.offset);
    const key = `search:${JSON.stringify({ ...query, limit })}`;
    const fresh = this.cache.get(key) as StationPage | undefined;
    if (fresh) return fresh;

    try {
      const raw = await this.client.search({
        name: query.name,
        country: query.country,
        language: query.language,
        tag: query.tag,
        limit,
        offset,
      });
      let items = normalizeStationList(raw);
      if (query.unique) {
        items = dedupeByName(items);
      }
      const page: StationPage = { items, offset, limit, hasMore: raw.length >= limit };
      this.cache.set(key, page);
      return page;
    } catch {
      const stale = this.cache.getStale(key) as StationPage | undefined;
      if (stale) return stale;
      throw serviceUnavailable(
        "CATALOG_UNAVAILABLE",
        "El catalogo de emisoras no esta disponible temporalmente",
      );
    }
  }

  async getStation(stationId: string, userId?: number): Promise<Station> {
    if (isCustomId(stationId)) {
      if (!this.customStations || userId === undefined) {
        throw notFound("STATION_NOT_FOUND", "La emisora no existe");
      }
      return this.customStations.get(userId, stationId);
    }

    const key = `byId:${stationId}`;
    const fresh = this.cache.get(key) as { station: Station } | undefined;
    if (fresh) return fresh.station;

    try {
      const raw = await this.client.byUuid(stationId);
      const list = normalizeStationList(raw);
      const station = list.find((s) => s.id === stationId) ?? list[0];
      if (!station) {
        throw notFound("STATION_NOT_FOUND", "La emisora no existe");
      }
      this.cache.set(key, { station });
      return station;
    } catch (err) {
      const stale = this.cache.getStale(key) as { station: Station } | undefined;
      if (stale) return stale.station;
      if (err instanceof AppError) throw err;
      throw serviceUnavailable(
        "CATALOG_UNAVAILABLE",
        "El catalogo de emisoras no esta disponible temporalmente",
      );
    }
  }

  private async listOptions(
    key: string,
    fetchOptions: () => Promise<unknown[]>,
    sort: OptionsSort = "alphabetical",
  ): Promise<string[]> {
    const fresh = this.cache.get(key) as string[] | undefined;
    if (fresh) return fresh;

    try {
      const options = normalizeOptions(await fetchOptions(), sort);
      this.cache.set(key, options);
      return options;
    } catch {
      const stale = this.cache.getStale(key) as string[] | undefined;
      if (stale) return stale;
      throw serviceUnavailable(
        "CATALOG_UNAVAILABLE",
        "El catalogo de emisoras no esta disponible temporalmente",
      );
    }
  }

  async listCountries(): Promise<string[]> {
    return this.listOptions("countries", () => this.client.countries());
  }

  async listLanguages(): Promise<string[]> {
    return this.listOptions("languages", () => this.client.languages());
  }

  async listTags(): Promise<string[]> {
    return this.listOptions("tags", () => this.client.tags(), "stationcount");
  }
}