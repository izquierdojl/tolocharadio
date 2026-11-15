import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchPodcast } from "../../lib/api.js";
import type { PodcastSummary } from "../../lib/types.js";

/// Resuelve los podcasts referenciados por episodios, reutilizando los ya conocidos.
export function usePodcastSummaries(
  ids: number[],
  known: PodcastSummary[] = [],
): Map<number, PodcastSummary> {
  const uniqueIds = useMemo(() => {
    const seen = new Set(known.map((podcast) => podcast.id));
    const result: number[] = [];
    for (const id of ids) {
      if (seen.has(id) || result.includes(id)) continue;
      result.push(id);
    }
    return result;
  }, [ids, known]);

  const queries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ["podcast", id],
      queryFn: () => fetchPodcast(id),
      staleTime: 5 * 60_000,
    })),
  });

  return useMemo(() => {
    const map = new Map<number, PodcastSummary>(known.map((podcast) => [podcast.id, podcast]));
    for (const query of queries) {
      if (query.data) map.set(query.data.podcast.id, query.data.podcast);
    }
    return map;
  }, [known, queries]);
}
