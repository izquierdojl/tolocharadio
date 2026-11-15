import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePodcastStatsTopPodcasts } from "../../hooks/usePodcastStats.js";
import { CHART_COLORS, formatDurationMs, type PodcastStatsTopPodcast, type StatsRange } from "../../lib/stats.js";
import { SectionCard } from "../stats/SectionCard.js";
import { PodcastCover } from "./PodcastCover.js";

export function TopPodcastsList({ items }: { items: PodcastStatsTopPodcast[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.podcastId}>
          <Link
            to={`/podcasts/${item.podcastId}`}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 transition hover:border-pine-500 hover:bg-surface-soft"
          >
            <PodcastCover src={item.imageUrl} className="size-10 shrink-0 rounded-lg border border-line" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
              <span className="truncate text-xs text-faint">
                {item.author ?? "Sin autor"} · {item.episodesStarted} empezados ·{" "}
                {item.episodesCompleted} completados
              </span>
            </div>
            <span className="shrink-0 text-xs text-muted">{formatDurationMs(item.totalMs)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TopPodcasts({ range }: { range: StatsRange }) {
  const { data, isLoading, isError, refetch } = usePodcastStatsTopPodcasts(range, 10);
  const items = data?.items ?? [];
  const isEmpty = !isLoading && !isError && items.length === 0;
  const chartData = items.map((item) => ({ name: item.title, totalMs: item.totalMs }));

  return (
    <SectionCard
      title="Podcasts más escuchados"
      description="Tus podcasts con más tiempo acumulado."
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
      emptyTitle="Aún no tienes ranking"
      emptyDescription="Escucha episodios y aquí aparecerá tu top de podcasts."
      onRetry={() => void refetch()}
    >
      <div className="h-56 w-full" role="img" aria-label="Top de podcasts">
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
              width={120}
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
            <Bar dataKey="totalMs" name="Escucha" radius={[0, 8, 8, 0]} barSize={16}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TopPodcastsList items={items} />
    </SectionCard>
  );
}
