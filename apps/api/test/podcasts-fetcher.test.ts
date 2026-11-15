import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAndParsePodcastFeed } from "../src/services/podcasts/feedFetcher.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const MINIMAL_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Podcast Test</title>
    <item>
      <title>Ep 1</title>
      <guid>g-1</guid>
      <enclosure url="https://cdn.example.org/ep1.mp3" type="audio/mpeg" />
    </item>
  </channel>
</rss>`;

describe("fetchAndParsePodcastFeed", () => {
  it("descarga y parsea un feed guardando ETag y Last-Modified", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(MINIMAL_RSS, {
          status: 200,
          headers: {
            etag: '"v1"',
            "last-modified": "Wed, 21 Oct 2026 10:00:00 GMT",
          },
        }),
      ),
    );

    const res = await fetchAndParsePodcastFeed("https://feeds.example.org/rss.xml");
    expect(res.notModified).toBe(false);
    if (!res.notModified) {
      expect(res.etag).toBe('"v1"');
      expect(res.feed.title).toBe("Podcast Test");
      expect(res.feed.episodes).toHaveLength(1);
    }
  });

  it("envia If-None-Match e If-Modified-Since y maneja 304 Not Modified", async () => {
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers["If-None-Match"]).toBe('"v1"');
      expect(headers["If-Modified-Since"]).toBe("Wed, 21 Oct 2026 10:00:00 GMT");
      return new Response(null, { status: 304 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchAndParsePodcastFeed("https://feeds.example.org/rss.xml", {
      etag: '"v1"',
      lastModified: "Wed, 21 Oct 2026 10:00:00 GMT",
    });
    expect(res.notModified).toBe(true);
  });

  it("rechaza con FEED_TOO_LARGE cuando el cuerpo supera maxBytes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(MINIMAL_RSS, { status: 200 })),
    );

    await expect(
      fetchAndParsePodcastFeed("https://feeds.example.org/rss.xml", { maxBytes: 20 }),
    ).rejects.toMatchObject({
      code: "FEED_TOO_LARGE",
      status: 400,
    });
  });

  it("bloquea SSRF hacia IPs privadas", async () => {
    await expect(
      fetchAndParsePodcastFeed("http://127.0.0.1/rss.xml"),
    ).rejects.toMatchObject({
      code: "SSRF_BLOCKED",
      status: 400,
    });
  });
});
