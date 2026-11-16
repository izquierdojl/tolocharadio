import { describe, expect, it } from "vitest";
import {
  isQueueEpisodeActive,
  mergeQueueOrder,
  nextQueueEpisode,
  parseOpmlFeedUrls,
} from "./podcastQueue.js";
import type { PodcastEpisode } from "./types.js";

function episode(id: number): PodcastEpisode {
  return {
    id,
    podcastId: 1,
    title: `Episodio ${id}`,
    description: null,
    publishedAt: null,
    durationSec: 600,
    imageUrl: null,
    episodeNumber: null,
    seasonNumber: null,
    explicit: false,
    progress: null,
  };
}

describe("nextQueueEpisode", () => {
  it("devuelve el primer episodio distinto del terminado", () => {
    expect(nextQueueEpisode([episode(1), episode(2)], 1)?.id).toBe(2);
  });

  it("devuelve null cuando la cola solo contiene el episodio terminado", () => {
    expect(nextQueueEpisode([episode(1)], 1)).toBeNull();
    expect(nextQueueEpisode([], 1)).toBeNull();
  });
});

describe("isQueueEpisodeActive", () => {
  it("marca como activos solo los estados de conexión y reproducción", () => {
    expect(isQueueEpisodeActive("connecting")).toBe(true);
    expect(isQueueEpisodeActive("playing")).toBe(true);
    expect(isQueueEpisodeActive("reconnecting")).toBe(true);
    expect(isQueueEpisodeActive("paused")).toBe(false);
    expect(isQueueEpisodeActive("failed")).toBe(false);
    expect(isQueueEpisodeActive("idle")).toBe(false);
  });
});

describe("mergeQueueOrder", () => {
  const items = [episode(1), episode(2), episode(3), episode(4)];

  it("devuelve el orden visible cuando no hay episodio oculto", () => {
    expect(mergeQueueOrder(items, [4, 1, 3])).toEqual([4, 1, 3]);
    expect(mergeQueueOrder(items, [4, 1, 3], null)).toEqual([4, 1, 3]);
  });

  it("conserva el hueco del oculto al principio", () => {
    expect(mergeQueueOrder(items, [2, 3, 4], 1)).toEqual([1, 2, 3, 4]);
  });

  it("conserva el hueco del oculto en medio tras reordenar los visibles", () => {
    expect(mergeQueueOrder(items, [1, 3, 4], 2)).toEqual([1, 2, 3, 4]);
    expect(mergeQueueOrder(items, [4, 1, 3], 2)).toEqual([4, 2, 1, 3]);
  });

  it("conserva el hueco del oculto al final", () => {
    expect(mergeQueueOrder(items, [1, 2, 3], 4)).toEqual([1, 2, 3, 4]);
  });

  it("devuelve el orden visible cuando el oculto no pertenece a la cola", () => {
    expect(mergeQueueOrder(items, [2, 3], 99)).toEqual([2, 3]);
  });
});

describe("parseOpmlFeedUrls", () => {
  it("extrae feeds con comillas dobles o simples y elimina duplicados", () => {
    const opml = `<?xml version="1.0" encoding="UTF-8"?>
      <opml version="2.0"><body>
        <outline text="A" xmlUrl="https://a.example.org/feed.xml" />
        <outline text='B' xmlUrl='https://b.example.org/rss' />
        <outline text="A bis" xmlUrl="https://a.example.org/feed.xml" />
        <outline text="Sin feed" />
      </body></opml>`;
    expect(parseOpmlFeedUrls(opml)).toEqual([
      "https://a.example.org/feed.xml",
      "https://b.example.org/rss",
    ]);
  });

  it("devuelve una lista vacía si el documento no tiene feeds", () => {
    expect(parseOpmlFeedUrls("<opml><body /></opml>")).toEqual([]);
  });
});
