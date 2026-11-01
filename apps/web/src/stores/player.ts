import { create } from "zustand";
import type { Station } from "../lib/types.js";
import {
  ensureValidToken,
  fetchPlaybackStatus,
  livePlaybackUrl,
  playbackUrl,
} from "../lib/api.js";
import { PlaybackEngine, type PlaybackStatus } from "../lib/playbackEngine.js";
import { supportsNativeHls } from "../lib/playbackSupervisor.js";
import { toast } from "sonner";

interface PlayerState {
  station: Station | null;
  isPlaying: boolean;
  isBuffering: boolean;
  status: PlaybackStatus;
  error: string | null;
  volume: number;
  muted: boolean;
  play: (station: Station) => void;
  toggle: () => void;
  stop: () => void;
  retry: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
}

const VOLUME_KEY = "tolocha:volume";
const MUTED_KEY = "tolocha:muted";

function loadVolume(): number {
  const raw = window.localStorage.getItem(VOLUME_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.8;
}

function loadMuted(): boolean {
  return window.localStorage.getItem(MUTED_KEY) === "true";
}

let audio: HTMLAudioElement | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => {
  audio ??= new Audio();
  audio.volume = loadVolume();
  audio.muted = loadMuted();
  audio.preload = "none";

  const engine = new PlaybackEngine({
    audio,
    prepareSession: ensureValidToken,
    sourceUrl: (stationId, attempt, mode) =>
      mode === "native" ? playbackUrl(stationId, attempt) : livePlaybackUrl(stationId, attempt),
    supportsNativeHls: () => supportsNativeHls(audio!),
    onChange: (snapshot) => {
      set({
        status: snapshot.status,
        error: snapshot.error,
        isPlaying: snapshot.status === "playing",
        isBuffering:
          snapshot.buffering ||
          snapshot.status === "connecting" ||
          snapshot.status === "reconnecting",
      });
    },
  });

  return {
    station: null,
    isPlaying: false,
    isBuffering: false,
    status: "idle",
    error: null,
    volume: loadVolume(),
    muted: loadMuted(),

    play(station) {
      const isNew = get().station?.id !== station.id;
      set({ station });
      engine.play({ id: station.id, url: station.url });

      if (!isNew) return;
      void fetchPlaybackStatus(station.id)
        .then((result) => {
          if (result.playable) return;
          if (get().station?.id !== station.id) return;
          toast.error("La emisora no está disponible en este momento.");
        })
        .catch(() => undefined);
    },

    toggle() {
      engine.toggle();
    },

    stop() {
      engine.stop();
      set({ station: null });
    },

    retry() {
      engine.retry();
    },

    setVolume(volume) {
      audio!.volume = volume;
      window.localStorage.setItem(VOLUME_KEY, String(volume));
      set({ volume });
    },

    toggleMute() {
      const muted = !get().muted;
      audio!.muted = muted;
      window.localStorage.setItem(MUTED_KEY, String(muted));
      set({ muted });
    },
  };
});
