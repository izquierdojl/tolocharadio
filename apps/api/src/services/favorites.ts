import { and, desc, eq } from "drizzle-orm";
import type { PublicUser } from "../config/env.js";
import type { DB } from "../db/client.js";
import { favorites } from "../db/schema.js";
import { conflict } from "../errors.js";
import type { Station } from "./normalize.js";
import type { StationsService } from "./stations.js";

export interface FavoriteEntry {
  addedAt: number;
  station: Station;
}

export class FavoritesService {
  constructor(
    private readonly db: DB,
    private readonly stations: StationsService,
  ) {}

  async list(userId: number): Promise<FavoriteEntry[]> {
    const rows = await this.db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
    return rows.map((row) => ({ addedAt: row.createdAt, station: JSON.parse(row.snapshot) as Station }));
  }

  async add(userId: number, stationId: string): Promise<FavoriteEntry> {
    const station = await this.stations.getStation(stationId);

    const existing = await this.db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.stationId, stationId)))
      .limit(1);
    if (existing.length > 0) {
      throw conflict("FAVORITE_ALREADY_EXISTS", "La emisora ya esta en tus favoritos");
    }

    const now = Date.now();
    await this.db.insert(favorites).values({
      userId,
      stationId,
      snapshot: JSON.stringify(station),
      createdAt: now,
    });
    return { addedAt: now, station };
  }

  async remove(userId: number, stationId: string): Promise<{ ok: true }> {
    await this.db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.stationId, stationId)));
    return { ok: true };
  }

  async isFavorite(userId: number, stationId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.stationId, stationId)))
      .limit(1);
    return rows.length > 0;
  }
}

export type { PublicUser as _PublicUser };