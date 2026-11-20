import { Trash2 } from "lucide-react";

export type StatsResetTarget = "radio" | "podcast";

interface StatsResetSectionProps {
  podcastsEnabled: boolean;
  pending: StatsResetTarget | null;
  onRequestReset: (target: StatsResetTarget) => void;
}

interface ResetRowProps {
  title: string;
  description: string;
  actionLabel: string;
  disabled: boolean;
  onReset: () => void;
}

function ResetRow({ title, description, actionLabel, disabled, onReset }: ResetRowProps) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={onReset}
        disabled={disabled}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-50"
      >
        <Trash2 className="size-4" />
        {actionLabel}
      </button>
    </div>
  );
}

export function StatsResetSection({
  podcastsEnabled,
  pending,
  onRequestReset,
}: StatsResetSectionProps) {
  const disabled = pending !== null;

  return (
    <section
      aria-labelledby="stats-reset-title"
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-raised p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="stats-reset-title" className="font-semibold text-foreground">
          Estadísticas de escucha
        </h2>
        <p className="text-sm text-muted">
          Reinicia las estadísticas y gráficas de cada sección por separado. La acción no se puede
          deshacer.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-line">
        <ResetRow
          title="Radio"
          description="Emisoras más escuchadas, evolución, hábitos, géneros, países y escuchas recientes."
          actionLabel="Reiniciar radio"
          disabled={disabled}
          onReset={() => onRequestReset("radio")}
        />
        {podcastsEnabled ? (
          <ResetRow
            title="Podcasts"
            description="Resumen, rankings, evolución, hábitos, categorías y sesiones recientes."
            actionLabel="Reiniciar podcasts"
            disabled={disabled}
            onReset={() => onRequestReset("podcast")}
          />
        ) : null}
      </div>
    </section>
  );
}
