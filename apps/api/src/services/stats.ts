import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Config } from "../config/env.js";
import type { DB } from "../db/client.js";
import { playbackSessions, userStationStatsHourly } from "../db/schema.js";
import { addDays, isoWeekday, startOfIsoWeek, zonedBucket, zonedDayBounds } from "../lib/time.js";
import type { Station } from "./normalize.js";

export type StatsSource = "direct" | "playlist" | "hls";

export type TimelineGranularity = "day" | "week" | "month";

export interface StatsRange {
  from: string | null;
  to: string | null;
}

export interface TopStationEntry {
  station: Station;
  totalMs: number;
}

export interface TimelineEntry {
  bucket: string;
  totalMs: number;
}

export interface HabitsEntry {
  weekday: number;
  hour: number;
  totalMs: number;
}

export interface GenreEntry {
  genre: string;
  totalMs: number;
}

export interface CountryEntry {
  country: string;
  countryCode: string | null;
  totalMs: number;
}

export interface RecentEntry {
  station: Station;
  startedAt: number;
  durationMs: number;
}

export const UNKNOWN_CATEGORY = "desconocido";

interface ActiveSession {
  userId: number;
  stationId: string;
  station: Station;
  source: StatsSource;
  startedAt: number;
  lastPulseAt: number;
  accountedUpTo: number;
  accountedMs: number;
  pending: Map<string, number>;
  connections: number;
}

interface SessionRow {
  snapshot: string;
  durationMs: number;
}

function sessionKey(userId: number, stationId: string): string {
  return `${userId}:${stationId}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function addMonths(day: string, months: number): string {
  const [year, month] = day.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 + months, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-01`;
}

function parseSnapshot(snapshot: string): Station | null {
  try {
    return JSON.parse(snapshot) as Station;
  } catch {
    return null;
  }
}

function bucketKey(bucket: string, granularity: TimelineGranularity): string {
  const day = bucket.slice(0, 10);
  if (granularity === "month") return `${day.slice(0, 7)}-01`;
  if (granularity === "week") return startOfIsoWeek(day);
  return day;
}

function sortEntries<T extends { totalMs: number }>(entries: T[]): T[] {
  return entries.sort((a, b) => b.totalMs - a.totalMs);
}

