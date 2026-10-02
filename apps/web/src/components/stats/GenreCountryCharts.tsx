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
import { useStatsCountries, useStatsGenres } from "../../hooks/useStats.js";
import { CHART_COLORS, formatDurationMs, type StatsRange } from "../../lib/stats.js";
import { SectionCard } from "./SectionCard.js";

const tooltipStyle = {
  backgroundColor: "var(--surface-raised)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  color: "var(--foreground)",
  fontSize: 13,
};

export function GenreChart({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = useStatsGenres(range, 10);
  const items = data?.items ?? [];
  const isEmpty = !isLoading && !isError && items.length === 0;
  const chartData = items.map((item) => ({ name: item.genre, value: item.totalMs }));
  const useDonut = items.length > 0 && items.length <= 6;

  return (
    <SectionCard
      title="Por género"
      description="Tiempo por etiqueta de tus emisoras."
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      emptyTitle="Sin géneros todavía"
      emptyDescription="Escucha emisoras con etiquetas y aquí verás tu reparto."
      onRetry={() => void refetch()}
    >
      <div className="h-64 w-full" role="img" aria-label="Desglose por género">
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
      <ul className="flex flex-col gap-1.5">
        {items.map((item, index) => (
          <li key={item.genre} className="flex items-center gap-2 text-sm">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-foreground">{item.genre}</span>
            <span className="shrink-0 text-xs text-muted">{formatDurationMs(item.totalMs)}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function CountryChart({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = useStatsCountries(range);
  const items = data?.items ?? [];
  const isEmpty = !isLoading && !isError && items.length === 0;
  const total = Math.max(1, ...items.map((item) => item.totalMs), 1);

  return (
    <SectionCard
      title="Por país"
      description="Tiempo por país de tus emisoras."
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      emptyTitle="Sin países todavía"
      emptyDescription="Escucha emisoras de varios países y aquí verás tu reparto."
      onRetry={() => void refetch()}
    >
      <ul className="flex flex-col gap-2.5">
        {items.map((item, index) => (
          <li key={`${item.country}-${index}`} className="flex items-center gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-pine-800 text-xs font-semibold text-pine-200"
              aria-hidden="true"
            >
              {(item.countryCode ?? item.country).slice(0, 2).toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{item.country}</span>
                <span className="shrink-0 text-xs text-muted">{formatDurationMs(item.totalMs)}</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-surface-soft"
                role="progressbar"
                aria-valuenow={Math.round((item.totalMs / total) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.country}: ${formatDurationMs(item.totalMs)}`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, (item.totalMs / total) * 100)}%`,
                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
