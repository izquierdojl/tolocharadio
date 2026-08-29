import type { Config } from "../config/env.js";

const REQUEST_TIMEOUT_MS = 10_000;

export interface StationSearchParams {
  name?: string;
  country?: string;
  countryCode?: string;
  language?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

export class RadioBrowserClient {
  constructor(private readonly config: Config) {}

  private async request(
    path: string,
    params: Record<string, string | number | undefined>,
  ): Promise<unknown> {
    const url = new URL(`${this.config.radioBrowserBaseUrl}/json/${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    url.searchParams.set("appname", this.config.radioBrowserAppName);

    const res = await fetch(url, {
      headers: {
        "User-Agent": this.config.radioBrowserAppName,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`radio-browser respondio ${res.status} en ${path}`);
    }
    return res.json();
  }

  async search(params: StationSearchParams): Promise<unknown[]> {
    const body: unknown = await this.request("stations/search", {
      name: params.name,
      country: params.country,
      countrycode: params.countryCode,
      language: params.language,
      tag: params.tag,
      limit: params.limit,
      offset: params.offset,
      order: "clickcount",
      reverse: "true",
      hidebroken: "true",
    });
    return Array.isArray(body) ? (body as unknown[]) : [];
  }

  async byUuid(uuid: string): Promise<unknown[]> {
    const body: unknown = await this.request(`stations/byuuid/${encodeURIComponent(uuid)}`, {});
    return Array.isArray(body) ? (body as unknown[]) : [];
  }

  async countries(): Promise<unknown[]> {
    const body: unknown = await this.request("countries", {});
    return Array.isArray(body) ? (body as unknown[]) : [];
  }

  async languages(): Promise<unknown[]> {
    const body: unknown = await this.request("languages", {});
    return Array.isArray(body) ? (body as unknown[]) : [];
  }

  async tags(): Promise<unknown[]> {
    const body: unknown = await this.request("tags", { limit: "100000" });
    return Array.isArray(body) ? (body as unknown[]) : [];
  }
}