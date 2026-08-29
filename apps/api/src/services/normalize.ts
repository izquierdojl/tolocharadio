export interface Station {
  id: string;
  name: string;
  url: string;
  homepage: string | null;
  favicon: string | null;
  country: string | null;
  countryCode: string | null;
  language: string | null;
  tags: string[];
  codec: string | null;
  bitrate: number | null;
  isSsl: boolean;
  lastCheckOk: boolean | null;
  votes: number | null;
  clickCount: number | null;
}

type RawStation = Record<string, unknown>;

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return (
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[<>]/g, "")
      .split("")
      .filter((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x7f)
      .join("")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength)
  );
}

function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true" ? true : false;
}

function toTags(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
  );
}

export function normalizeStation(raw: RawStation): Station | null {
  const id = sanitizeText(raw.stationuuid, 64);
  if (!id) return null;

  const name = sanitizeText(raw.name, 256);
  if (!name) return null;

  const url = sanitizeUrl(raw.url_resolved ?? raw.url);
  if (!url) return null;

  return {
    id,
    name,
    url,
    homepage: sanitizeUrl(raw.homepage),
    favicon: sanitizeUrl(raw.favicon),
    country: sanitizeText(raw.country, 120) || null,
    countryCode: sanitizeText(raw.countrycode, 8) || null,
    language: sanitizeText(raw.language, 120) || null,
    tags: toTags(raw.tags),
    codec: sanitizeText(raw.codec, 20) || null,
    bitrate: toNullableNumber(raw.bitrate),
    isSsl: toBoolean(raw.is_ssl),
    lastCheckOk: typeof raw.lastcheckok === "boolean" ? raw.lastcheckok : null,
    votes: toNullableNumber(raw.votes),
    clickCount: toNullableNumber(raw.clickcount),
  };
}

export function normalizeStationList(raw: unknown): Station[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Station[] = [];
  for (const item of raw) {
    const station = normalizeStation(
      typeof item === "object" && item !== null ? (item as RawStation) : {},
    );
    if (!station) continue;
    if (seen.has(station.id)) continue;
    seen.add(station.id);
    out.push(station);
  }
  return out;
}