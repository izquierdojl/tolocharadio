import { Link } from "react-router-dom";
import { Podcast as PodcastIcon, Rss } from "lucide-react";
import type { PodcastSummary } from "../../lib/types.js";
import { PodcastCover } from "./PodcastCover.js";

interface PodcastListItemProps {
  podcast: PodcastSummary;
  action?: React.ReactNode;
}

export function PodcastListItem({ podcast, action }: PodcastListItemProps) {
  return (
    <article className="group flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-2.5 transition hover:border-pine-600 hover:bg-surface-soft">
      <Link
        to={`/podcasts/${podcast.id}`}
        className="relative block size-12 shrink-0 overflow-hidden rounded-lg bg-pine-800"
      >
        <PodcastCover src={podcast.imageUrl} alt={podcast.title} className="size-full" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          to={`/podcasts/${podcast.id}`}
          className="truncate font-semibold text-foreground hover:underline"
          title={podcast.title}
        >
          {podcast.title}
        </Link>
        <p className="truncate text-xs text-muted" title={podcast.author ?? "Podcast"}>
          {podcast.author ?? "Podcast"}
        </p>
        <div className="flex flex-wrap items-center gap-1">
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
        </div>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </article>
  );
}
