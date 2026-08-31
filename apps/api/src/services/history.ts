import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Config } from "../config/env.js";
import type { DB } from "../db/client.js";
import { history } from "../db/schema.js";
import { notFound } from "../errors.js";
import type { Station } from "./normalize.js";
import type { StationsService } from "./stations.js";

export interface HistoryEntry {
  playedAt: number;
  station: Station;
}

export class HistoryService {
  constructor(
    private readonly db: DB,
    private readonly config: Config,
    private readonly stations: StationsService,
  ) {}

  async record(userId: number, stationId: string): Promise<void> {
    const station = await this.stations.getStation(stationId, userId);
    const now = Date.now();
    const snapshot = JSON.stringify(station);

    const existing = await this.db
      .select({ id: history.id })
      .from(history)
      .where(and(eq(history.userId, userId), eq(history.stationId, stationId)))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(history)
        .set({ stationId, snapshot, playedAt: now })
        .where(eq(history.id, existing[0]!.id));
    } else {
      await this.db.insert(history).values({ userId, stationId, snapshot, playedAt: now });
    }

    await this.trimToLimit(userId);
  }

  private async trimToLimit(userId: number): Promise<void> {
    const limit = this.config.historyLimit;
    const rows = await this.db
      .select({ id: history.id })
      .from(history)
      .where(eq(history.userId, userId))
      .orderBy(asc(history.playedAt));
    const excess = rows.length - limit;
    if (excess > 0) {
      const toDelete = rows.slice(0, excess).map((r) => r.id);
      await this.db.delete(history).where(inArray(history.id, toDelete));
    }
  }

  async list(userId: number): Promise<HistoryEntry[]> {
    const rows = await this.db
      .select()
      .from(history)
      .where(eq(history.userId, userId))
      .orderBy(desc(history.playedAt));
    return rows.map((row) => ({ playedAt: row.playedAt, station: JSON.parse(row.snapshot) as Station }));
  }

  async clear(userId: number): Promise<{ ok: true }> {
    await this.db.delete(history).where(eq(history.userId, userId));
    return { ok: true };
  }

  async removeStation(userId: number, stationId: string): Promise<{ ok: true }> {
    const result = await this.db
      .delete(history)
      .where(and(eq(history.userId, userId), eq(history.stationId, stationId)));
    
    if (result.changes === 0) {
      throw notFound("HISTORY_NOT_FOUND", "Estación no encontrada en el historial");
    }
    
    return { ok: true };
  }
}