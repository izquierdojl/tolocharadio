import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { PodcastEpisode, PodcastSummary } from "../../lib/types.js";
import { NowPlayingStrip } from "./NowPlayingStrip.js";

const podcast: PodcastSummary = {
  id: 7,
  feedUrl: "https://example.org/feed.xml",
  title: "Pódcast de prueba",
  author: "Autora",
  description: null,
  imageUrl: "https://example.org/podcast.jpg",
  language: "es",
  link: null,
  categories: [],
  lastFetchedAt: null,
  episodeCount: 3,
  isSubscribed: true,
};

const episode: PodcastEpisode = {
  id: 42,
  podcastId: podcast.id,
  title: "Episodio de prueba",
  description: null,
  publishedAt: null,
  durationSec: 600,
  imageUrl: null,
  episodeNumber: 1,
  seasonNumber: null,
  explicit: false,
  progress: null,
};

function renderStrip(isPlaying: boolean, duration = 600): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <NowPlayingStrip
        episode={episode}
        podcast={podcast}
        isPlaying={isPlaying}
        isBuffering={false}
        currentTime={120}
        duration={duration}
        onToggle={() => undefined}
      />
    </MemoryRouter>,
  );
}

describe("NowPlayingStrip", () => {
  it("muestra el episodio activo, su podcast, enlace y progreso", () => {
    const html = renderStrip(true);
    expect(html).toContain("En reproducción");
    expect(html).toContain("Episodio de prueba");
    expect(html).toContain("Pódcast de prueba");
    expect(html).toContain('href="/podcasts/7"');
    expect(html).toContain("2:00");
    expect(html).toContain("10:00");
    expect(html).toContain('aria-label="Pausar"');
  });

  it("ofrece reanudar cuando el episodio está en pausa", () => {
    expect(renderStrip(false)).toContain('aria-label="Reanudar"');
  });

  it("muestra un total desconocido cuando aún no hay duración", () => {
    expect(renderStrip(true, 0)).toContain("--:--");
  });
});
