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

export interface PlaybackSnapshot {
  status: PlaybackStatus;
  error: string | null;
  buffering: boolean;
  attempt: number;
}

export interface PlaybackEngineDeps {
  audio: HTMLAudioElement;
  prepareSession: () => Promise<boolean>;
  sourceUrl: (stationId: string, attempt: number, mode: "live" | "native") => string;
  supportsNativeHls: () => boolean;
  onChange: (snapshot: PlaybackSnapshot) => void;
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

  private station: PlaybackStationRef | null = null;
  private status: PlaybackStatus = "idle";
  private error: string | null = null;
  private buffering = false;
  private attempt = 0;
  private generation = 0;
  private mode: "live" | "native" = "live";
  private lastProgressAt = 0;

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
    audio.addEventListener("timeupdate", this.onProgress);
    audio.addEventListener("progress", this.onProgress);
    audio.addEventListener("ended", this.onEnded);
    audio.addEventListener("error", this.onError);
    audio.addEventListener("waiting", this.onWaiting);
    audio.addEventListener("stalled", this.onWaiting);
  }

  play(station: PlaybackStationRef): void {
    const same = this.station?.id === station.id;
    if (same && (this.status === "playing" || this.status === "connecting")) return;
    if (same && this.status === "reconnecting") return;
    if (same && this.status === "paused") {
      this.resume();
      return;
    }

    this.station = { id: station.id, url: station.url };
    this.mode = "live";
    this.policy.reset();
    this.attempt = 0;
    this.error = null;
    this.buffering = false;
    this.status = "connecting";
    this.emit();
    this.beginConnect();
  }

  toggle(): void {
    if (!this.station) return;
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
    if (!this.station) return;
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
    this.station = null;
    this.status = "idle";
    this.error = null;
    this.buffering = false;
    this.attempt = 0;

    const audio = this.deps.audio;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    this.emit();
  }

  private resume(): void {
    if (!this.station) return;
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
    const station = this.station;
    if (!station) return;
    const generation = ++this.generation;
    this.clearTimers();

    void (async () => {
      const ready = await this.deps.prepareSession().catch(() => false);
      if (generation !== this.generation) return;
      if (!ready) {
        this.fail(MESSAGES.expired);
        return;
      }

      const source = this.deps.sourceUrl(station.id, this.attempt, this.mode);
      this.lastProgressAt = this.now();
      try {
        this.deps.audio.src = source;
      } catch {
        this.recover();
        return;
      }
      this.startWatchdog();
      void this.deps.audio.play().catch(() => undefined);
    })();
  }

  private recover(): void {
    if (!this.station) return;
    if (this.status === "reconnecting" || this.status === "failed") return;

    const delay = this.policy.nextDelay();
    if (delay === null) {
      this.fail(MESSAGES.exhausted);
      return;
    }

    this.attempt += 1;
    this.status = "reconnecting";
    this.buffering = false;
    this.error = null;
    this.emit();
    this.clearTimers();
    this.connectTimer = this.later(() => {
      if (this.station) this.beginConnect();
    }, delay);
  }

  private fail(message: string): void {
    this.status = "failed";
    this.buffering = false;
    this.error = message;
    this.clearTimers();
    this.emit();
  }

  private readonly onPlaying = (): void => {
    if (this.status === "idle") return;
    this.status = "playing";
    this.buffering = false;
    this.error = null;
    this.lastProgressAt = this.now();
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
    this.clearTimers();
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

  private emit(): void {
    this.deps.onChange({
      status: this.status,
      error: this.error,
      buffering: this.buffering,
      attempt: this.attempt,
    });
  }
}
