import { Link } from "react-router-dom";
import { Loader2, Pause, Play } from "lucide-react";
import type { PodcastEpisode, PodcastSummary } from "../../lib/types.js";
import { PodcastCover } from "./PodcastCover.js";

function formatClock(rawSec: number): string {
  const total = Math.max(0, Math.round(rawSec));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

interface NowPlayingStripProps {
  episode: PodcastEpisode;
  podcast: PodcastSummary;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  onToggle: () => void;
}

export function NowPlayingStrip({
  episode,
  podcast,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  onToggle,
}: NowPlayingStripProps) {
  const elapsed = formatClock(currentTime);
  const total = duration > 0 ? formatClock(duration) : "--:--";
  const progressPct = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;
  const toggleLabel = isPlaying ? "Pausar" : "Reanudar";

  return (
    <section className="rounded-2xl border border-ochre-500/25 bg-surface-raised p-3">
      <div className="flex items-center gap-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-pine-800">
          <PodcastCover
            src={episode.imageUrl ?? podcast.imageUrl}
            alt=""
            className="size-full"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ochre-300">
            En reproducción
          </p>
          <Link
            to={`/podcasts/${podcast.id}`}
            className="block truncate text-sm font-semibold text-foreground hover:underline"
            title={episode.title}
          >
            {episode.title}
          </Link>
          <p className="truncate text-xs text-muted">{podcast.title}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-10 text-right text-[11px] tabular-nums text-faint">{elapsed}</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-soft">
              <div
                className="h-full rounded-full bg-ochre-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="w-10 text-[11px] tabular-nums text-faint">{total}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          title={toggleLabel}
          aria-label={toggleLabel}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ochre-500 text-pine-950 shadow-lg shadow-ochre-900/20 transition hover:bg-ochre-400"
        >
          {isBuffering ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="ml-0.5 size-4" />
          )}
        </button>
      </div>
    </section>
  );
}
