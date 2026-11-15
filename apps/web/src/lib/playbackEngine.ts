import {
  ReconnectPolicy,
  STABLE_RESET_MS,
  STALL_TIMEOUT_MS,
  WATCHDOG_INTERVAL_MS,
  classifyMediaError,
  isHlsSource,
} from "./playbackSupervisor.js";

export type PlaybackStatus =
  | "idle"
  | "connecting"
  | "playing"
  | "paused"
  | "reconnecting"
  | "failed";

export interface PlaybackStationRef {
  id: string;
  url: string;
}

export interface PlaybackPodcastRef {
  episodeId: number;
  resolveUrl: () => Promise<string>;
  initialPositionSec?: number;
  durationSec?: number | null;
}

export interface PlaybackSnapshot {
  status: PlaybackStatus;
  error: string | null;
  buffering: boolean;
  attempt: number;
  currentTime: number;
  duration: number;
  playbackRate: number;
  listenedMs: number;
}

export interface PlaybackEngineDeps {
  audio: HTMLAudioElement;
  prepareSession: () => Promise<boolean>;
  sourceUrl: (stationId: string, attempt: number, mode: "live" | "native") => string;
  supportsNativeHls: () => boolean;
  onChange: (snapshot: PlaybackSnapshot) => void;
  onEpisodeEnded?: (episodeId: number, snapshot: PlaybackSnapshot) => void;
  now?: () => number;
  setTimeoutFn?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (id: ReturnType<typeof setTimeout>) => void;
  setIntervalFn?: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearIntervalFn?: (id: ReturnType<typeof setInterval>) => void;
  stallTimeoutMs?: number;
  stableResetMs?: number;
  watchdogIntervalMs?: number;
}

const MESSAGES = {
  expired: "La sesión ha caducado. Inicia sesión de nuevo.",
  decode: "No se pudo decodificar el audio de esta emisora.",
  unsupported: "Esta emisora usa un formato que este reproductor no admite.",
  exhausted: "No se pudo restablecer la reproducción.",
};

export class PlaybackEngine {
  private readonly policy = new ReconnectPolicy();
  private readonly stallTimeoutMs: number;
  private readonly stableResetMs: number;
  private readonly watchdogIntervalMs: number;
  private readonly later: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  private readonly cancelLater: (id: ReturnType<typeof setTimeout>) => void;
  private readonly every: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  private readonly cancelEvery: (id: ReturnType<typeof setInterval>) => void;

  private kind: "radio" | "podcast" | null = null;
  private station: PlaybackStationRef | null = null;
  private podcast: PlaybackPodcastRef | null = null;
  private status: PlaybackStatus = "idle";
  private error: string | null = null;
  private buffering = false;
  private attempt = 0;
  private generation = 0;
  private mode: "live" | "native" = "live";
  private lastProgressAt = 0;

