import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { usePodcastStatsCategories } from "../../hooks/usePodcastStats.js";
import { CHART_COLORS, formatDurationMs, type PodcastStatsCategory, type StatsRange } from "../../lib/stats.js";
import { SectionCard } from "../stats/SectionCard.js";

const tooltipStyle = {
  backgroundColor: "var(--surface-raised)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  color: "var(--foreground)",
  fontSize: 13,
};

export function CategoryChartList({ items }: { items: PodcastStatsCategory[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li key={item.category} className="flex items-center gap-2 text-sm">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-foreground">{item.category}</span>
          <span className="shrink-0 text-xs text-muted">{formatDurationMs(item.totalMs)}</span>
        </li>
      ))}
    </ul>
  );
}

export function CategoryChart({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = usePodcastStatsCategories(range, 10);
  const items = data?.items ?? [];
  const isEmpty = !isLoading && !isError && items.length === 0;
  const chartData = items.map((item) => ({ name: item.category, value: item.totalMs }));
  const useDonut = items.length > 0 && items.length <= 6;

  return (
    <SectionCard
      title="Por categoría"
      description="Tiempo por categoría de tus podcasts."
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      emptyTitle="Sin categorías todavía"
      emptyDescription="Escucha podcasts con categorías y aquí verás tu reparto."
      onRetry={() => void refetch()}
    >
      <div className="h-56 w-full" role="img" aria-label="Desglose por categoría de podcast">
        <ResponsiveContainer width="100%" height="100%">
          {useDonut ? (
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [formatDurationMs(Number(value)), String(name)]} />
            </PieChart>
          ) : (
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatDurationMs(Number(value)), "Escucha"]} />
              <Bar dataKey="value" name="Escucha" radius={[0, 8, 8, 0]} barSize={16}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <CategoryChartList items={items} />
    </SectionCard>
  );
}
