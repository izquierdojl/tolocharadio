import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import type { PodcastEpisode, PodcastSummary } from "../../lib/types.js";
import { useEpisodeDetailStore } from "../../stores/episodeDetail.js";
import { usePlayerStore } from "../../stores/player.js";
import { EpisodeDetailBody } from "./EpisodeDetailBody.js";
import { EpisodeDownloadButton } from "./EpisodeDownloadButton.js";
import { EpisodeFavoriteButton } from "./EpisodeFavoriteButton.js";
import { EpisodeQueueMenu } from "./EpisodeQueueMenu.js";
import { useEpisodeFavorite } from "./useEpisodeFavorite.js";
import { useEpisodePlayback } from "./useEpisodePlayback.js";

function EpisodeDetailContent({
  episode,
  podcast,
}: {
  episode: PodcastEpisode;
  podcast: PodcastSummary;
}) {
  const close = useEpisodeDetailStore((s) => s.close);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const playback = useEpisodePlayback(episode, podcast);
  const favorite = useEpisodeFavorite({
    episodeId: episode.id,
    isFavorite: Boolean(episode.isFavorite),
  });
  const currentTime = usePlayerStore((s) => (playback.isCurrent ? s.currentTime : 0));
  const currentDuration = usePlayerStore((s) =>
    playback.isCurrent && s.duration > 0 ? s.duration : 0,
  );

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        if (dialogRef.current?.querySelector('[role="menu"]')) return;
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close]);

  const storedPosition = episode.progress?.positionSec ?? 0;
  const position = playback.isCurrent ? currentTime : storedPosition;
  const totalDuration =
    playback.isCurrent && currentDuration > 0
      ? currentDuration
      : (episode.progress?.durationSec ?? episode.durationSec ?? 0);

  return (
    <div
      className="fade-enter fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={close}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface-raised shadow-2xl shadow-black/40 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <Link
            to={`/podcasts/${podcast.id}`}
            onClick={close}
            className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-ochre-300 hover:underline"
          >
            {podcast.title}
          </Link>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Cerrar ficha del episodio"
            title="Cerrar"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <EpisodeDetailBody
            episode={episode}
            podcast={podcast}
            titleId={titleId}
            position={position}
            totalDuration={totalDuration}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={playback.handlePlay}
            title={playback.playTitle}
            aria-label={playback.playTitle}
            className="inline-flex items-center gap-1.5 rounded-lg bg-pine-700 px-3 py-2 text-sm font-medium text-pine-100 transition hover:bg-pine-600"
          >
            {playback.isFailed ? (
              <RotateCcw className="size-4" />
            ) : playback.isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {playback.playTitle}
          </button>
          <EpisodeQueueMenu episodeId={episode.id} direction="up" />
          <EpisodeFavoriteButton
            isFavorite={favorite.isFavorite}
            pending={favorite.pending}
            onToggle={favorite.toggle}
          />
          <EpisodeDownloadButton
            episodeId={episode.id}
            episodeTitle={episode.title}
            variant="label"
          />
        </div>
      </div>
    </div>
  );
}

export function EpisodeDetailDialog() {
  const episode = useEpisodeDetailStore((s) => s.episode);
  const podcast = useEpisodeDetailStore((s) => s.podcast);

  if (!episode || !podcast) return null;

  return <EpisodeDetailContent episode={episode} podcast={podcast} />;
}