  private currentTime = 0;
  private duration = 0;
  private playbackRate = 1;
  private listenedMs = 0;
  private lastAudioTime: number | null = null;
  private pendingSeekSec: number | null = null;

  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private stableTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly deps: PlaybackEngineDeps) {
    this.stallTimeoutMs = deps.stallTimeoutMs ?? STALL_TIMEOUT_MS;
    this.stableResetMs = deps.stableResetMs ?? STABLE_RESET_MS;
    this.watchdogIntervalMs = deps.watchdogIntervalMs ?? WATCHDOG_INTERVAL_MS;
    this.later = deps.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms));
    this.cancelLater = deps.clearTimeoutFn ?? ((id) => clearTimeout(id));
    this.every = deps.setIntervalFn ?? ((fn, ms) => setInterval(fn, ms));
    this.cancelEvery = deps.clearIntervalFn ?? ((id) => clearInterval(id));

    const audio = deps.audio;
    audio.addEventListener("playing", this.onPlaying);
    audio.addEventListener("pause", this.onPause);
    audio.addEventListener("timeupdate", this.onTimeUpdate);
    audio.addEventListener("progress", this.onProgress);
    audio.addEventListener("loadedmetadata", this.onLoadedMetadata);
    audio.addEventListener("durationchange", this.onLoadedMetadata);
    audio.addEventListener("ended", this.onEnded);
    audio.addEventListener("error", this.onError);
    audio.addEventListener("waiting", this.onWaiting);
    audio.addEventListener("stalled", this.onWaiting);
  }

  play(station: PlaybackStationRef): void {
    const same = this.kind === "radio" && this.station?.id === station.id;
    if (same && (this.status === "playing" || this.status === "connecting")) return;
    if (same && this.status === "reconnecting") return;
    if (same && this.status === "paused") {
      this.resume();
      return;
    }

    this.kind = "radio";
    this.podcast = null;
    this.station = { id: station.id, url: station.url };
    this.mode = "live";
    this.currentTime = 0;
    this.duration = 0;
    this.listenedMs = 0;
    this.lastAudioTime = null;
    this.pendingSeekSec = null;
    this.policy.reset();
    this.attempt = 0;
    this.error = null;
    this.buffering = false;
    this.status = "connecting";
    this.emit();
    this.beginConnect();
  }

  playPodcast(target: PlaybackPodcastRef): void {
    const same = this.kind === "podcast" && this.podcast?.episodeId === target.episodeId;
    if (same && (this.status === "playing" || this.status === "connecting")) return;
    if (same && this.status === "reconnecting") return;
    if (same && this.status === "paused") {
      this.resume();
      return;
    }

    this.kind = "podcast";
    this.station = null;
    this.podcast = target;
    this.currentTime = Math.max(0, target.initialPositionSec ?? 0);
    this.duration = Math.max(0, target.durationSec ?? 0);
    this.listenedMs = 0;
    this.lastAudioTime = null;
    this.pendingSeekSec = this.currentTime > 0 ? this.currentTime : null;
    this.policy.reset();
    this.attempt = 0;
    this.error = null;
    this.buffering = false;
    this.status = "connecting";
    this.emit();
    this.beginConnect();
  }

  seek(positionSec: number): void {
    if (this.kind !== "podcast") return;
    const maxSec = this.duration > 0 ? this.duration : Number.MAX_SAFE_INTEGER;
    const clamped = Math.max(0, Math.min(positionSec, maxSec));
    this.currentTime = clamped;
    this.lastAudioTime = clamped;
    this.pendingSeekSec = clamped;
    try {
      this.deps.audio.currentTime = clamped;
    } catch {
      // Si el elemento aún no ha cargado metadatos, se aplicará en loadedmetadata
    }
    this.emit();
  }

  skip(deltaSec: number): void {
    if (this.kind !== "podcast") return;
    this.seek(this.currentTime + deltaSec);
  }

  setPlaybackRate(rate: number): void {
    const validRate = Number.isFinite(rate) && rate >= 0.5 && rate <= 3 ? rate : 1;
    this.playbackRate = validRate;
    try {
      this.deps.audio.playbackRate = validRate;
    } catch {
      // Ignorar en entornos mockeados sin setter
    }
    this.emit();
  }

  toggle(): void {
    if (!this.station && !this.podcast) return;
    if (this.status === "playing") {
      this.deps.audio.pause();
      return;
    }
    if (this.status === "failed") {
      this.retry();
      return;
    }
    this.resume();
  }

  retry(): void {
    if (!this.station && !this.podcast) return;
    if (this.kind === "podcast" && this.currentTime > 0) {
      this.pendingSeekSec = this.currentTime;
    }
    this.policy.reset();
    this.attempt = 0;
    this.error = null;
    this.buffering = false;
    this.status = "connecting";
    this.emit();
    this.beginConnect();
  }

  stop(): void {
    this.generation += 1;
    this.clearTimers();
    this.policy.reset();
    this.kind = null;
    this.station = null;
    this.podcast = null;
    this.status = "idle";
    this.error = null;
    this.buffering = false;
    this.attempt = 0;
    this.currentTime = 0;
    this.duration = 0;
    this.listenedMs = 0;
    this.lastAudioTime = null;
    this.pendingSeekSec = null;

    const audio = this.deps.audio;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    this.emit();
  }

  private resume(): void {
    if (!this.station && !this.podcast) return;
    const audio = this.deps.audio;
    if (!audio.src || audio.error) {
      this.status = "connecting";
      this.emit();
      this.beginConnect();
      return;
    }
    this.status = "connecting";
    this.lastProgressAt = this.now();
    this.startWatchdog();
    this.emit();
    void audio.play().catch(() => undefined);
  }

  private beginConnect(): void {
    const kind = this.kind;
    const station = this.station;
    const podcast = this.podcast;
    if (!kind || (kind === "radio" && !station) || (kind === "podcast" && !podcast)) return;
    const generation = ++this.generation;
    this.clearTimers();

    void (async () => {
      const ready = await this.deps.prepareSession().catch(() => false);
      if (generation !== this.generation) return;
      if (!ready) {
        this.fail(MESSAGES.expired);
        return;
      }

      let source: string;
      if (kind === "podcast" && podcast) {
        try {
          source = await podcast.resolveUrl();
        } catch {
          if (generation !== this.generation) return;
          this.recover();
          return;
        }
        if (generation !== this.generation) return;
      } else if (station) {
        source = this.deps.sourceUrl(station.id, this.attempt, this.mode);
      } else {
        return;
      }

      this.lastProgressAt = this.now();
      try {
        this.deps.audio.src = source;
        if (kind === "podcast") {
          this.deps.audio.playbackRate = this.playbackRate;
          if (this.pendingSeekSec !== null && this.pendingSeekSec > 0) {
            this.deps.audio.currentTime = this.pendingSeekSec;
          }
        } else {
          this.deps.audio.playbackRate = 1;
        }
      } catch {
        this.recover();
        return;
      }
      this.startWatchdog();
      void this.deps.audio.play().catch(() => undefined);
    })();
  }

  private recover(): void {
    if (!this.station && !this.podcast) return;
    if (this.status === "reconnecting" || this.status === "failed") return;

    const delay = this.policy.nextDelay();
    if (delay === null) {
      this.fail(MESSAGES.exhausted);
      return;
    }

    if (this.kind === "podcast" && this.currentTime > 0) {
      this.pendingSeekSec = this.currentTime;
    }

    this.attempt += 1;
    this.status = "reconnecting";
    this.buffering = false;
    this.error = null;
    this.emit();
    this.clearTimers();
    this.connectTimer = this.later(() => {
      if (this.station || this.podcast) this.beginConnect();
    }, delay);
  }

  private fail(message: string): void {
    this.status = "failed";
    this.buffering = false;
    this.error = message;
    this.clearTimers();
    this.emit();
  }

  private readonly onLoadedMetadata = (): void => {
    if (this.kind !== "podcast") return;
    const rawDur = this.deps.audio.duration;
    if (typeof rawDur === "number" && Number.isFinite(rawDur) && rawDur > 0) {
      this.duration = rawDur;
    }
    if (this.pendingSeekSec !== null && this.pendingSeekSec > 0) {
      const target = this.pendingSeekSec;
      this.pendingSeekSec = null;
      try {
        this.deps.audio.currentTime = target;
        this.currentTime = target;
        this.lastAudioTime = target;
      } catch {
        // Ignorar
      }
    }
    this.emit();
  };

  private readonly onPlaying = (): void => {
    if (this.status === "idle") return;
    this.status = "playing";
    this.buffering = false;
    this.error = null;
    this.lastProgressAt = this.now();
    if (this.kind === "podcast") {
      this.deps.audio.playbackRate = this.playbackRate;
      const audioTime = this.deps.audio.currentTime;
      if (typeof audioTime === "number" && Number.isFinite(audioTime)) {
        this.lastAudioTime = audioTime;
      }
    }
    this.emit();

    if (this.stableTimer) this.cancelLater(this.stableTimer);
    this.stableTimer = this.later(() => {
      this.policy.reset();
      this.attempt = 0;
    }, this.stableResetMs);
  };

  private readonly onPause = (): void => {
    if (this.status !== "playing") return;
    this.status = "paused";
    this.buffering = false;
    this.lastAudioTime = null;
    this.clearTimers();
    this.emit();
  };

  private readonly onTimeUpdate = (): void => {
    this.lastProgressAt = this.now();
    if (this.kind !== "podcast") return;
    const audioTime = this.deps.audio.currentTime;
    if (typeof audioTime === "number" && Number.isFinite(audioTime) && audioTime >= 0) {
      if (this.status === "playing" && this.lastAudioTime !== null) {
        const deltaSec = audioTime - this.lastAudioTime;
        // Solo acumulamos avance continuo de reproduccion (descartamos saltos seek hacia delante)
        if (deltaSec > 0 && deltaSec <= 5) {
          this.listenedMs += Math.round(deltaSec * 1000);
        }
      }
      this.lastAudioTime = audioTime;
      this.currentTime = audioTime;
    }
    const rawDur = this.deps.audio.duration;
    if (typeof rawDur === "number" && Number.isFinite(rawDur) && rawDur > 0) {
      this.duration = rawDur;
    }
    this.emit();
  };

  private readonly onProgress = (): void => {
    this.lastProgressAt = this.now();
  };

  private readonly onWaiting = (): void => {
    if (this.status !== "playing" && this.status !== "connecting") return;
    if (this.buffering) return;
    this.buffering = true;
    this.emit();
  };

  private readonly onEnded = (): void => {
    if (this.kind === "podcast" && this.podcast) {
      const episodeId = this.podcast.episodeId;
      if (this.duration > 0) {
        this.currentTime = this.duration;
      }
      this.status = "paused";
      this.buffering = false;
      this.lastAudioTime = null;
      this.clearTimers();
      this.emit();
      this.deps.onEpisodeEnded?.(episodeId, this.snapshot());
      return;
    }
    this.recover();
  };

  private readonly onError = (): void => {
    const kind = classifyMediaError(this.deps.audio.error?.code);
    if (kind === "aborted") return;

    if (kind === "decode") {
      this.fail(MESSAGES.decode);
      return;
    }

    if (kind === "unsupported") {
      if (
        this.kind === "radio" &&
        this.mode === "live" &&
        this.station &&
        this.deps.supportsNativeHls() &&
        isHlsSource(this.station.url)
      ) {
        this.mode = "native";
        this.policy.reset();
        this.attempt = 0;
        this.status = "connecting";
        this.emit();
        this.beginConnect();
        return;
      }
      this.fail(MESSAGES.unsupported);
      return;
    }

    this.recover();
  };

  private startWatchdog(): void {
    if (this.watchdog) this.cancelEvery(this.watchdog);
    this.watchdog = this.every(() => {
      if (this.status !== "playing" && this.status !== "connecting") return;
      if (this.deps.audio.paused) return;
      if (this.now() - this.lastProgressAt > this.stallTimeoutMs) this.recover();
    }, this.watchdogIntervalMs);
  }

  private clearTimers(): void {
    if (this.connectTimer) {
      this.cancelLater(this.connectTimer);
      this.connectTimer = null;
    }
    if (this.stableTimer) {
      this.cancelLater(this.stableTimer);
      this.stableTimer = null;
    }
    if (this.watchdog) {
      this.cancelEvery(this.watchdog);
      this.watchdog = null;
    }
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private snapshot(): PlaybackSnapshot {
    return {
      status: this.status,
      error: this.error,
      buffering: this.buffering,
      attempt: this.attempt,
      currentTime: this.currentTime,
      duration: this.duration,
      playbackRate: this.playbackRate,
      listenedMs: this.listenedMs,
    };
  }

  private emit(): void {
    this.deps.onChange(this.snapshot());
  }
}
