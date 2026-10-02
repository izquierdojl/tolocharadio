import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Radio } from "lucide-react";
import { useStatsTop } from "../../hooks/useStats.js";
import { CHART_COLORS, formatDurationMs, type StatsRange } from "../../lib/stats.js";
import { SectionCard } from "./SectionCard.js";

export function TopStations({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = useStatsTop(range, 10);
  const items = data?.items ?? [];
  const isEmpty = !isLoading && !isError && items.length === 0;
  const chartData = items.map((item) => ({
    name: item.station.name,
    totalMs: item.totalMs,
  }));
  const maxMs = Math.max(1, ...items.map((item) => item.totalMs));

  return (
    <SectionCard
      title="Más escuchadas"
      description="Tus emisoras con más tiempo acumulado."
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      emptyTitle="Aún no tienes ranking"
      emptyDescription="Escucha tus emisoras favoritas y aquí aparecerá tu top."
      onRetry={() => void refetch()}
    >
      <div className="h-64 w-full" role="img" aria-label="Top de emisoras">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
              tickFormatter={(value: number) => formatDurationMs(value).replace(" min", "m").replace(" h ", "h")}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fill: "var(--foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                color: "var(--foreground)",
                fontSize: 13,
              }}
              formatter={(value) => [formatDurationMs(Number(value)), "Escucha"]}
            />
            <Bar dataKey="totalMs" name="Escucha" radius={[0, 8, 8, 0]} barSize={18}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-2">
        {items.slice(0, 5).map((item) => (
          <li key={item.station.id} className="flex items-center gap-3">
            {item.station.favicon ? (
              <img
                src={item.station.favicon}
                alt=""
                loading="lazy"
                className="size-8 shrink-0 rounded-lg border border-line bg-surface object-cover"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-pine-800 text-pine-300">
                <Radio className="size-4" />
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{item.station.name}</span>
                <span className="shrink-0 text-xs text-muted">{formatDurationMs(item.totalMs)}</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-surface-soft"
                role="progressbar"
                aria-valuenow={Math.round((item.totalMs / maxMs) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.station.name}: ${formatDurationMs(item.totalMs)}`}
              >
                <div
                  className="h-full rounded-full bg-ochre-500"
                  style={{ width: `${Math.max(4, (item.totalMs / maxMs) * 100)}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
