import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchPodcast,
  fetchPodcastEpisodes,
  fetchPodcastQueue,
  removeEpisodeFromQueue,
} from "../../lib/api.js";
import { nextQueueEpisode } from "../../lib/podcastQueue.js";
import type { PodcastEpisode } from "../../lib/types.js";
import {
  registerEpisodeEndedHook,
  registerPodcastQueueActionHandler,
  usePlayerStore,
} from "../../stores/player.js";

/// Al terminar un episodio, lo retira de la cola y reproduce el siguiente pendiente.
export function PodcastAutoAdvance() {
  const queryClient = useQueryClient();

  useEffect(() => {
    registerEpisodeEndedHook(async (episode) => {
      const player = usePlayerStore.getState();
      let next: PodcastEpisode | null = null;

      try {
        const { queue } = await fetchPodcastQueue();
        next = nextQueueEpisode(queue.items, episode.id);
        if (queue.items.some((item) => item.id === episode.id)) {
          await removeEpisodeFromQueue(episode.id);
        }
      } catch {
        // Sin cola accesible: el episodio termina y el reproductor se detiene.
      }

      void queryClient.invalidateQueries({ queryKey: ["podcast-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });

      if (!next) {
        player.stop();
        return;
      }

      try {
        const nextEpisode = next;
        const [{ podcast }, page] = await Promise.all([
          fetchPodcast(nextEpisode.podcastId),
          fetchPodcastEpisodes(nextEpisode.podcastId, { limit: 100 }),
        ]);
        const fullEpisode = page.items.find((item) => item.id === nextEpisode.id) ?? nextEpisode;
        player.playEpisode(fullEpisode, podcast, { startPositionSec: 0 });
      } catch {
        player.stop();
      }
    });

    return () => registerEpisodeEndedHook(null);
  }, [queryClient]);

  useEffect(() => {
    registerPodcastQueueActionHandler(async (action) => {
      const player = usePlayerStore.getState();
      if (player.kind !== "podcast" || !player.episode) return;

      if (action === "previous") {
        player.seek(0);
        return;
      }

      try {
        const { queue } = await fetchPodcastQueue();
        const next = queue.items.find((item) => item.id !== player.episode?.id);
        if (!next) return;
        const [{ podcast }, page] = await Promise.all([
          fetchPodcast(next.podcastId),
          fetchPodcastEpisodes(next.podcastId, { limit: 100 }),
        ]);
        const fullEpisode = page.items.find((item) => item.id === next.id) ?? next;
        player.playEpisode(fullEpisode, podcast, { startPositionSec: 0 });
      } catch {
        // Sin cola disponible: se mantiene la reproducción actual.
      }
    });

    return () => registerPodcastQueueActionHandler(null);
  }, []);

  return null;
}
