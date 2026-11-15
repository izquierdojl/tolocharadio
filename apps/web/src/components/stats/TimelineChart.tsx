import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStatsTimeline } from "../../hooks/useStats.js";
import {
  formatAxisDuration,
  formatBucketLabel,
  formatDurationMs,
  formatFullDay,
  type StatsRange,
  type StatsTimelineEntry,
  type TimelineGranularity,
} from "../../lib/stats.js";
import { SectionCard } from "./SectionCard.js";

interface TimelineChartViewProps {
  items: StatsTimelineEntry[];
  granularity: TimelineGranularity;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  seriesName?: string;
}

/// Grafico de evolucion temporal compartido por radio y podcasts.
export function TimelineChartView({
  items,
  granularity,
  isLoading,
  isError,
  onRetry,
  title = "Evolución",
  description = "Tiempo escuchado por día, semana o mes.",
  emptyTitle = "Sin actividad en este periodo",
  emptyDescription = "Cuando escuches alguna emisora, aquí verás tu evolución.",
  seriesName = "Escucha",
}: TimelineChartViewProps) {
  const chartData = items.map((item) => ({
    ...item,
    label: formatBucketLabel(item.bucket, granularity),
  }));
  const isEmpty = !isLoading && !isError && items.every((item) => item.totalMs === 0);

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
      <div className="h-64 w-full" role="img" aria-label={`Evolución por ${granularity}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => formatAxisDuration(value)}
              width={56}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                color: "var(--foreground)",
                fontSize: 13,
              }}
              labelFormatter={(_label, payload) => {
                const bucket = (payload?.[0]?.payload as { bucket?: string } | undefined)?.bucket;
                return bucket ? formatFullDay(bucket) : String(_label);
              }}
              formatter={(value) => [formatDurationMs(Number(value)), seriesName]}
            />
            <Area
              type="monotone"
              dataKey="totalMs"
              name={seriesName}
              stroke="#c0883e"
              fill="#c0883e"
              fillOpacity={0.28}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

interface TimelineChartProps {
  range: StatsRange;
  granularity: TimelineGranularity;
}

export function TimelineChart({ range, granularity }: TimelineChartProps) {
  const { data, isLoading, isError, refetch } = useStatsTimeline(range, granularity);
  return (
    <TimelineChartView
      items={data?.items ?? []}
      granularity={granularity}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
    />
  );
}
