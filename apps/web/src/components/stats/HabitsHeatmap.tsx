import { Fragment } from "react";
import { useStatsHabits } from "../../hooks/useStats.js";
import {
  buildHabitsMatrix,
  formatDurationMs,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT,
  type StatsHabitEntry,
  type StatsRange,
} from "../../lib/stats.js";
import { SectionCard } from "./SectionCard.js";

function cellBackground(intensity: number): string {
  if (intensity <= 0) return "var(--surface-soft)";
  if (intensity < 0.25) return "color-mix(in srgb, var(--color-pine-500) 45%, transparent)";
  if (intensity < 0.5) return "var(--color-pine-500)";
  if (intensity < 0.75) return "var(--color-ochre-600)";
  return "var(--color-ochre-400)";
}

interface HabitsHeatmapViewProps {
  items: StatsHabitEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

/// Mapa de calor semanal compartido por radio y podcasts.
export function HabitsHeatmapView({
  items,
  isLoading,
  isError,
  onRetry,
  title = "Hábitos",
  description = "Cuándo escuchas: día de la semana y hora local.",
  emptyTitle = "Sin hábitos todavía",
  emptyDescription = "Escucha en distintos momentos y aquí verás tu mapa semanal.",
}: HabitsHeatmapViewProps) {
  const isEmpty = !isLoading && !isError && items.length === 0;
  const matrix = buildHabitsMatrix(items);
  const max = Math.max(1, ...matrix.flat());

  return (
    <SectionCard
      title={title}
      description={description}
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onRetry={onRetry}
    >
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-1" role="grid" aria-label="Mapa de hábitos por hora y día">
          <span />
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="text-center text-[10px] text-faint">
              {hour % 3 === 0 ? `${hour}h` : ""}
            </span>
          ))}
          {matrix.map((row, weekday) => (
            <Fragment key={`row-${weekday}`}>
              <span className="flex items-center text-[11px] font-medium text-muted" role="rowheader">
                {WEEKDAY_SHORT[weekday]}
              </span>
              {row.map((totalMs, hour) => {
                const intensity = totalMs / max;
                const day = WEEKDAY_LABELS[weekday] ?? "";
                return (
                  <div
                    key={`${weekday}-${hour}`}
                    role="gridcell"
                    tabIndex={0}
                    title={`${day} ${hour}:00 — ${formatDurationMs(totalMs)}`}
                    aria-label={`${day} ${hour}:00 — ${formatDurationMs(totalMs)}`}
                    className="h-5 rounded-[4px] border border-line/60 outline-none transition focus-visible:ring-2 focus-visible:ring-pine-500"
                    style={{ backgroundColor: cellBackground(intensity) }}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <p className="text-xs text-faint">Lunes arriba · horas en local · intensidad según tu máximo.</p>
    </SectionCard>
  );
}

export function HabitsHeatmap({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = useStatsHabits(range);
  return (
    <HabitsHeatmapView
      items={data?.items ?? []}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
    />
  );
}
