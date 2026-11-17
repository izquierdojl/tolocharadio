import { Check } from "lucide-react";
import type { PodcastEpisode, PodcastSummary } from "../../lib/types.js";
import { formatEpisodeDate, formatEpisodeDuration } from "../../lib/podcastFormat.js";
import { PodcastCover } from "./PodcastCover.js";

export interface EpisodeDetailBodyProps {
  episode: PodcastEpisode;
  podcast: PodcastSummary;
  titleId: string;
  position: number;
  totalDuration: number;
}

export function EpisodeDetailBody({
  episode,
  podcast,
  titleId,
  position,
  totalDuration,
}: EpisodeDetailBodyProps) {
  const published = formatEpisodeDate(episode.publishedAt);
  const episodeDuration =
    formatEpisodeDuration(episode.durationSec) ??
    formatEpisodeDuration(episode.progress?.durationSec);
  const seasonEpisode =
    episode.seasonNumber && episode.episodeNumber
      ? `T${episode.seasonNumber} · E${episode.episodeNumber}`
      : episode.seasonNumber
        ? `T${episode.seasonNumber}`
        : episode.episodeNumber
          ? `E${episode.episodeNumber}`
          : null;

  const progressPct =
    totalDuration > 0 ? Math.min(100, Math.round((position / totalDuration) * 100)) : null;
  const showProgress = !episode.progress?.completed && progressPct !== null && position > 0;
  const positionLabel = formatEpisodeDuration(position);
  const totalLabel = formatEpisodeDuration(totalDuration);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-pine-800 sm:h-36 sm:w-36">
          <PodcastCover src={episode.imageUrl ?? podcast.imageUrl} alt="" className="size-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2
            id={titleId}
            className="break-words text-xl font-bold leading-tight text-foreground sm:text-2xl"
          >
            {episode.title}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
            {published ? <span>{published}</span> : null}
            {episodeDuration ? <span>{episodeDuration}</span> : null}
            {seasonEpisode ? <span>{seasonEpisode}</span> : null}
            {episode.explicit ? (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300">
                Explícito
              </span>
            ) : null}
          </div>
          {podcast.author ? <p className="text-sm text-muted">{podcast.author}</p> : null}
          {episode.progress?.completed ? (
            <p className="inline-flex items-center gap-1 text-sm text-moss-400">
              <Check className="size-4" /> Completado
            </p>
          ) : showProgress && progressPct !== null ? (
            <div className="mt-1 flex flex-col gap-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                <div className="h-full rounded-full bg-ochre-500" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-faint">
                {positionLabel ?? "0:00"} de {totalLabel ?? "duración desconocida"}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {episode.description ? (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">
            Descripción
          </h3>
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-soft">
            {episode.description}
          </p>
        </div>
      ) : null}
    </>
  );
}
