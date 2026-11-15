import { describe, expect, it } from "vitest";
import { nextQueueEpisode, parseOpmlFeedUrls } from "./podcastQueue.js";
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
