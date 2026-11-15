import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
  PodcastStatsSummaryCards,
} from "./PodcastStatsSummary.js";
import { formatCompletionRate } from "../../lib/stats.js";
import { TopPodcastsList } from "./TopPodcasts.js";
import { TopEpisodesList } from "./TopEpisodes.js";
import { CategoryChartList } from "./CategoryChart.js";
import { RecentEpisodesList } from "./RecentEpisodes.js";

function renderWithRouter(node: React.ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

describe("Componentes de estadisticas de podcasts", () => {
  it("formatea la tasa de finalizacion como porcentaje acotado", () => {
    expect(formatCompletionRate(0)).toBe("0 %");
    expect(formatCompletionRate(0.426)).toBe("43 %");
    expect(formatCompletionRate(1)).toBe("100 %");
    expect(formatCompletionRate(1.5)).toBe("100 %");
  });

  it("muestra el resumen con tiempo, episodios y media por episodio", () => {
    const html = renderToStaticMarkup(
      <PodcastStatsSummaryCards
        summary={{
          totalMs: 5_400_000,
          episodesStarted: 4,
          episodesCompleted: 3,
          completionRate: 0.75,
          podcastsCount: 2,
          averageEpisodeMs: 1_350_000,
        }}
      />,
    );

    expect(html).toContain("1 h 30 min");
    expect(html).toContain("Episodios empezados");
    expect(html).toContain("4");
    expect(html).toContain("75 %");
    expect(html).toContain("Media por episodio");
    expect(html).toContain("23 min");
  });

  it("lista los podcasts con su enlace, autor y episodios", () => {
    const html = renderWithRouter(
      <TopPodcastsList
        items={[
          {
            podcastId: 7,
            title: "Tech Talks",
            author: "Ada",
            imageUrl: null,
            totalMs: 3_600_000,
            episodesStarted: 3,
            episodesCompleted: 2,
          },
        ]}
      />,
    );

    expect(html).toContain("Tech Talks");
    expect(html).toContain("Ada");
    expect(html).toContain("3 empezados");
    expect(html).toContain("2 completados");
    expect(html).toContain("/podcasts/7");
  });

  it("marca los episodios completados y muestra su podcast", () => {
    const html = renderWithRouter(
      <TopEpisodesList
        items={[
          {
            episodeId: 11,
            podcastId: 7,
            title: "Episodio final",
            podcastTitle: "Tech Talks",
            imageUrl: null,
            totalMs: 1_800_000,
            completed: true,
          },
        ]}
      />,
    );

    expect(html).toContain("Episodio final");
    expect(html).toContain("Tech Talks");
    expect(html).toContain("Completado");
    expect(html).toContain("30 min");
  });

  it("reparte el tiempo por categoria", () => {
    const html = renderWithRouter(
      <CategoryChartList
        items={[
          { category: "Technology", totalMs: 3_600_000 },
          { category: "desconocido", totalMs: 600_000 },
        ]}
      />,
    );

    expect(html).toContain("Technology");
    expect(html).toContain("desconocido");
    expect(html).toContain("1 h");
    expect(html).toContain("10 min");
  });

  it("lista sesiones recientes con episodio, podcast y duracion", () => {
    const now = Date.now();
    const html = renderWithRouter(
      <RecentEpisodesList
        items={[
          {
            episodeId: 11,
            podcastId: 7,
            episodeTitle: "Episodio final",
            podcastTitle: "Tech Talks",
            imageUrl: null,
            startedAt: now - 60_000,
            endedAt: now,
            listenedMs: 900_000,
            positionSec: 900,
            durationSec: 1200,
            completed: false,
          },
        ]}
      />,
    );

    expect(html).toContain("Episodio final");
    expect(html).toContain("Tech Talks");
    expect(html).toContain("15 min");
    expect(html).toContain("hace 1 minuto");
  });
});
