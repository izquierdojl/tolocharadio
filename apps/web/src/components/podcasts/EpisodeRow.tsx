import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Check, Pause, Play, RotateCcw, X } from "lucide-react";
import type { PodcastEpisode, PodcastSummary } from "../../lib/types.js";
import { formatEpisodeDate, formatEpisodeDuration } from "../../lib/podcastFormat.js";
import { useEpisodeDetailStore } from "../../stores/episodeDetail.js";
import { EpisodeDownloadButton } from "./EpisodeDownloadButton.js";
import { EpisodeFavoriteButton } from "./EpisodeFavoriteButton.js";
import { EpisodeQueueMenu } from "./EpisodeQueueMenu.js";
import { PodcastCover } from "./PodcastCover.js";
import { useEpisodeFavorite } from "./useEpisodeFavorite.js";
import { useEpisodePlayback } from "./useEpisodePlayback.js";

interface EpisodeRowProps {
  episode: PodcastEpisode;
  podcast: PodcastSummary;
  showPodcast?: boolean;
  onDismiss?: () => void;
}

export function EpisodeRow({ episode, podcast, showPodcast = false, onDismiss }: EpisodeRowProps) {
  const openDetail = useEpisodeDetailStore((s) => s.open);
  const playback = useEpisodePlayback(episode, podcast);
  const favorite = useEpisodeFavorite({
    episodeId: episode.id,
    isFavorite: Boolean(episode.isFavorite),
  });

  const duration = formatEpisodeDuration(episode.durationSec ?? episode.progress?.durationSec);
  const published = formatEpisodeDate(episode.publishedAt);
  const progress = episode.progress;
  const progressPct =
    progress && progress.durationSec && progress.durationSec > 0
      ? Math.min(100, Math.round((progress.positionSec / progress.durationSec) * 100))
      : null;

  const handleCardClick = (event: MouseEvent<HTMLElement>): void => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    const titleButton = event.currentTarget.querySelector<HTMLButtonElement>(
      "[data-episode-title]",
    );
    openDetail(episode, podcast, titleButton);
  };

  return (
    <article
      onClick={handleCardClick}
      className="flex cursor-pointer gap-3 rounded-xl border border-line bg-surface-raised p-3 transition hover:border-pine-600"
    >
      <div className="relative hidden size-16 shrink-0 overflow-hidden rounded-lg bg-pine-800 sm:block">
        <PodcastCover
          src={episode.imageUrl ?? podcast.imageUrl}
          alt=""
          className="size-full"
        />
        <button
          type="button"
          onClick={playback.handlePlay}
          title={
            playback.isFailed
              ? "Reintentar episodio"
              : playback.isPlaying
                ? "Pausar episodio"
                : "Reproducir episodio"
          }
          aria-label={
            playback.isFailed
              ? "Reintentar episodio"
              : playback.isPlaying
                ? "Pausar episodio"
                : "Reproducir episodio"
          }
          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition hover:opacity-100 focus:opacity-100"
        >
          {playback.isFailed ? (
            <RotateCcw className="size-5" />
          ) : playback.isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="ml-0.5 size-5" />
          )}
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {showPodcast ? (
              <Link
                to={`/podcasts/${podcast.id}`}
                className="truncate text-xs font-medium uppercase tracking-wide text-ochre-300 hover:underline"
              >
                {podcast.title}
              </Link>
            ) : null}
            <h3 className="min-w-0 font-semibold text-foreground">
              <button
                type="button"
                data-episode-title
                onClick={(event) => openDetail(episode, podcast, event.currentTarget)}
                title={episode.title}
                className="block w-full truncate text-left hover:underline"
              >
                {episode.title}
              </button>
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-faint">
              {published ? <span>{published}</span> : null}
              {duration ? <span>{duration}</span> : null}
              {progress?.completed ? (
                <span className="inline-flex items-center gap-1 text-moss-400">
                  <Check className="size-3" /> Completado
                </span>
              ) : null}
            </p>
          </div>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              title="Descartar de Continuar escuchando"
              aria-label="Descartar de Continuar escuchando"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-rose-400"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {episode.description ? (
          <p className="line-clamp-2 text-sm text-muted">{episode.description}</p>
        ) : null}

        {progressPct !== null && !progress?.completed ? (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-soft">
            <div className="h-full rounded-full bg-ochre-500" style={{ width: `${progressPct}%` }} />
          </div>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={playback.handlePlay}
            title={playback.playTitle}
            aria-label={playback.playTitle}
            className="inline-flex items-center gap-1 rounded-lg bg-pine-700 px-2.5 py-1 text-xs font-medium text-pine-100 transition hover:bg-pine-600"
          >
            {playback.isFailed ? (
              <RotateCcw className="size-3.5" />
            ) : playback.isPlaying ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
            {playback.playTitle}
          </button>
          <EpisodeQueueMenu episodeId={episode.id} />
          <EpisodeDownloadButton episodeId={episode.id} episodeTitle={episode.title} />
          <EpisodeFavoriteButton
            isFavorite={favorite.isFavorite}
            pending={favorite.pending}
            onToggle={favorite.toggle}
            className="ml-auto"
          />
        </div>
      </div>
    </article>
  );
}
