import { create } from "zustand";
import { DEFAULT_TOP_COUNTRY, isTopCountry, isTopGenre } from "../lib/topCharts.js";

export const TOP_COUNTRY_STORAGE_KEY = "tolocha:topCountry";
export const TOP_GENRE_STORAGE_KEY = "tolocha:topGenre";

interface TopChartsState {
  country: string;
  /** Identificador de categoria de Apple; `null` = ranking general. */
  genre: string | null;
  setCountry: (country: string) => void;
  setGenre: (genre: string | null) => void;
}

export function readStoredTopCountry(): string {
  try {
    const stored = window.localStorage.getItem(TOP_COUNTRY_STORAGE_KEY);
    if (isTopCountry(stored)) return stored;
  } catch {
    // noop
  }
  return DEFAULT_TOP_COUNTRY;
}

export function readStoredTopGenre(): string | null {
  try {
    const stored = window.localStorage.getItem(TOP_GENRE_STORAGE_KEY);
    if (isTopGenre(stored)) return stored;
  } catch {
    // noop
  }
  return null;
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // noop
  }
}

export const useTopChartsStore = create<TopChartsState>((set) => ({
  country: readStoredTopCountry(),
  genre: readStoredTopGenre(),

  setCountry(country) {
    if (!isTopCountry(country)) return;
    set({ country });
    write(TOP_COUNTRY_STORAGE_KEY, country);
  },

  setGenre(genre) {
    const next = isTopGenre(genre) ? genre : null;
    set({ genre: next });
    write(TOP_GENRE_STORAGE_KEY, next);
  },
}));
