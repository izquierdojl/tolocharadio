import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPodcastEpisodes, searchPodcastEpisodes } from "./api.js";

const EMPTY_PAGE = {
  items: [],
  pagination: { offset: 0, limit: 50, hasMore: false },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(): string[] {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      urls.push(String(input));
      return new Response(JSON.stringify(EMPTY_PAGE), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return urls;
}

describe("URLs de búsqueda de episodios", () => {
  it("fetchPodcastEpisodes compone q con filter, sort y offset", async () => {
    const urls = stubFetch();
    await fetchPodcastEpisodes(7, {
      q: "camion",
      filter: "unplayed",
      sort: "recent",
      offset: 0,
      limit: 20,
    });

    const url = new URL(urls[0]!, "https://radio.example.org");
    expect(url.pathname).toBe("/api/v1/podcasts/7/episodes");
    expect(url.searchParams.get("q")).toBe("camion");
    expect(url.searchParams.get("filter")).toBe("unplayed");
    expect(url.searchParams.get("sort")).toBe("recent");
    expect(url.searchParams.get("offset")).toBe("0");
    expect(url.searchParams.get("limit")).toBe("20");
  });

  it("fetchPodcastEpisodes omite q cuando no se envía", async () => {
    const urls = stubFetch();
    await fetchPodcastEpisodes(7, { filter: "all" });

    const url = new URL(urls[0]!, "https://radio.example.org");
    expect(url.searchParams.get("q")).toBeNull();
  });

  it("searchPodcastEpisodes envía q y la paginación al endpoint de búsqueda", async () => {
    const urls = stubFetch();
    await searchPodcastEpisodes("camion", { offset: 20, limit: 50 });

    const url = new URL(urls[0]!, "https://radio.example.org");
    expect(url.pathname).toBe("/api/v1/podcasts/episodes/search");
    expect(url.searchParams.get("q")).toBe("camion");
    expect(url.searchParams.get("offset")).toBe("20");
    expect(url.searchParams.get("limit")).toBe("50");
  });
});
