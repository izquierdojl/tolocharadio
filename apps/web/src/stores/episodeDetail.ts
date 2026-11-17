import { create } from "zustand";
import type { PodcastEpisode, PodcastSummary } from "../lib/types.js";

interface EpisodeDetailState {
  episode: PodcastEpisode | null;
  podcast: PodcastSummary | null;
  openedBy: HTMLElement | null;
  open: (
    episode: PodcastEpisode,
    podcast: PodcastSummary,
    trigger?: HTMLElement | null,
  ) => void;
  close: () => void;
}

function activeElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

export const useEpisodeDetailStore = create<EpisodeDetailState>((set, get) => ({
  episode: null,
  podcast: null,
  openedBy: null,

  open(episode, podcast, trigger) {
    set({
      episode,
      podcast,
      openedBy: trigger ?? activeElement(),
    });
  },

  close() {
    const { openedBy } = get();
    set({ episode: null, podcast: null, openedBy: null });
    if (openedBy?.isConnected) {
      openedBy.focus();
    }
  },
}));
