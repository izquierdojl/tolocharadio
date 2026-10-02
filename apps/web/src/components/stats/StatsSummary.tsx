import { Clock3, Disc3, Flame } from "lucide-react";
import { useStatsTimeline, useStatsTop } from "../../hooks/useStats.js";
import {
  formatDurationMs,
  formatFullDay,
  type StatsRange,
} from "../../lib/stats.js";

interface StatsSummaryProps {
  range: StatsRange;
}

function Card({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-raised p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pine-800 text-ochre-300">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-muted">{label}</span>
        <span className="truncate text-lg font-semibold text-foreground">{value}</span>
        {hint ? <span className="truncate text-xs text-faint">{hint}</span> : null}
      </div>
    </div>
  );
}

export function StatsSummary({ range }: StatsSummaryProps) {
  const top = useStatsTop(range, 1);
  const timeline = useStatsTimeline(range, "day");
  const isLoading = top.isLoading || timeline.isLoading;
  const isError = top.isError || timeline.isError;

  if (isLoading) {
    return <p className="py-4 text-center text-sm text-faint">Cargando resumen…</p>;
  }
  if (isError) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised p-4">
        <p className="text-sm text-muted">No se pudo cargar el resumen.</p>
        <button
          type="button"
          onClick={() => {
            void top.refetch();
            void timeline.refetch();
          }}
          className="rounded-lg bg-ochre-500 px-3 py-1.5 text-sm font-medium text-pine-950 hover:bg-ochre-400"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const totalMs = (timeline.data?.items ?? []).reduce((acc, item) => acc + item.totalMs, 0);
  const best = top.data?.items[0];
  const peak = [...(timeline.data?.items ?? [])].sort((a, b) => b.totalMs - a.totalMs)[0];

  if (!best || totalMs <= 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-surface-soft px-6 py-8 text-center">
        <p className="text-sm text-muted">
          Todavía no hay escucha en este periodo. Reproduce una emisora y vuelve aquí.
        </p>
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card
        icon={<Clock3 className="size-5" />}
        label="Tiempo total"
        value={formatDurationMs(totalMs)}
        hint="Datos aproximados"
      />
      <Card
        icon={<Disc3 className="size-5" />}
        label="Tu emisora destacada"
        value={best.station.name}
        hint={formatDurationMs(best.totalMs)}
      />
      <Card
        icon={<Flame className="size-5" />}
        label="Día con más escucha"
        value={peak ? formatFullDay(peak.bucket) : "—"}
        hint={peak ? formatDurationMs(peak.totalMs) : undefined}
      />
    </dl>
  );
}
