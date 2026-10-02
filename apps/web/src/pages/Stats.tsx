import { useMemo, useState } from "react";
import { StatsFilters } from "../components/stats/StatsFilters.js";
import { StatsSummary } from "../components/stats/StatsSummary.js";
import { TimelineChart } from "../components/stats/TimelineChart.js";
import { TopStations } from "../components/stats/TopStations.js";
import { HabitsHeatmap } from "../components/stats/HabitsHeatmap.js";
import { CountryChart, GenreChart } from "../components/stats/GenreCountryCharts.js";
import { RecentList } from "../components/stats/RecentList.js";
import {
  autoGranularity,
  isValidRange,
  presetRange,
  type StatsPreset,
  type StatsRange,
  type TimelineGranularity,
} from "../lib/stats.js";

export function Stats() {
  const [preset, setPreset] = useState<StatsPreset>("30d");
  const [custom, setCustom] = useState<StatsRange>({});
  const [granularityChoice, setGranularityChoice] = useState<TimelineGranularity | "auto">("auto");

  const range: StatsRange = useMemo(() => presetRange(preset, custom), [preset, custom]);
  const granularity: TimelineGranularity = useMemo(
    () => (granularityChoice === "auto" ? autoGranularity(range) : granularityChoice),
    [granularityChoice, range],
  );
  const rangeValid =
    preset !== "custom" || !custom.from || !custom.to || isValidRange(custom.from, custom.to);
  const effectiveRange: StatsRange = rangeValid ? range : {};

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tus estadísticas</h1>
        <p className="text-sm text-muted">
          Lo que escuchas, resumido en privado: solo tú puedes ver estos datos.
        </p>
      </div>

      <StatsFilters
        preset={preset}
        onPresetChange={setPreset}
        custom={custom}
        onCustomChange={setCustom}
        granularity={granularityChoice}
        onGranularityChange={setGranularityChoice}
      />

      <StatsSummary range={effectiveRange} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TimelineChart range={effectiveRange} granularity={granularity} />
        <TopStations range={effectiveRange} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <HabitsHeatmap range={effectiveRange} />
        <div className="flex flex-col gap-5">
          <GenreChart range={effectiveRange} />
          <CountryChart range={effectiveRange} />
        </div>
      </div>

      <RecentList />
    </section>
  );
}
