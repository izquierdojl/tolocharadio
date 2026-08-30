import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { DB } from "../db/client.js";
import { customStations, favorites, history } from "../db/schema.js";
import { notFound, validationError } from "../errors.js";
import { sanitizeText, sanitizeUrl, type Station } from "./normalize.js";

export const CUSTOM_ID_PREFIX = "custom:";

export function isCustomId(stationId: string): boolean {
  return stationId.startsWith(CUSTOM_ID_PREFIX);
}

function buildStation(record: { stationId: string; name: string; url: string }): Station {
  return {
    id: record.stationId,
    name: record.name,
    url: record.url,
    homepage: null,
    favicon: null,
    country: null,
    countryCode: null,
    language: null,
    tags: [],
    codec: null,
    bitrate: null,
    isSsl: false,
    lastCheckOk: null,
    votes: null,
    clickCount: null,
    isCustom: true,
  };
}

export class CustomStationsService {
  constructor(private readonly db: DB) {}

  async create(userId: number, name: string, url: string): Promise<Station> {
    const sanitizedName = sanitizeText(name, 256);
    if (!sanitizedName) {
      throw validationError([{ field: "name", message: "El nombre de la emisora no puede estar vacio" }]);
    }
    const normalizedUrl = sanitizeUrl(url);
    if (!normalizedUrl) {
      throw validationError([{ field: "url", message: "La URL del stream no es valida" }]);
    }

    const stationId = `${CUSTOM_ID_PREFIX}${randomUUID().replace(/-/g, "")}`;
    const station = buildStation({ stationId, name: sanitizedName, url: normalizedUrl });
    const now = Date.now();

    await this.db.insert(customStations).values({
      userId,
      stationId,
      name: sanitizedName,
      url: normalizedUrl,
      snapshot: JSON.stringify(station),
      createdAt: now,
    });
    return station;
  }

  async list(userId: number): Promise<Station[]> {
    const rows = await this.db
      .select()
      .from(customStations)
      .where(eq(customStations.userId, userId))
      .orderBy(desc(customStations.createdAt));
    return rows.map((row) => buildStation(row));
  }

  async get(userId: number, stationId: string): Promise<Station> {
    if (!isCustomId(stationId)) {
      throw notFound("STATION_NOT_FOUND", "La emisora no existe");
    }
    const rows = await this.db
      .select()
      .from(customStations)
      .where(and(eq(customStations.userId, userId), eq(customStations.stationId, stationId)))
      .limit(1);
    if (rows.length === 0) {
      throw notFound("STATION_NOT_FOUND", "La emisora no existe");
    }
    return buildStation(rows[0]!);
  }

  delete(userId: number, stationId: string): { ok: true } {
    if (!isCustomId(stationId)) return { ok: true };
    this.db.transaction((tx) => {
      const rows = tx
        .select({ id: customStations.id })
        .from(customStations)
        .where(and(eq(customStations.userId, userId), eq(customStations.stationId, stationId)))
        .limit(1)
        .all();
      if (rows.length === 0) return;
      tx.delete(customStations).where(eq(customStations.id, rows[0]!.id)).run();
      tx.delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.stationId, stationId)))
        .run();
      tx.delete(history)
        .where(and(eq(history.userId, userId), eq(history.stationId, stationId)))
        .run();
    });
    return { ok: true };
  }
}
