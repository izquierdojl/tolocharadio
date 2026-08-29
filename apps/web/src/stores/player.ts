import { create } from "zustand";
import type { Station } from "../lib/types.js";
import { playbackUrl } from "../lib/api.js";

interface PlayerState {
  station: Station | null;
  isPlaying: boolean;
  isBuffering: boolean;
  volume: number;
  play: (station: Station) => void;
  toggle: () => void;
  stop: () => void;
  next: (stations: Station[]) => void;
  setVolume: (volume: number) => void;
}

const VOLUME_KEY = "tolocha:volume";

function loadVolume(): number {
  const raw = window.localStorage.getItem(VOLUME_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.8;
}

let audio: HTMLAudioElement | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => {
  audio ??= new Audio();
  audio.volume = loadVolume();
  audio.preload = "none";

  audio.addEventListener("playing", () => set({ isPlaying: true, isBuffering: false }));
  audio.addEventListener("pause", () => set({ isPlaying: false }));
  audio.addEventListener("waiting", () => set({ isBuffering: true }));
  audio.addEventListener("error", () => set({ isPlaying: false, isBuffering: false }));

  return {
    station: null,
    isPlaying: false,
    isBuffering: false,
    volume: loadVolume(),

    play(station) {
      const current = get();
      if (current.station?.id === station.id) {
        if (audio!.paused) {
          void audio!.play().catch(() => undefined);
        }
        return;
      }
      audio!.src = playbackUrl(station.id);
      set({ station, isPlaying: false, isBuffering: true });
      void audio!.play().catch(() => set({ isBuffering: false }));
    },

    toggle() {
      const { isPlaying } = get();
      if (isPlaying) {
        audio!.pause();
      } else {
        void audio!.play().catch(() => undefined);
      }
    },

    stop() {
      audio!.pause();
      audio!.removeAttribute("src");
      audio!.load();
      set({ station: null, isPlaying: false, isBuffering: false });
    },

    next(stations: Station[]) {
      const { station } = get();
      if (stations.length === 0) return;
      const idx = station ? stations.findIndex((s) => s.id === station.id) : -1;
      const next = stations[(idx + 1) % stations.length] ?? stations[0]!;
      get().play(next);
    },

    setVolume(volume) {
      audio!.volume = volume;
      audio!.muted = volume === 0;
      window.localStorage.setItem(VOLUME_KEY, String(volume));
      set({ volume });
    },
  };
});