import { create } from "zustand";

const STORAGE_KEY = "tolocha:viewMode";
const DEFAULT_VIEW_MODE: ViewMode = "card";

export type ViewMode = "card" | "list";

interface ViewModeState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

function readStoredViewMode(): ViewMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "card" || stored === "list") return stored;
  } catch {
    // noop
  }
  return DEFAULT_VIEW_MODE;
}

function writeStoredViewMode(mode: ViewMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // noop
  }
}

export function getInitialViewMode(): ViewMode {
  return readStoredViewMode();
}

export const useViewModeStore = create<ViewModeState>((set) => ({
  viewMode: getInitialViewMode(),

  setViewMode(mode) {
    set({ viewMode: mode });
    writeStoredViewMode(mode);
  },
}));