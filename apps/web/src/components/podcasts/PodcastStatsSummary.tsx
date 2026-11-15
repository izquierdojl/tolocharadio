import { CheckCircle2, Clock3, Headphones, Percent, Podcast as PodcastIcon, Timer } from "lucide-react";
import { usePodcastStatsSummary } from "../../hooks/usePodcastStats.js";
import {
  formatCompletionRate,
  formatDurationMs,
  type PodcastStatsSummary as PodcastStatsSummaryData,
  type StatsRange,
} from "../../lib/stats.js";

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}

function SummaryCard({ icon, label, value, hint }: SummaryCardProps) {
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

export function PodcastStatsSummaryCards({ summary }: { summary: PodcastStatsSummaryData }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        icon={<Clock3 className="size-5" />}
        label="Tiempo escuchado"
        value={formatDurationMs(summary.totalMs)}
        hint="tiempo de contenido"
      />
      <SummaryCard
        icon={<PodcastIcon className="size-5" />}
        label="Podcasts"
        value={String(summary.podcastsCount)}
        hint="distintos en el periodo"
      />
      <SummaryCard
        icon={<Headphones className="size-5" />}
        label="Episodios empezados"
        value={String(summary.episodesStarted)}
        hint="con al menos 30 s"
      />
      <SummaryCard
        icon={<CheckCircle2 className="size-5" />}
        label="Episodios completados"
        value={String(summary.episodesCompleted)}
        hint="episodios únicos"
      />
      <SummaryCard
        icon={<Percent className="size-5" />}
        label="Tasa de finalización"
        value={formatCompletionRate(summary.completionRate)}
        hint="completados / empezados"
      />
      <SummaryCard
        icon={<Timer className="size-5" />}
        label="Media por episodio"
        value={formatDurationMs(summary.averageEpisodeMs)}
        hint="entre episodios empezados"
      />
    </div>
  );
}

export function PodcastStatsSummary({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = usePodcastStatsSummary(range);

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-faint">Cargando resumen…</p>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface-raised p-6 text-center">
        <p className="text-sm text-rose-400">No se pudo cargar el resumen de podcasts.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-foreground transition hover:border-pine-500 hover:bg-surface-soft"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data || (data.totalMs === 0 && data.episodesStarted === 0)) {
    return (
      <p className="rounded-2xl border border-dashed border-line-strong bg-surface-soft px-6 py-8 text-center text-sm text-muted">
        Aún no hay escuchas de podcasts en este periodo.
      </p>
    );
  }

  return <PodcastStatsSummaryCards summary={data} />;
}
