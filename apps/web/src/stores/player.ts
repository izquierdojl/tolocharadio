import { create } from "zustand";
import type { PlaybackRate, PodcastEpisode, PodcastSummary, Station } from "../lib/types.js";
import {
  ensureValidToken,
  fetchPlaybackStatus,
  issueEpisodePlaybackToken,
  livePlaybackUrl,
  playbackUrl,
  saveEpisodeProgress,
} from "../lib/api.js";
import { PlaybackEngine, type PlaybackStatus } from "../lib/playbackEngine.js";
import { supportsNativeHls } from "../lib/playbackSupervisor.js";
import { toast } from "sonner";

export type EpisodeEndedHook = (
  episode: PodcastEpisode,
  podcast: PodcastSummary,
) => void | Promise<void>;

let episodeEndedHook: EpisodeEndedHook | null = null;

export function registerEpisodeEndedHook(hook: EpisodeEndedHook | null): void {
  episodeEndedHook = hook;
}

export type PodcastQueueAction = "next" | "previous";

let queueActionHandler: ((action: PodcastQueueAction) => void) | null = null;

/// Registra el manejador de las teclas multimedia siguiente/anterior.
export function registerPodcastQueueActionHandler(
  handler: ((action: PodcastQueueAction) => void) | null,
): void {
  queueActionHandler = handler;
}

export function dispatchPodcastQueueAction(action: PodcastQueueAction): void {
  queueActionHandler?.(action);
}

interface PlayerState {
  kind: "radio" | "podcast" | null;
  station: Station | null;
  episode: PodcastEpisode | null;
  podcast: PodcastSummary | null;
  isPlaying: boolean;
  isBuffering: boolean;
  status: PlaybackStatus;
  error: string | null;
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  playbackRate: PlaybackRate;
  listenedMs: number;
  /** Título que suena ahora en la emisora actual (metadatos ICY), si lo hay. */
  nowPlaying: string | null;
  play: (station: Station) => void;
  playEpisode: (
    episode: PodcastEpisode,
    podcast: PodcastSummary,
    options?: { startPositionSec?: number },
  ) => void;
  toggle: () => void;
  stop: () => void;
  retry: () => void;
  seek: (positionSec: number) => void;
  skip: (deltaSec: number) => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  /** Guarda el título solo si sigue sonando la misma emisora. */
  setNowPlaying: (stationId: string, title: string | null) => void;
}

const VOLUME_KEY = "tolocha:volume";
const MUTED_KEY = "tolocha:muted";
const RATE_KEY = "tolocha:playbackRate";
const PROGRESS_INTERVAL_MS = 12_000;

