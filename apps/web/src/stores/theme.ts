import { create } from "zustand";
import { api } from "../lib/api.js";
import type { UserTheme } from "../lib/types.js";
import { useAuthStore } from "./auth.js";

const STORAGE_KEY = "tolocha:theme";
const DEFAULT_THEME: UserTheme = "dark";

interface ThemeState {
  theme: UserTheme;
  setTheme: (theme: UserTheme) => void;
  applyFromProfile: (theme: UserTheme) => void;
}

function readStoredTheme(): UserTheme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // noop
  }
  return DEFAULT_THEME;
}

function writeStoredTheme(theme: UserTheme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // noop
  }
}

function applyDocumentTheme(theme: UserTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function getInitialTheme(): UserTheme {
  return readStoredTheme();
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),

  setTheme(theme) {
    set({ theme });
    applyDocumentTheme(theme);
    writeStoredTheme(theme);

    const user = useAuthStore.getState().user;
    if (user) {
      api
        .patch<{ user: { theme: UserTheme } }>("/users/me", { theme })
        .then((data) => {
          useAuthStore.getState().setUser({ ...user, theme: data.user.theme });
        })
        .catch(() => {});
    }
  },

  applyFromProfile(theme) {
    if (theme !== get().theme) {
      set({ theme });
      applyDocumentTheme(theme);
      writeStoredTheme(theme);
    }
  },
}));
