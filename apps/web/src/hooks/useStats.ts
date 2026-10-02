import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";
import type {
  StatsCountryEntry,
  StatsGenreEntry,
  StatsHabitEntry,
  StatsRange,
  StatsRecentEntry,
  StatsTimelineEntry,
  StatsTopEntry,
  TimelineGranularity,
} from "../lib/stats.js";

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function useStatsEnabled(): boolean {
  return useAuthStore((s) => s.status) === "authenticated";
}

export function useStatsTop(range: StatsRange, limit = 10) {
  const enabled = useStatsEnabled();
  return useQuery({
    queryKey: ["stats", "top", range.from ?? null, range.to ?? null, limit],
    queryFn: () =>
      api.get<{ items: StatsTopEntry[] }>(
        `/stats/me/top${toQuery({ from: range.from, to: range.to, limit })}`,
      ),
    enabled,
  });
}

export function useStatsTimeline(range: StatsRange, granularity: TimelineGranularity) {
  const enabled = useStatsEnabled();
  return useQuery({
    queryKey: ["stats", "timeline", range.from ?? null, range.to ?? null, granularity],
    queryFn: () =>
      api.get<{ granularity: TimelineGranularity; items: StatsTimelineEntry[] }>(
        `/stats/me/timeline${toQuery({ from: range.from, to: range.to, granularity })}`,
      ),
    enabled,
  });
}

export function useStatsHabits(range: StatsRange) {
  const enabled = useStatsEnabled();
  return useQuery({
    queryKey: ["stats", "habits", range.from ?? null, range.to ?? null],
    queryFn: () =>
      api.get<{ items: StatsHabitEntry[] }>(
        `/stats/me/habits${toQuery({ from: range.from, to: range.to })}`,
      ),
    enabled,
  });
}

export function useStatsGenres(range: StatsRange, limit = 10) {
  const enabled = useStatsEnabled();
  return useQuery({
    queryKey: ["stats", "genres", range.from ?? null, range.to ?? null, limit],
    queryFn: () =>
      api.get<{ items: StatsGenreEntry[] }>(
        `/stats/me/genres${toQuery({ from: range.from, to: range.to, limit })}`,
      ),
    enabled,
  });
}

export function useStatsCountries(range: StatsRange) {
  const enabled = useStatsEnabled();
  return useQuery({
    queryKey: ["stats", "countries", range.from ?? null, range.to ?? null],
    queryFn: () =>
      api.get<{ items: StatsCountryEntry[] }>(
        `/stats/me/countries${toQuery({ from: range.from, to: range.to })}`,
      ),
    enabled,
  });
}

export function useStatsRecent(limit = 20) {
  const enabled = useStatsEnabled();
  return useQuery({
    queryKey: ["stats", "recent", limit],
    queryFn: () =>
      api.get<{ items: StatsRecentEntry[] }>(`/stats/me/recent${toQuery({ limit })}`),
    enabled,
  });
}
