import { badRequest } from "../errors.js";
import { addDays, daysBetween, isValidDay, startOfIsoWeek } from "./time.js";

export type TimelineGranularity = "day" | "week" | "month";

export interface StatsRange {
  from: string | null;
  to: string | null;
}

export interface TimelineEntry {
  bucket: string;
  totalMs: number;
}

export const MAX_TIMELINE_DAYS = 1830;

export const GRANULARITIES: readonly TimelineGranularity[] = ["day", "week", "month"];

/// Valida un dia `YYYY-MM-DD` opcional de la query string.
export function parseDay(value: unknown, name: string): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || !isValidDay(value)) {
    throw badRequest("INVALID_PARAMS", `${name} invalido (usa YYYY-MM-DD)`);
  }
  return value;
}

/// Lee `from`/`to` de la query compartida por las estadisticas de radio y podcasts.
export function parseRange(query: Record<string, unknown>): StatsRange {
  const from = parseDay(query.from, "from");
  const to = parseDay(query.to, "to");
  if (from && to && from > to) {
    throw badRequest("INVALID_PARAMS", "from no puede ser posterior a to");
  }
  return { from, to };
}

/// Limite entero dentro de `[1, max]` con valor por defecto.
export function parseLimit(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw badRequest("INVALID_PARAMS", `limit invalido (1..${max})`);
  }
  return parsed;
}

export function parseGranularity(value: unknown): TimelineGranularity {
  if (value === undefined) return "day";
  if (typeof value !== "string" || !GRANULARITIES.includes(value as TimelineGranularity)) {
    throw badRequest("INVALID_PARAMS", "granularity invalida (day, week o month)");
  }
  return value as TimelineGranularity;
}

/// Rechaza rangos de timeline desproporcionados antes de rellenar cubos.
export function ensureTimelineRange(range: StatsRange): void {
  if (range.from && range.to && daysBetween(range.from, range.to) > MAX_TIMELINE_DAYS) {
    throw badRequest("INVALID_PARAMS", `El rango no puede superar ${MAX_TIMELINE_DAYS} dias`);
  }
}

export function addMonths(day: string, months: number): string {
  const [year, month] = day.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/// Normaliza un bucket horario al cubo de la granularidad pedida.
export function bucketKey(bucket: string, granularity: TimelineGranularity): string {
  const day = bucket.slice(0, 10);
  if (granularity === "month") return `${day.slice(0, 7)}-01`;
  if (granularity === "week") return startOfIsoWeek(day);
  return day;
}

/// Rellena con cero los cubos sin actividad entre `startDay` y `endDay`.
export function zeroFill(
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

export function sortEntries<T extends { totalMs: number }>(entries: T[]): T[] {
  return entries.sort((a, b) => b.totalMs - a.totalMs);
}
