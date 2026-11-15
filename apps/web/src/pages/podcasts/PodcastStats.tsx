import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { StatsFilters } from "../../components/stats/StatsFilters.js";
import { TimelineChartView } from "../../components/stats/TimelineChart.js";
import { HabitsHeatmapView } from "../../components/stats/HabitsHeatmap.js";
import { PodcastStatsSummary } from "../../components/podcasts/PodcastStatsSummary.js";
import { TopPodcasts } from "../../components/podcasts/TopPodcasts.js";
import { TopEpisodes } from "../../components/podcasts/TopEpisodes.js";
import { CategoryChart } from "../../components/podcasts/CategoryChart.js";
import { RecentEpisodes } from "../../components/podcasts/RecentEpisodes.js";
import { usePodcastStatsHabits, usePodcastStatsTimeline } from "../../hooks/usePodcastStats.js";
import {
  autoGranularity,
  isValidRange,
  presetRange,
  type StatsPreset,
  type StatsRange,
  type TimelineGranularity,
} from "../../lib/stats.js";

export function PodcastStats() {
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

  const timeline = usePodcastStatsTimeline(effectiveRange, granularity);
  const habits = usePodcastStatsHabits(effectiveRange);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          to="/podcasts"
          className="mb-1 inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Podcasts
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Estadísticas de podcasts</h1>
        <p className="text-sm text-muted">
          Tu escucha de podcasts, resumida en privado: solo tú puedes ver estos datos.
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

      <PodcastStatsSummary range={effectiveRange} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TimelineChartView
          items={timeline.data?.items ?? []}
          granularity={granularity}
          isLoading={timeline.isLoading}
          isError={timeline.isError}
          onRetry={() => void timeline.refetch()}
          title="Evolución"
          description="Tiempo de podcast por día, semana o mes."
          emptyTitle="Sin actividad en este periodo"
          emptyDescription="Cuando escuches episodios, aquí verás tu evolución."
          seriesName="Podcasts"
        />
        <TopPodcasts range={effectiveRange} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <HabitsHeatmapView
          items={habits.data?.items ?? []}
          isLoading={habits.isLoading}
          isError={habits.isError}
          onRetry={() => void habits.refetch()}
          title="Hábitos"
          description="Cuándo escuchas podcasts: día de la semana y hora local."
          emptyTitle="Sin hábitos todavía"
          emptyDescription="Escucha podcasts en distintos momentos y aquí verás tu mapa semanal."
        />
        <CategoryChart range={effectiveRange} />
      </div>

      <TopEpisodes range={effectiveRange} />

      <RecentEpisodes />
    </section>
  );
}
