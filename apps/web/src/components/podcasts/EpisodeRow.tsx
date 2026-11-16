import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, Heart, Pause, Play, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { addPodcastFavorite, removePodcastFavorite } from "../../lib/api.js";
import type { PodcastEpisode, PodcastSummary } from "../../lib/types.js";
import { usePlayerStore } from "../../stores/player.js";
import { EpisodeQueueMenu } from "./EpisodeQueueMenu.js";
import { PodcastCover } from "./PodcastCover.js";

function formatDuration(rawSec: number | null | undefined): string | null {
  if (rawSec === null || rawSec === undefined || !Number.isFinite(rawSec) || rawSec <= 0) {
    return null;
  }
  const total = Math.round(rawSec);
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

function formatEpisodeDate(ts: number | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface EpisodeRowProps {
  episode: PodcastEpisode;
  podcast: PodcastSummary;
  showPodcast?: boolean;
  onDismiss?: () => void;
}

export function EpisodeRow({ episode, podcast, showPodcast = false, onDismiss }: EpisodeRowProps) {
  const queryClient = useQueryClient();
  const playEpisode = usePlayerStore((s) => s.playEpisode);
  const togglePlayback = usePlayerStore((s) => s.toggle);
  const retryPlayback = usePlayerStore((s) => s.retry);
  const isCurrent = usePlayerStore((s) => s.kind === "podcast" && s.episode?.id === episode.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying && isCurrent);
  const status = usePlayerStore((s) => (s.episode?.id === episode.id ? s.status : null));
  const isFailed = isCurrent && status === "failed";

  const playTitle = isFailed ? "Reintentar" : isPlaying ? "Pausar" : "Reproducir";
  const handlePlay = (): void => {
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

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["podcast-home"] });
    void queryClient.invalidateQueries({ queryKey: ["podcast-favorites"] });
    void queryClient.invalidateQueries({ queryKey: ["podcast-queue"] });
    void queryClient.invalidateQueries({ queryKey: ["podcast-queue-count"] });
    void queryClient.invalidateQueries({ queryKey: ["podcast-episodes", podcast.id] });
  };

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (episode.isFavorite) {
        await removePodcastFavorite(episode.id);
      } else {
        await addPodcastFavorite(episode.id);
      }
    },
    onSuccess: () => {
      toast.success(episode.isFavorite ? "Quitado de favoritos" : "Añadido a favoritos");
      invalidate();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el favorito");
    },
  });

  const duration = formatDuration(episode.durationSec ?? episode.progress?.durationSec);
  const published = formatEpisodeDate(episode.publishedAt);
  const progress = episode.progress;
  const progressPct =
    progress && progress.durationSec && progress.durationSec > 0
      ? Math.min(100, Math.round((progress.positionSec / progress.durationSec) * 100))
      : null;

  return (
    <article className="flex gap-3 rounded-xl border border-line bg-surface-raised p-3 transition hover:border-pine-600">
      <div className="relative hidden size-16 shrink-0 overflow-hidden rounded-lg bg-pine-800 sm:block">
        <PodcastCover
          src={episode.imageUrl ?? podcast.imageUrl}
          alt=""
          className="size-full"
        />
        <button
          type="button"
          onClick={handlePlay}
          title={isFailed ? "Reintentar episodio" : isPlaying ? "Pausar episodio" : "Reproducir episodio"}
          aria-label={isFailed ? "Reintentar episodio" : isPlaying ? "Pausar episodio" : "Reproducir episodio"}
          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition hover:opacity-100 focus:opacity-100"
        >
          {isFailed ? (
            <RotateCcw className="size-5" />
          ) : isPlaying ? (
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
            <h3 className="truncate font-semibold text-foreground" title={episode.title}>
              {episode.title}
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

        <div className="mt-1 flex items-center gap-1">
          <button
            type="button"
            onClick={handlePlay}
            title={playTitle}
            aria-label={playTitle}
            className="inline-flex items-center gap-1 rounded-lg bg-pine-700 px-2.5 py-1 text-xs font-medium text-pine-100 transition hover:bg-pine-600"
          >
            {isFailed ? (
              <RotateCcw className="size-3.5" />
            ) : isPlaying ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
            {isFailed ? "Reintentar" : isPlaying ? "Pausar" : "Reproducir"}
          </button>
          <EpisodeQueueMenu episodeId={episode.id} />
          <button
            type="button"
            onClick={() => favoriteMutation.mutate()}
            disabled={favoriteMutation.isPending}
            title={episode.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            aria-label={episode.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            aria-pressed={Boolean(episode.isFavorite)}
            className={`ml-auto inline-flex size-8 items-center justify-center rounded-lg transition hover:bg-surface-soft disabled:opacity-50 ${
              episode.isFavorite ? "text-rose-400" : "text-muted hover:text-foreground"
            }`}
          >
            <Heart className={`size-4 ${episode.isFavorite ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </article>
  );
}
