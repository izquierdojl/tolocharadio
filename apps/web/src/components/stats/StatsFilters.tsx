import type { StatsPreset, StatsRange, TimelineGranularity } from "../../lib/stats.js";
import { isValidRange } from "../../lib/stats.js";

interface StatsFiltersProps {
  preset: StatsPreset;
  onPresetChange: (preset: StatsPreset) => void;
  custom: StatsRange;
  onCustomChange: (custom: StatsRange) => void;
  granularity: TimelineGranularity | "auto";
  onGranularityChange: (granularity: TimelineGranularity | "auto") => void;
}

const PRESETS: Array<{ value: StatsPreset; label: string }> = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "all", label: "Todo" },
  { value: "custom", label: "Personalizado" },
];

const GRANULARITIES: Array<{ value: TimelineGranularity | "auto"; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const chipClass = (active: boolean): string =>
  `rounded-full border px-3 py-1.5 text-sm transition ${
    active
      ? "border-pine-500 bg-surface-soft font-medium text-foreground"
      : "border-line-strong text-muted hover:border-pine-500 hover:text-foreground"
  }`;

export function StatsFilters({
  preset,
  onPresetChange,
  custom,
  onCustomChange,
  granularity,
  onGranularityChange,
}: StatsFiltersProps) {
  const rangeInvalid =
    preset === "custom" && !!custom.from && !!custom.to && !isValidRange(custom.from, custom.to);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Periodo</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
          {PRESETS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onPresetChange(option.value)}
              aria-pressed={preset === option.value}
              className={chipClass(preset === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {preset === "custom" ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Desde
            <input
              type="date"
              value={custom.from ?? ""}
              max={custom.to || undefined}
              onChange={(e) => onCustomChange({ ...custom, from: e.target.value || undefined })}
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-pine-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            Hasta
            <input
              type="date"
              value={custom.to ?? ""}
              min={custom.from || undefined}
              onChange={(e) => onCustomChange({ ...custom, to: e.target.value || undefined })}
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-foreground focus:border-pine-500 focus:outline-none"
            />
          </label>
          {rangeInvalid ? (
            <p role="alert" className="w-full text-sm text-red-400">
              La fecha de inicio no puede ser posterior a la de fin.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Evolución por</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Granularidad">
          {GRANULARITIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onGranularityChange(option.value)}
              aria-pressed={granularity === option.value}
              className={chipClass(granularity === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
