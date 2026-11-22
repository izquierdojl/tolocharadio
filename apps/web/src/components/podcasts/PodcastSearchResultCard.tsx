import { Rss } from "lucide-react";
import type { PodcastSearchResult } from "../../lib/types.js";
import { PodcastCover } from "./PodcastCover.js";

export function PodcastSearchResultCard({
  result,
  onSubscribe,
  pending,
}: {
  result: PodcastSearchResult;
  onSubscribe: (feedUrl: string) => void;
  pending: boolean;
}): React.JSX.Element {
  return (
    <article className="flex gap-3 rounded-2xl border border-line bg-surface-raised p-3">
      <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-pine-800">
        <PodcastCover src={result.imageUrl} alt={result.title} className="size-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate font-semibold text-foreground">{result.title}</h3>
        <p className="truncate text-xs text-muted">{result.author ?? "Podcast"}</p>
        {result.description ? (
          <p className="line-clamp-2 text-sm text-muted">{result.description}</p>
        ) : null}
        <div className="mt-auto flex items-center gap-2">
          {result.categories.slice(0, 2).map((category) => (
            <span
              key={category}
              className="rounded-full bg-pine-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-pine-300"
            >
              {category}
            </span>
          ))}
          <button
            type="button"
            onClick={() => onSubscribe(result.feedUrl)}
            disabled={pending}
            className="ml-auto inline-flex items-center gap-1 rounded-lg bg-pine-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-pine-500 disabled:opacity-50"
          >
            <Rss className="size-3.5" />
            Suscribirse
          </button>
        </div>
      </div>
    </article>
  );
}
