import { History as HistoryIcon, Radio } from "lucide-react";
import { useStatsRecent } from "../../hooks/useStats.js";
import { formatAbsoluteDate, timeAgo } from "../../lib/time.js";
import { formatDurationMs } from "../../lib/stats.js";
import { EmptyState } from "../EmptyState.js";

export function RecentList() {
  const { data, isLoading, isError, refetch } = useStatsRecent(20);
  const items = data?.items ?? [];
  const maxMs = Math.max(1, ...items.map((item) => item.durationMs));

  if (isLoading) {
    return (
      <section aria-label="Escuchas recientes" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
        <h2 className="font-semibold text-foreground">Escuchas recientes</h2>
        <p className="py-8 text-center text-sm text-faint">Cargando…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-label="Escuchas recientes" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
        <h2 className="font-semibold text-foreground">Escuchas recientes</h2>
        <EmptyState
          icon={<HistoryIcon className="size-6" />}
          title="No se pudieron cargar tus escuchas"
          description="Hubo un problema al recuperar tus escuchas recientes. Inténtalo de nuevo."
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg bg-ochre-500 px-4 py-2 text-sm font-medium text-pine-950 hover:bg-ochre-400"
            >
              Reintentar
            </button>
          }
        />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section aria-label="Escuchas recientes" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
        <h2 className="font-semibold text-foreground">Escuchas recientes</h2>
        <EmptyState
          icon={<HistoryIcon className="size-6" />}
          title="Todavía no hay escuchas"
          description="Cuando reproduzcas una emisora, la registraremos aquí con su duración."
        />
      </section>
    );
  }

  return (
    <section aria-label="Escuchas recientes" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-foreground">Escuchas recientes</h2>
        <p className="text-sm text-muted">Tus últimas sesiones con su duración.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={`${item.station.id}-${item.startedAt}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
          >
            {item.station.favicon ? (
              <img
                src={item.station.favicon}
                alt=""
                loading="lazy"
                className="size-10 shrink-0 rounded-lg border border-line object-cover"
              />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-pine-800 text-pine-300">
                <Radio className="size-5" />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{item.station.name}</span>
                <span className="shrink-0 text-xs text-muted">{formatDurationMs(item.durationMs)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span title={formatAbsoluteDate(item.startedAt)} className="truncate text-xs text-faint">
                  {timeAgo(item.startedAt)} · {formatAbsoluteDate(item.startedAt)}
                </span>
              </div>
              <div
                className="h-1 overflow-hidden rounded-full bg-surface-soft"
                role="progressbar"
                aria-valuenow={Math.round((item.durationMs / maxMs) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.station.name}: ${formatDurationMs(item.durationMs)}`}
              >
                <div
                  className="h-full rounded-full bg-pine-400"
                  style={{ width: `${Math.max(4, (item.durationMs / maxMs) * 100)}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
