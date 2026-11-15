import { CheckCircle2, History as HistoryIcon } from "lucide-react";
import { usePodcastStatsRecent } from "../../hooks/usePodcastStats.js";
import { formatDurationMs, type PodcastStatsRecent } from "../../lib/stats.js";
import { formatAbsoluteDate, timeAgo } from "../../lib/time.js";
import { EmptyState } from "../EmptyState.js";
import { PodcastCover } from "./PodcastCover.js";

export function RecentEpisodesList({ items }: { items: PodcastStatsRecent[] }) {
  const maxMs = Math.max(1, ...items.map((item) => item.listenedMs));

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={`${item.episodeId}-${item.startedAt}-${index}`}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
        >
          <PodcastCover src={item.imageUrl} className="size-10 shrink-0 rounded-lg border border-line" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium text-foreground">{item.episodeTitle}</span>
              <span className="shrink-0 text-xs text-muted">{formatDurationMs(item.listenedMs)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-faint">{item.podcastTitle}</span>
              <span title={formatAbsoluteDate(item.startedAt)} className="shrink-0 text-xs text-faint">
                {timeAgo(item.startedAt)}
              </span>
            </div>
            <div
              className="h-1 overflow-hidden rounded-full bg-surface-soft"
              role="progressbar"
              aria-valuenow={Math.round((item.listenedMs / maxMs) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${item.episodeTitle}: ${formatDurationMs(item.listenedMs)}`}
            >
              <div
                className="h-full rounded-full bg-pine-400"
                style={{ width: `${Math.max(4, (item.listenedMs / maxMs) * 100)}%` }}
              />
            </div>
          </div>
          {item.completed ? (
            <span className="shrink-0 text-pine-300" title="Completado">
              <CheckCircle2 className="size-4" />
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function RecentEpisodes() {
  const { data, isLoading, isError, refetch } = usePodcastStatsRecent(20);
  const items = data?.items ?? [];

  return (
    <section
      aria-label="Episodios recientes"
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-foreground">Escuchas recientes</h2>
        <p className="text-sm text-muted">Tus últimas sesiones de podcast con su duración.</p>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-faint">Cargando…</p>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-rose-400">No se pudieron cargar las escuchas recientes.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-foreground transition hover:border-pine-500 hover:bg-surface-soft"
          >
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="size-7" />}
          title="Sin escuchas recientes"
          description="Cuando escuches episodios, aquí verás tus últimas sesiones."
        />
      ) : (
        <RecentEpisodesList items={items} />
      )}
    </section>
  );
}
