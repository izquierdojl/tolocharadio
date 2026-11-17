import type { PodcastEpisode, PodcastSummary } from "../../lib/types.js";
import { usePlayerStore } from "../../stores/player.js";

export interface EpisodePlaybackState {
  isCurrent: boolean;
  isPlaying: boolean;
  isFailed: boolean;
  playTitle: string;
  handlePlay: () => void;
}

export function useEpisodePlayback(
  episode: PodcastEpisode,
  podcast: PodcastSummary | null,
): EpisodePlaybackState {
  const playEpisode = usePlayerStore((s) => s.playEpisode);
  const togglePlayback = usePlayerStore((s) => s.toggle);
  const retryPlayback = usePlayerStore((s) => s.retry);
  const isCurrent = usePlayerStore((s) => s.kind === "podcast" && s.episode?.id === episode.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying && isCurrent);
  const status = usePlayerStore((s) => (s.episode?.id === episode.id ? s.status : null));
  const isFailed = isCurrent && status === "failed";
  const playTitle = isFailed ? "Reintentar" : isPlaying ? "Pausar" : "Reproducir";

  const handlePlay = (): void => {
    if (!podcast) return;
    if (isCurrent) {
      if (isFailed) {
        retryPlayback();
      } else {
        togglePlayback();
      }
      return;
    }
    playEpisode(episode, podcast);
  };

  return { isCurrent, isPlaying, isFailed, playTitle, handlePlay };
}
