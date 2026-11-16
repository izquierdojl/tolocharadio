import { isQueueEpisodeActive } from "../../lib/podcastQueue.js";
import { usePlayerStore } from "../../stores/player.js";
import { NowPlayingStrip } from "./NowPlayingStrip.js";

/// Tira conectada al reproductor: solo se muestra mientras el episodio está activo.
export function ActiveNowPlayingStrip() {
  const episode = usePlayerStore((s) => (s.kind === "podcast" ? s.episode : null));
  const podcast = usePlayerStore((s) => (s.kind === "podcast" ? s.podcast : null));
  const status = usePlayerStore((s) => s.status);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const toggle = usePlayerStore((s) => s.toggle);

  if (!episode || !podcast || !isQueueEpisodeActive(status)) return null;

  return (
    <NowPlayingStrip
      episode={episode}
      podcast={podcast}
      isPlaying={isPlaying}
      isBuffering={isBuffering}
      currentTime={currentTime}
      duration={duration}
      onToggle={toggle}
    />
  );
}