export class StatsService {
  private readonly active = new Map<string, ActiveSession>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly db: DB,
    private readonly config: Config,
    private readonly now: () => number = Date.now,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.config.statsFlushIntervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.closeAll();
  }

  pulse(userId: number, station: Station, source: StatsSource): void {
    const session = this.ensureSession(userId, station, source);
    session.lastPulseAt = this.now();
  }

  startListening(userId: number, station: Station, source: StatsSource): () => void {
    const session = this.ensureSession(userId, station, source);
    session.connections += 1;
    session.lastPulseAt = this.now();
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      this.endListening(userId, station.id);
    };
  }

  endListening(userId: number, stationId: string): void {
    const key = sessionKey(userId, stationId);
    const session = this.active.get(key);
    if (!session) return;
    session.connections = Math.max(0, session.connections - 1);
    if (session.connections > 0) return;

    const now = this.now();
    this.account(session);
    this.accountTail(session, now);
    this.persistPending(session);
    this.persistSession(session, now);
    this.active.delete(key);
  }

  flush(): void {
    const now = this.now();
    for (const [key, session] of [...this.active]) {
      this.account(session);
      this.persistPending(session);
      if (session.connections === 0 && now - session.lastPulseAt >= this.config.statsHlsIdleMs) {
        this.persistSession(session, now);
        this.active.delete(key);
      }
    }
  }

  closeAll(): void {
    const now = this.now();
    for (const [key, session] of [...this.active]) {
      this.account(session);
      if (session.connections > 0) {
        this.accountTail(session, now);
      }
      this.persistPending(session);
      this.persistSession(session, now);
      this.active.delete(key);
    }
  }

  topStations(userId: number, range: StatsRange, limit: number): TopStationEntry[] {
    const totalMs = sql<number>`sum(${userStationStatsHourly.totalMs})`;
    const rows = this.db
      .select({ stationId: userStationStatsHourly.stationId, totalMs })
      .from(userStationStatsHourly)
      .where(this.bucketWhere(userId, range))
      .groupBy(userStationStatsHourly.stationId)
      .orderBy(desc(totalMs))
      .limit(limit)
      .all();

    const snapshots = this.latestSnapshots(userId, rows.map((row) => row.stationId));
    return rows.flatMap((row) => {
      const station = snapshots.get(row.stationId);
      return station ? [{ station, totalMs: Number(row.totalMs) }] : [];
    });
  }

  recent(userId: number, limit: number): RecentEntry[] {
    const rows = this.db
      .select()
      .from(playbackSessions)
      .where(eq(playbackSessions.userId, userId))
      .orderBy(desc(playbackSessions.startedAt))
      .limit(limit)
      .all();
    return rows.flatMap((row) => {
      const station = parseSnapshot(row.snapshot);
      return station ? [{ station, startedAt: row.startedAt, durationMs: row.durationMs }] : [];
    });
  }

  timeline(userId: number, range: StatsRange, granularity: TimelineGranularity): TimelineEntry[] {
    const totalMs = sql<number>`sum(${userStationStatsHourly.totalMs})`;
    const rows = this.db
      .select({ bucket: userStationStatsHourly.bucket, totalMs })
      .from(userStationStatsHourly)
      .where(this.bucketWhere(userId, range))
      .groupBy(userStationStatsHourly.bucket)
      .all();

    const totals = new Map<string, number>();
    let firstDay: string | null = null;
    let lastDay: string | null = null;
    for (const row of rows) {
      const key = bucketKey(row.bucket, granularity);
      totals.set(key, (totals.get(key) ?? 0) + Number(row.totalMs));
      const day = row.bucket.slice(0, 10);
      if (firstDay === null || day < firstDay) firstDay = day;
      if (lastDay === null || day > lastDay) lastDay = day;
    }

    const startDay = range.from ?? firstDay;
    const endDay = range.to ?? lastDay;
    if (!startDay || !endDay) return [];
    return this.zeroFill(startDay, endDay, granularity, totals);
  }

  habits(userId: number, range: StatsRange): HabitsEntry[] {
    const totalMs = sql<number>`sum(${userStationStatsHourly.totalMs})`;
    const rows = this.db
      .select({ bucket: userStationStatsHourly.bucket, totalMs })
      .from(userStationStatsHourly)
      .where(this.bucketWhere(userId, range))
      .groupBy(userStationStatsHourly.bucket)
      .all();

    const totals = new Map<string, number>();
    for (const row of rows) {
      const day = row.bucket.slice(0, 10);
      const hour = Number(row.bucket.slice(11, 13));
      const key = `${isoWeekday(day)}:${hour}`;
      totals.set(key, (totals.get(key) ?? 0) + Number(row.totalMs));
    }

    return [...totals.entries()]
      .map(([key, total]) => {
        const [weekday, hour] = key.split(":").map(Number);
        return { weekday: weekday!, hour: hour!, totalMs: total };
      })
      .sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
  }

  genres(userId: number, range: StatsRange, limit: number): GenreEntry[] {
    const totals = new Map<string, number>();
    for (const session of this.sessionsInRange(userId, range)) {
      const station = parseSnapshot(session.snapshot);
      const tags = (station?.tags ?? []).filter(Boolean);
      if (tags.length === 0) {
        totals.set(UNKNOWN_CATEGORY, (totals.get(UNKNOWN_CATEGORY) ?? 0) + session.durationMs);
        continue;
      }
      for (const tag of tags) {
        totals.set(tag, (totals.get(tag) ?? 0) + session.durationMs);
      }
    }
    return sortEntries([...totals.entries()].map(([genre, totalMs]) => ({ genre, totalMs }))).slice(
      0,
      limit,
    );
  }

  countries(userId: number, range: StatsRange): CountryEntry[] {
    const totals = new Map<string, CountryEntry>();
    for (const session of this.sessionsInRange(userId, range)) {
      const station = parseSnapshot(session.snapshot);
      const country = station?.country ?? null;
      const key = country ?? UNKNOWN_CATEGORY;
      const entry = totals.get(key) ?? {
        country: country ?? UNKNOWN_CATEGORY,
        countryCode: country ? (station?.countryCode ?? null) : null,
        totalMs: 0,
      };
      entry.totalMs += session.durationMs;
      totals.set(key, entry);
    }
    return sortEntries([...totals.values()]);
  }

  private ensureSession(userId: number, station: Station, source: StatsSource): ActiveSession {
    const key = sessionKey(userId, station.id);
    let session = this.active.get(key);
    if (!session) {
      const now = this.now();
      session = {
        userId,
        stationId: station.id,
        station,
        source,
        startedAt: now,
        lastPulseAt: now,
        accountedUpTo: now,
        accountedMs: 0,
        pending: new Map(),
        connections: 0,
      };
      this.active.set(key, session);
    }
    return session;
  }

  private account(session: ActiveSession): void {
    const gap = Math.min(
      Math.max(0, session.lastPulseAt - session.accountedUpTo),
      this.config.statsPulseCapMs,
    );
    if (gap > 0) {
      session.accountedMs += gap;
      const bucket = zonedBucket(session.lastPulseAt, this.config.statsTimezone);
      session.pending.set(bucket, (session.pending.get(bucket) ?? 0) + gap);
    }
    session.accountedUpTo = Math.max(session.accountedUpTo, session.lastPulseAt);
  }

  private accountTail(session: ActiveSession, now: number): void {
    const gap = Math.min(
      Math.max(0, now - session.accountedUpTo),
      this.config.statsPulseCapMs,
    );
    if (gap > 0) {
      session.accountedMs += gap;
      const bucket = zonedBucket(now, this.config.statsTimezone);
      session.pending.set(bucket, (session.pending.get(bucket) ?? 0) + gap);
    }
    session.accountedUpTo = now;
  }

  private persistPending(session: ActiveSession): void {
    for (const [bucket, ms] of session.pending) {
      if (ms <= 0) continue;
      this.db
        .insert(userStationStatsHourly)
        .values({ userId: session.userId, stationId: session.stationId, bucket, totalMs: ms })
        .onConflictDoUpdate({
          target: [
            userStationStatsHourly.userId,
            userStationStatsHourly.stationId,
            userStationStatsHourly.bucket,
          ],
          set: { totalMs: sql`${userStationStatsHourly.totalMs} + ${ms}` },
        })
        .run();
    }
    session.pending.clear();
  }

  private persistSession(session: ActiveSession, now: number): void {
    if (session.accountedMs <= 0) return;
    this.db
      .insert(playbackSessions)
      .values({
        userId: session.userId,
        stationId: session.stationId,
        snapshot: JSON.stringify(session.station),
        source: session.source,
        startedAt: session.startedAt,
        endedAt: now,
        durationMs: session.accountedMs,
      })
      .run();
  }

  private bucketWhere(userId: number, range: StatsRange) {
    const conditions = [eq(userStationStatsHourly.userId, userId)];
    if (range.from) {
      conditions.push(sql`substr(${userStationStatsHourly.bucket}, 1, 10) >= ${range.from}`);
    }
    if (range.to) {
      conditions.push(sql`substr(${userStationStatsHourly.bucket}, 1, 10) <= ${range.to}`);
    }
    return and(...conditions);
  }

  private sessionsInRange(userId: number, range: StatsRange): SessionRow[] {
    const conditions = [eq(playbackSessions.userId, userId)];
    if (range.from) {
      conditions.push(gte(playbackSessions.startedAt, zonedDayBounds(range.from, this.config.statsTimezone).startMs));
    }
    if (range.to) {
      conditions.push(lt(playbackSessions.startedAt, zonedDayBounds(range.to, this.config.statsTimezone).endMs));
    }
    return this.db
      .select({ snapshot: playbackSessions.snapshot, durationMs: playbackSessions.durationMs })
      .from(playbackSessions)
      .where(and(...conditions))
      .all();
  }

  private latestSnapshots(userId: number, stationIds: string[]): Map<string, Station> {
    const snapshots = new Map<string, Station>();
    if (stationIds.length === 0) return snapshots;
    const rows = this.db
      .select({
        stationId: playbackSessions.stationId,
        snapshot: playbackSessions.snapshot,
        latest: sql<number>`max(${playbackSessions.startedAt})`,
      })
      .from(playbackSessions)
      .where(
        and(eq(playbackSessions.userId, userId), inArray(playbackSessions.stationId, stationIds)),
      )
      .groupBy(playbackSessions.stationId)
      .all();
    for (const row of rows) {
      const station = parseSnapshot(row.snapshot);
      if (station) snapshots.set(row.stationId, station);
    }
    return snapshots;
  }

  private zeroFill(
    startDay: string,
    endDay: string,
    granularity: TimelineGranularity,
    totals: Map<string, number>,
  ): TimelineEntry[] {
    const entries: TimelineEntry[] = [];
    if (granularity === "month") {
      const endMonth = `${endDay.slice(0, 7)}-01`;
      let cursor = `${startDay.slice(0, 7)}-01`;
      while (cursor <= endMonth) {
        entries.push({ bucket: cursor, totalMs: totals.get(cursor) ?? 0 });
        cursor = addMonths(cursor, 1);
      }
      return entries;
    }
    if (granularity === "week") {
      const endWeek = startOfIsoWeek(endDay);
      let cursor = startOfIsoWeek(startDay);
      while (cursor <= endWeek) {
        entries.push({ bucket: cursor, totalMs: totals.get(cursor) ?? 0 });
        cursor = addDays(cursor, 7);
      }
      return entries;
    }
    let cursor = startDay;
    while (cursor <= endDay) {
      entries.push({ bucket: cursor, totalMs: totals.get(cursor) ?? 0 });
      cursor = addDays(cursor, 1);
    }
    return entries;
  }
}
