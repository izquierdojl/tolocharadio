import { Link } from "react-router-dom";
import { Podcast as PodcastIcon, Rss } from "lucide-react";
import type { PodcastSummary } from "../../lib/types.js";
import { PodcastCover } from "./PodcastCover.js";

interface PodcastCardProps {
  podcast: PodcastSummary;
  action?: React.ReactNode;
}

export function PodcastCard({ podcast, action }: PodcastCardProps) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised transition hover:border-pine-600 hover:shadow-xl hover:shadow-black/30">
      <Link to={`/podcasts/${podcast.id}`} className="relative block aspect-square w-full overflow-hidden bg-pine-800">
        <PodcastCover src={podcast.imageUrl} alt={podcast.title} className="size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-pine-950/70 via-transparent to-transparent" />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link to={`/podcasts/${podcast.id}`} className="truncate font-semibold text-foreground hover:underline" title={podcast.title}>
          {podcast.title}
        </Link>
        <p className="truncate text-xs text-muted">{podcast.author ?? "Podcast"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-pine-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-pine-300">
            <PodcastIcon className="size-3" />
            {podcast.episodeCount} {podcast.episodeCount === 1 ? "episodio" : "episodios"}
          </span>
          {podcast.isSubscribed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ochre-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ochre-300">
              <Rss className="size-3" />
              Suscrito
            </span>
          ) : null}
          {action ? <div className="ml-auto">{action}</div> : null}
        </div>
      </div>
    </article>
  );
}
