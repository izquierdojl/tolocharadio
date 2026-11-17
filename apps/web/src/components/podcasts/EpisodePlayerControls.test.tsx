import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PodcastEpisode, PodcastSummary } from "../../lib/types.js";
import { EpisodePlayerControls } from "./EpisodePlayerControls.js";

const episode: PodcastEpisode = {
  id: 1,
  podcastId: 2,
  title: "Episodio de prueba",
  description: null,
  publishedAt: null,
  durationSec: 1800,
  imageUrl: null,
  episodeNumber: 1,
  seasonNumber: null,
  explicit: false,
  progress: null,
};

const podcast: PodcastSummary = {
  id: 2,
  feedUrl: "https://example.com/feed.xml",
  title: "Podcast de prueba",
  author: null,
  description: null,
  imageUrl: null,
  language: null,
  link: null,
  categories: [],
  lastFetchedAt: null,
  episodeCount: 1,
  isSubscribed: true,
};

function renderControls(overrides: Partial<Parameters<typeof EpisodePlayerControls>[0]> = {}): string {
  return renderToStaticMarkup(
    <EpisodePlayerControls
      episode={episode}
      podcast={podcast}
      isPlaying={false}
      isBuffering={false}
      canRetry={false}
      currentTime={60}
      duration={1800}
      playbackRate={1}
      onToggle={() => {}}
      onRetry={() => {}}
      onSeek={() => {}}
      onSkip={() => {}}
      onChangeRate={() => {}}
      {...overrides}
    />,
  );
}

describe("EpisodePlayerControls", () => {
  it("ordena el transporte como retroceder, play y avanzar", () => {
    const html = renderControls();
    const back = html.indexOf('aria-label="Retroceder 15 segundos"');
    const play = html.indexOf('aria-label="Reproducir"');
    const forward = html.indexOf('aria-label="Avanzar 30 segundos"');

    expect(back).toBeGreaterThan(-1);
    expect(play).toBeGreaterThan(back);
    expect(forward).toBeGreaterThan(play);
  });

  it("usa botones de salto de 44 px y un play mayor de 56 px", () => {
    const html = renderControls();

    expect(html).toContain("size-11 shrink-0 flex-col");
    expect(html).toContain("size-14 shrink-0");
    expect(html).toContain("15 s");
    expect(html).toContain("30 s");
  });

  it("coloca el progreso y la velocidad después del transporte", () => {
    const html = renderControls();
    const forward = html.indexOf('aria-label="Avanzar 30 segundos"');
    const progress = html.indexOf('aria-label="Posición del episodio"');
    const rate = html.indexOf('aria-label="Velocidad 1x"');

    expect(progress).toBeGreaterThan(forward);
    expect(rate).toBeGreaterThan(progress);
    expect(html).toContain("01:00");
    expect(html).toContain("30:00");
  });

  it("refleja el estado de reproducción en el botón central", () => {
    expect(renderControls({ isPlaying: true })).toContain('aria-label="Pausar"');
    expect(renderControls({ canRetry: true })).toContain('aria-label="Reintentar"');
  });
});
