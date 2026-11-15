import { CheckCircle2 } from "lucide-react";
import { usePodcastStatsTopEpisodes } from "../../hooks/usePodcastStats.js";
import { formatDurationMs, type PodcastStatsTopEpisode, type StatsRange } from "../../lib/stats.js";
import { SectionCard } from "../stats/SectionCard.js";
import { PodcastCover } from "./PodcastCover.js";

export function TopEpisodesList({ items }: { items: PodcastStatsTopEpisode[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={item.episodeId}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
        >
          <span className="w-5 shrink-0 text-center text-sm font-semibold text-faint">{index + 1}</span>
          <PodcastCover src={item.imageUrl} className="size-10 shrink-0 rounded-lg border border-line" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
            <span className="truncate text-xs text-faint">{item.podcastTitle}</span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-xs text-muted">{formatDurationMs(item.totalMs)}</span>
            {item.completed ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-pine-300">
                <CheckCircle2 className="size-3.5" />
                Completado
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TopEpisodes({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = usePodcastStatsTopEpisodes(range, 10);
  const items = data?.items ?? [];
  const isEmpty = !isLoading && !isError && items.length === 0;

  return (
    <SectionCard
      title="Episodios más escuchados"
      description="Tus episodios con más tiempo acumulado."
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      emptyTitle="Aún no tienes episodios"
      emptyDescription="Cuando escuches episodios, aquí verás tu ranking."
      onRetry={() => void refetch()}
    >
      <TopEpisodesList items={items} />
    </SectionCard>
  );
}