function loadVolume(): number {
  const raw = window.localStorage.getItem(VOLUME_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.8;
}

function loadMuted(): boolean {
  return window.localStorage.getItem(MUTED_KEY) === "true";
}

function loadPlaybackRate(): PlaybackRate {
  const raw = Number(window.localStorage.getItem(RATE_KEY));
  if (raw === 1 || raw === 1.25 || raw === 1.5 || raw === 2) return raw;
  return 1;
}

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function computeResumePositionSec(episode: PodcastEpisode): number {
  const prog = episode.progress;
  if (!prog || prog.completed) return 0;
  const pos = prog.positionSec;
  if (pos < 5) return 0;
  const dur = prog.durationSec ?? episode.durationSec ?? 0;
  if (dur > 0 && pos >= dur - 30) return 0;
  return pos;
}

let audio: HTMLAudioElement | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => {
  audio ??= new Audio();
  audio.volume = loadVolume();
  audio.muted = loadMuted();
  audio.preload = "none";

  let activeSessionId: string | null = null;
  let activeSequence = 0;
  let progressTimer: ReturnType<typeof setInterval> | null = null;

  const flushEpisodeProgress = (opts: { completed?: boolean; keepalive?: boolean } = {}) => {
    const state = get();
    if (state.kind !== "podcast" || !state.episode || !activeSessionId) return;
    activeSequence += 1;
    const dur =
      state.duration > 0
        ? Math.round(state.duration)
        : state.episode.durationSec ?? null;
    void saveEpisodeProgress(
      state.episode.id,
      {
        sessionId: activeSessionId,
        sequence: activeSequence,
        positionSec: Math.round(state.currentTime),
        durationSec: dur,
        listenedMs: Math.round(state.listenedMs),
        completed: opts.completed,
        occurredAt: Date.now(),
        source: "web",
      },
      Boolean(opts.keepalive),
    ).catch(() => undefined);
  };

  const stopProgressTimer = () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  };

  const startProgressTimer = () => {
    stopProgressTimer();
    progressTimer = setInterval(() => {
      const state = get();
      if (state.kind === "podcast" && state.isPlaying) {
        flushEpisodeProgress();
      }
    }, PROGRESS_INTERVAL_MS);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => {
      flushEpisodeProgress({ keepalive: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushEpisodeProgress({ keepalive: true });
      }
    });
  }

  const engine = new PlaybackEngine({
    audio,
    prepareSession: ensureValidToken,
    sourceUrl: (stationId, attempt, mode) =>
      mode === "native" ? playbackUrl(stationId, attempt) : livePlaybackUrl(stationId, attempt),
    supportsNativeHls: () => supportsNativeHls(audio!),
    onChange: (snapshot) => {
      const state = get();
      if (!state) return;
      const prevPlaying = state.isPlaying;
      const nowPlayingState = snapshot.status === "playing";
      set({
        status: snapshot.status,
        error: snapshot.error,
        isPlaying: nowPlayingState,
        isBuffering:
          snapshot.buffering ||
          snapshot.status === "connecting" ||
          snapshot.status === "reconnecting",
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        listenedMs: snapshot.listenedMs,
      });
      if (prevPlaying && !nowPlayingState && get().kind === "podcast") {
        flushEpisodeProgress();
      }
    },
    onEpisodeEnded: (_episodeId, snapshot) => {
      set({
        currentTime: snapshot.currentTime,
        duration: snapshot.duration,
        listenedMs: snapshot.listenedMs,
      });
      flushEpisodeProgress({ completed: true });
      stopProgressTimer();
      const ep = get().episode;
      const pod = get().podcast;
      if (ep && pod && episodeEndedHook) {
        void episodeEndedHook(ep, pod);
      }
    },
  });

  const initialRate = loadPlaybackRate();
  // Evita emitir durante la inicialización del store (get() aún no tiene estado).
  (engine as unknown as { playbackRate: number }).playbackRate = initialRate;
  audio.playbackRate = initialRate;

  return {
    kind: null,
    station: null,
    episode: null,
    podcast: null,
    isPlaying: false,
    isBuffering: false,
    status: "idle",
    error: null,
    volume: loadVolume(),
    muted: loadMuted(),
    currentTime: 0,
    duration: 0,
    playbackRate: initialRate,
    listenedMs: 0,
    nowPlaying: null,

    play(station) {
      if (get().kind === "podcast") {
        flushEpisodeProgress();
        stopProgressTimer();
      }
      activeSessionId = null;
      activeSequence = 0;

      const isNew = get().kind !== "radio" || get().station?.id !== station.id;
      set(
        isNew
          ? {
              kind: "radio",
              station,
              episode: null,
              podcast: null,
              nowPlaying: null,
              currentTime: 0,
              duration: 0,
              listenedMs: 0,
            }
          : { kind: "radio", station },
      );
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

    playEpisode(episode, podcast, options) {
      const sameEpisode = get().kind === "podcast" && get().episode?.id === episode.id;
      if (sameEpisode && get().status === "paused" && options?.startPositionSec === undefined) {
        startProgressTimer();
        engine.toggle();
        return;
      }

      if (get().kind === "podcast" && !sameEpisode) {
        flushEpisodeProgress();
      }

      activeSessionId = makeSessionId();
      activeSequence = 0;
      const initialPositionSec =
        options?.startPositionSec !== undefined
          ? options.startPositionSec
          : computeResumePositionSec(episode);

      set({
        kind: "podcast",
        station: null,
        episode,
        podcast,
        nowPlaying: null,
        currentTime: initialPositionSec,
        duration: episode.durationSec ?? 0,
        listenedMs: 0,
      });

      startProgressTimer();
      engine.playPodcast({
        episodeId: episode.id,
        resolveUrl: async () => {
          const token = await issueEpisodePlaybackToken(episode.id);
          return token.url;
        },
        initialPositionSec,
        durationSec: episode.durationSec,
      });
    },

    toggle() {
      engine.toggle();
    },

    stop() {
      if (get().kind === "podcast") {
        flushEpisodeProgress();
      }
      stopProgressTimer();
      activeSessionId = null;
      activeSequence = 0;
      engine.stop();
      set({
        kind: null,
        station: null,
        episode: null,
        podcast: null,
        nowPlaying: null,
        currentTime: 0,
        duration: 0,
        listenedMs: 0,
      });
    },

    retry() {
      engine.retry();
    },

    seek(positionSec) {
      engine.seek(positionSec);
      flushEpisodeProgress();
    },

    skip(deltaSec) {
      engine.skip(deltaSec);
      flushEpisodeProgress();
    },

    setPlaybackRate(rate) {
      window.localStorage.setItem(RATE_KEY, String(rate));
      set({ playbackRate: rate });
      engine.setPlaybackRate(rate);
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

    setNowPlaying(stationId, title) {
      if (get().station?.id !== stationId) return;
      if (get().nowPlaying === title) return;
      set({ nowPlaying: title });
    },
  };
});
