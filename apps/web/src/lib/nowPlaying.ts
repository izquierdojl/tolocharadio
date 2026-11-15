/**
 * Lógica pura de "Ahora suena": consulta periódica condicionada del título
 * actual y publicación en la Media Session API. Sin dependencias de React ni
 * del DOM para poder probarla en node.
 */

export const NOW_PLAYING_POLL_MS = 30_000;

export interface NowPlayingPollerDeps {
  fetchTitle: (stationId: string) => Promise<string | null>;
  onTitle: (stationId: string, title: string | null) => void;
  intervalMs?: number;
  setIntervalFn?: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearIntervalFn?: (id: ReturnType<typeof setInterval>) => void;
}

export interface NowPlayingPollerState {
  stationId: string | null;
  /** Sonando y con la pestaña visible. */
  active: boolean;
}

/**
 * Consulta el título actual nada más activarse y después cada `intervalMs`,
 * solo mientras está activo. Descarta respuestas de una emisora anterior y
 * los errores (se reintenta en la siguiente consulta).
 */
export class NowPlayingPoller {
  private stationId: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private readonly intervalMs: number;
  private readonly every: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  private readonly cancelEvery: (id: ReturnType<typeof setInterval>) => void;

  constructor(private readonly deps: NowPlayingPollerDeps) {
    this.intervalMs = deps.intervalMs ?? NOW_PLAYING_POLL_MS;
    this.every = deps.setIntervalFn ?? ((fn, ms) => setInterval(fn, ms));
    this.cancelEvery = deps.clearIntervalFn ?? ((id) => clearInterval(id));
  }

  update(state: NowPlayingPollerState): void {
    if (state.stationId !== this.stationId) {
      this.stop();
      this.generation++;
      this.stationId = state.stationId;
    }

    const shouldRun = state.active && this.stationId !== null;
    if (shouldRun && this.timer === null) {
      this.poll();
      this.timer = this.every(() => this.poll(), this.intervalMs);
    } else if (!shouldRun) {
      this.stop();
    }
  }

  dispose(): void {
    this.stop();
    this.generation++;
    this.stationId = null;
  }

  private stop(): void {
    if (this.timer !== null) {
      this.cancelEvery(this.timer);
      this.timer = null;
    }
  }

  private poll(): void {
    const stationId = this.stationId;
    if (stationId === null) return;
    const generation = this.generation;
    this.deps
      .fetchTitle(stationId)
      .then((title) => {
        if (generation !== this.generation || stationId !== this.stationId) return;
        this.deps.onTitle(stationId, title);
      })
      .catch(() => undefined);
  }
}

export interface MediaSessionLike {
  metadata: unknown;
  playbackState: "none" | "paused" | "playing";
}

export interface MediaMetadataInitLike {
  title: string;
  artist: string;
  artwork: Array<{ src: string }>;
}

export type MediaMetadataFactory = (init: MediaMetadataInitLike) => unknown;

export interface MediaSessionState {
  station: { name: string; favicon: string | null } | null;
  title: string | null;
  isPlaying: boolean;
}

/**
 * Publica la emisora y el título actual en la Media Session. Si la API no
 * existe no hace nada; cualquier error del navegador se ignora.
 */
export function syncMediaSession(
  session: MediaSessionLike | undefined,
  createMetadata: MediaMetadataFactory | undefined,
  state: MediaSessionState,
): void {
  if (!session || !createMetadata) return;
  try {
    if (!state.station) {
      session.metadata = null;
      session.playbackState = "none";
      return;
    }
    session.metadata = createMetadata({
      title: state.title ?? state.station.name,
      artist: state.title ? state.station.name : "TolochaRadio",
      artwork: state.station.favicon ? [{ src: state.station.favicon }] : [],
    });
    session.playbackState = state.isPlaying ? "playing" : "paused";
  } catch {
    // Navegadores con soporte parcial: la reproducción no depende de esto.
  }
}
