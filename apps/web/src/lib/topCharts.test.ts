import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTopPodcasts } from "./api.js";
import { DEFAULT_TOP_COUNTRY, TOP_COUNTRIES, isTopCountry, isTopGenre } from "./topCharts.js";
import {
  TOP_COUNTRY_STORAGE_KEY,
  TOP_GENRE_STORAGE_KEY,
  readStoredTopCountry,
  readStoredTopGenre,
  useTopChartsStore,
} from "../stores/topCharts.js";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ranking de podcasts: cliente", () => {
  it("compone country, limit y genre opcional", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        urls.push(String(input));
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    await fetchTopPodcasts("es");
    await fetchTopPodcasts("mx", "1303", 25);
    const a = new URL(urls[0]!, "https://radio.example.org");
    expect(a.pathname).toBe("/api/v1/podcasts/top");
    expect(a.searchParams.get("country")).toBe("es");
    expect(a.searchParams.get("limit")).toBe("50");
    expect(a.searchParams.has("genre")).toBe(false);
    const b = new URL(urls[1]!, "https://radio.example.org");
    expect(b.searchParams.get("genre")).toBe("1303");
    expect(b.searchParams.get("limit")).toBe("25");
  });
});

describe("ranking de podcasts: pais y categoria", () => {
  it("España es el primer país y el valor por defecto", () => {
    expect(DEFAULT_TOP_COUNTRY).toBe("es");
    expect(TOP_COUNTRIES[0]?.id).toBe("es");
    expect(isTopCountry("xx")).toBe(false);
    expect(isTopGenre("1303")).toBe(true);
    expect(isTopGenre("999")).toBe(false);
  });

  it("usa España y sin categoría cuando no hay nada guardado", () => {
    vi.stubGlobal("window", { localStorage: memoryStorage() });
    expect(readStoredTopCountry()).toBe("es");
    expect(readStoredTopGenre()).toBeNull();
  });

  it("recuerda la elección y descarta valores no válidos", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    useTopChartsStore.getState().setCountry("mx");
    useTopChartsStore.getState().setGenre("1303");
    expect(storage.getItem(TOP_COUNTRY_STORAGE_KEY)).toBe("mx");
    expect(readStoredTopCountry()).toBe("mx");
    expect(readStoredTopGenre()).toBe("1303");

    useTopChartsStore.getState().setCountry("zz");
    expect(useTopChartsStore.getState().country).toBe("mx");

    useTopChartsStore.getState().setGenre(null);
    expect(storage.getItem(TOP_GENRE_STORAGE_KEY)).toBeNull();
    expect(useTopChartsStore.getState().genre).toBeNull();

    storage.setItem(TOP_COUNTRY_STORAGE_KEY, "zz");
    expect(readStoredTopCountry()).toBe("es");
  });

  it("no falla si localStorage lanza", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("bloqueado");
        },
        setItem: () => {
          throw new Error("bloqueado");
        },
        removeItem: () => {
          throw new Error("bloqueado");
        },
      },
    });
    expect(readStoredTopCountry()).toBe("es");
    expect(() => useTopChartsStore.getState().setCountry("ar")).not.toThrow();
  });
});
