import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SUBSCRIPTION_SORT,
  isSubscriptionSortOrder,
  sortSubscriptions,
} from "./subscriptionSort.js";
import {
  SUBSCRIPTION_SORT_STORAGE_KEY,
  readStoredSubscriptionSort,
  writeStoredSubscriptionSort,
} from "../stores/subscriptionSort.js";
import type { PodcastSummary } from "./types.js";

function podcast(id: number, title: string, latest?: number | null): PodcastSummary {
  return {
    id,
    feedUrl: `https://example.org/${id}.xml`,
    title,
    author: null,
    description: null,
    imageUrl: null,
    language: null,
    link: null,
    categories: [],
    lastFetchedAt: null,
    episodeCount: 0,
    isSubscribed: true,
    ...(latest !== undefined ? { latestPendingEpisodeAt: latest } : {}),
  };
}

const titles = (items: PodcastSummary[]) => items.map((p) => p.title);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sortSubscriptions", () => {
  const input = [podcast(1, "Zeta"), podcast(2, "álbum"), podcast(3, "Beta")];

  it("ordena por nombre ascendente sin distinguir mayúsculas ni acentos", () => {
    expect(titles(sortSubscriptions(input, "name-asc"))).toEqual(["álbum", "Beta", "Zeta"]);
  });

  it("ordena por nombre descendente", () => {
    expect(titles(sortSubscriptions(input, "name-desc"))).toEqual(["Zeta", "Beta", "álbum"]);
  });

  it("ordena por episodio pendiente más reciente dejando los nulos al final", () => {
    const items = [
      podcast(1, "C", null),
      podcast(2, "B", 1_000),
      podcast(3, "A", 2_000),
      podcast(4, "Sin dato"),
    ];
    expect(titles(sortSubscriptions(items, "recent-episodes"))).toEqual([
      "A",
      "B",
      "C",
      "Sin dato",
    ]);
  });

  it("desempata por nombre cuando no hay pendientes o las fechas coinciden", () => {
    const items = [
      podcast(1, "Beta", null),
      podcast(2, "Alfa", null),
      podcast(3, "Zeta", 500),
      podcast(4, "Gamma", 500),
    ];
    expect(titles(sortSubscriptions(items, "recent-episodes"))).toEqual([
      "Gamma",
      "Zeta",
      "Alfa",
      "Beta",
    ]);
  });

  it("conserva el orden recibido en recent y no muta la entrada", () => {
    const snapshot = titles(input);
    expect(titles(sortSubscriptions(input, "recent"))).toEqual(snapshot);
    sortSubscriptions(input, "name-asc");
    expect(titles(input)).toEqual(snapshot);
  });
});

describe("preferencia de orden", () => {
  it("usa Episodios recientes por defecto", () => {
    expect(DEFAULT_SUBSCRIPTION_SORT).toBe("recent-episodes");
  });

  it("valida los valores permitidos", () => {
    expect(isSubscriptionSortOrder("name-asc")).toBe(true);
    expect(isSubscriptionSortOrder("otro")).toBe(false);
    expect(isSubscriptionSortOrder(null)).toBe(false);
  });

  it("lee un valor guardado válido", () => {
    vi.stubGlobal("window", {
      localStorage: { getItem: () => "name-desc", setItem: () => undefined },
    });
    expect(readStoredSubscriptionSort()).toBe("name-desc");
  });

  it("cae en el valor por defecto con un valor guardado inválido", () => {
    vi.stubGlobal("window", {
      localStorage: { getItem: () => "basura", setItem: () => undefined },
    });
    expect(readStoredSubscriptionSort()).toBe(DEFAULT_SUBSCRIPTION_SORT);
  });

  it("cae en el valor por defecto si localStorage lanza, y no falla al escribir", () => {
    const boom = () => {
      throw new Error("bloqueado");
    };
    vi.stubGlobal("window", { localStorage: { getItem: boom, setItem: boom } });
    expect(readStoredSubscriptionSort()).toBe("recent-episodes");
    expect(() => writeStoredSubscriptionSort("name-asc")).not.toThrow();
  });

  it("persiste con la clave esperada", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem } });
    writeStoredSubscriptionSort("recent-episodes");
    expect(setItem).toHaveBeenCalledWith(SUBSCRIPTION_SORT_STORAGE_KEY, "recent-episodes");
  });
});
