import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PodcastEpisode, PodcastSummary } from "../../lib/types.js";
import { EpisodeDetailBody } from "./EpisodeDetailBody.js";

const podcast: PodcastSummary = {
  id: 2,
  feedUrl: "https://example.org/feed.xml",
  title: "Podcast de prueba",
  author: "Autora",
  description: null,
  imageUrl: null,
  language: "es",
  link: null,
  categories: [],
  lastFetchedAt: null,
  episodeCount: 10,
  isSubscribed: true,
};

const episode: PodcastEpisode = {
  id: 1,
  podcastId: 2,
  title: "Crónica del bosque",
  description: "Una descripción larga con varios detalles del episodio.",
  publishedAt: Date.UTC(2026, 10, 17),
  durationSec: 1800,
  imageUrl: null,
  episodeNumber: 5,
  seasonNumber: 2,
  explicit: true,
  progress: null,
  isFavorite: false,
};

function render(overrides: Partial<PodcastEpisode> = {}, position = 0, totalDuration = 1800) {
  return renderToStaticMarkup(
    <EpisodeDetailBody
      episode={{ ...episode, ...overrides }}
      podcast={podcast}
      titleId="episode-title"
      position={position}
      totalDuration={totalDuration}
    />,
  );
}

describe("EpisodeDetailBody", () => {
  it("muestra título, metadatos, explícito y descripción completa", () => {
    const html = render();

    expect(html).toContain('id="episode-title"');
    expect(html).toContain("Crónica del bosque");
    expect(html).toContain("17 nov 2026");
    expect(html).toContain("30:00");
    expect(html).toContain("T2 · E5");
    expect(html).toContain("Explícito");
    expect(html).toContain("Una descripción larga con varios detalles del episodio.");
    expect(html).toContain("sm:flex-row");
    expect(html).toContain("overflow-hidden");
  });

  it("omite los datos opcionales ausentes sin romper el markup", () => {
    const html = render({
      description: null,
      publishedAt: null,
      durationSec: null,
      episodeNumber: null,
      seasonNumber: null,
      explicit: false,
    });

    expect(html).toContain("Crónica del bosque");
    expect(html).not.toContain("Descripción");
    expect(html).not.toContain("Explícito");
    expect(html).not.toContain("T2 · E5");
  });

  it("muestra el progreso parcial con posición y duración", () => {
    const html = render(
      {
        progress: {
          positionSec: 60,
          durationSec: 1800,
          completed: false,
          completedAt: null,
          updatedAt: 1,
        },
      },
      60,
      1800,
    );

    expect(html).toContain("1:00 de 30:00");
    expect(html).toContain("width:3%");
  });

  it("muestra el estado completado sin barra de progreso", () => {
    const html = render({
      progress: {
        positionSec: 1800,
        durationSec: 1800,
        completed: true,
        completedAt: 1,
        updatedAt: 1,
      },
    });

    expect(html).toContain("Completado");
    expect(html).not.toContain("width:");
  });
});
