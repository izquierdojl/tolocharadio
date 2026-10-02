import type { Station } from "./types.js";

export interface StatsTopEntry {
  station: Station;
  totalMs: number;
}

export interface StatsTimelineEntry {
  bucket: string;
  totalMs: number;
}

export interface StatsHabitEntry {
  weekday: number;
  hour: number;
  totalMs: number;
}

export interface StatsGenreEntry {
  genre: string;
  totalMs: number;
}

export interface StatsCountryEntry {
  country: string;
  countryCode: string | null;
  totalMs: number;
}

export interface StatsRecentEntry {
  station: Station;
  startedAt: number;
  durationMs: number;
}

export type StatsPreset = "7d" | "30d" | "90d" | "all" | "custom";
export type TimelineGranularity = "day" | "week" | "month";

export interface StatsRange {
  from?: string;
  to?: string;
}

export const WEEKDAY_LABELS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
] as const;

export const WEEKDAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"] as const;

export const CHART_COLORS = [
  "#c0883e",
  "#5f8f73",
  "#b4c47e",
  "#d3a568",
  "#8cb29a",
  "#a67430",
  "#3c6a4d",
  "#e2c091",
  "#cfdaa2",
  "#6b4a1d",
] as const;

export function formatDurationMs(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 1) return "0 min";
  if (totalMin < 60) return totalMin === 1 ? "1 min" : `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return h === 1 ? "1 h" : `${h} h`;
  return `${h} h ${m} min`;
}

export function formatAxisDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toLocalDay(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayLocalDay(): string {
  return toLocalDay(new Date());
}

export function shiftLocalDay(day: string, deltaDays: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + deltaDays);
  return toLocalDay(date);
}

export function presetRange(preset: StatsPreset, custom: StatsRange): StatsRange {
  if (preset === "custom") return custom;
  if (preset === "all") return {};
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const to = todayLocalDay();
  const from = shiftLocalDay(to, -(days - 1));
  return { from, to };
}

export function daysBetween(from?: string, to?: string): number {
  if (!from || !to) return 30;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 30;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

export function autoGranularity(range: StatsRange): TimelineGranularity {
  const days = daysBetween(range.from, range.to);
  if (days <= 62) return "day";
  if (days <= 370) return "week";
  return "month";
}

export function buildHabitsMatrix(items: StatsHabitEntry[]): number[][] {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const item of items) {
    if (item.weekday < 0 || item.weekday > 6 || item.hour < 0 || item.hour > 23) continue;
    const row = matrix[item.weekday];
    if (row) row[item.hour] = (row[item.hour] ?? 0) + item.totalMs;
  }
  return matrix;
}

export function formatBucketLabel(bucket: string, granularity: TimelineGranularity): string {
  const date = new Date(`${bucket}T00:00:00`);
  if (Number.isNaN(date.getTime())) return bucket;
  if (granularity === "month") {
    return date.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
  }
  if (granularity === "week") {
    return `sem. ${date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`;
  }
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function formatFullDay(bucket: string): string {
  const date = new Date(`${bucket}T00:00:00`);
  if (Number.isNaN(date.getTime())) return bucket;
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function isValidRange(from: string, to: string): boolean {
  if (!from || !to) return true;
  return from <= to;
}
