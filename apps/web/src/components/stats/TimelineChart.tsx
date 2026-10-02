import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStatsTimeline } from "../../hooks/useStats.js";
import {
  formatAxisDuration,
  formatBucketLabel,
  formatDurationMs,
  formatFullDay,
  type StatsRange,
  type TimelineGranularity,
} from "../../lib/stats.js";
import { SectionCard } from "./SectionCard.js";

interface TimelineChartProps {
  range: StatsRange;
  granularity: TimelineGranularity;
}

export function TimelineChart({ range, granularity }: TimelineChartProps) {
  const { data, isLoading, isError, refetch } = useStatsTimeline(range, granularity);
  const items = data?.items ?? [];
  const chartData = items.map((item) => ({
    ...item,
    label: formatBucketLabel(item.bucket, granularity),
  }));
  const isEmpty = !isLoading && !isError && items.every((item) => item.totalMs === 0);

  return (
    <SectionCard
      title="Evolución"
      description="Tiempo escuchado por día, semana o mes."
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      emptyTitle="Sin actividad en este periodo"
      emptyDescription="Cuando escuches alguna emisora, aquí verás tu evolución."
      onRetry={() => void refetch()}
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
              formatter={(value) => [formatDurationMs(Number(value)), "Escucha"]}
            />
            <Area
              type="monotone"
              dataKey="totalMs"
              name="Escucha"
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
