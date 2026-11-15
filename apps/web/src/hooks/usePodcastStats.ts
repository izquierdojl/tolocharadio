import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";
import type {
  PodcastStatsCategory,
  PodcastStatsRecent,
  PodcastStatsSummary,
  PodcastStatsTopEpisode,
  PodcastStatsTopPodcast,
  StatsHabitEntry,
  StatsRange,
  StatsTimelineEntry,
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

function usePodcastStatsEnabled(): boolean {
  return useAuthStore((s) => s.status) === "authenticated";
}

export function usePodcastStatsSummary(range: StatsRange) {
  const enabled = usePodcastStatsEnabled();
  return useQuery({
    queryKey: ["podcast-stats", "summary", range.from ?? null, range.to ?? null],
    queryFn: () =>
      api.get<PodcastStatsSummary>(
        `/podcasts/stats/summary${toQuery({ from: range.from, to: range.to })}`,
      ),
    enabled,
  });
}

export function usePodcastStatsTopPodcasts(range: StatsRange, limit = 10) {
  const enabled = usePodcastStatsEnabled();
  return useQuery({
    queryKey: ["podcast-stats", "top-podcasts", range.from ?? null, range.to ?? null, limit],
    queryFn: () =>
      api.get<{ items: PodcastStatsTopPodcast[] }>(
        `/podcasts/stats/top-podcasts${toQuery({ from: range.from, to: range.to, limit })}`,
      ),
    enabled,
  });
}

export function usePodcastStatsTopEpisodes(range: StatsRange, limit = 10) {
  const enabled = usePodcastStatsEnabled();
  return useQuery({
    queryKey: ["podcast-stats", "top-episodes", range.from ?? null, range.to ?? null, limit],
    queryFn: () =>
      api.get<{ items: PodcastStatsTopEpisode[] }>(
        `/podcasts/stats/top-episodes${toQuery({ from: range.from, to: range.to, limit })}`,
      ),
    enabled,
  });
}

export function usePodcastStatsTimeline(range: StatsRange, granularity: TimelineGranularity) {
  const enabled = usePodcastStatsEnabled();
  return useQuery({
    queryKey: ["podcast-stats", "timeline", range.from ?? null, range.to ?? null, granularity],
    queryFn: () =>
      api.get<{ granularity: TimelineGranularity; items: StatsTimelineEntry[] }>(
        `/podcasts/stats/timeline${toQuery({ from: range.from, to: range.to, granularity })}`,
      ),
    enabled,
  });
}

export function usePodcastStatsHabits(range: StatsRange) {
  const enabled = usePodcastStatsEnabled();
  return useQuery({
    queryKey: ["podcast-stats", "habits", range.from ?? null, range.to ?? null],
    queryFn: () =>
      api.get<{ items: StatsHabitEntry[] }>(
        `/podcasts/stats/habits${toQuery({ from: range.from, to: range.to })}`,
      ),
    enabled,
  });
}

export function usePodcastStatsCategories(range: StatsRange, limit = 10) {
  const enabled = usePodcastStatsEnabled();
  return useQuery({
    queryKey: ["podcast-stats", "categories", range.from ?? null, range.to ?? null, limit],
    queryFn: () =>
      api.get<{ items: PodcastStatsCategory[] }>(
        `/podcasts/stats/categories${toQuery({ from: range.from, to: range.to, limit })}`,
      ),
    enabled,
  });
}

export function usePodcastStatsRecent(limit = 20) {
  const enabled = usePodcastStatsEnabled();
  return useQuery({
    queryKey: ["podcast-stats", "recent", limit],
    queryFn: () =>
      api.get<{ items: PodcastStatsRecent[] }>(
        `/podcasts/stats/recent${toQuery({ limit })}`,
      ),
    enabled,
  });
}
