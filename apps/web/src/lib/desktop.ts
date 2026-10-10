import { usePlayerStore } from "../stores/player.js";
import type { FavoriteEntry, Station } from "./types.js";

/// Secciones de la interfaz a las que puede navegar el shell de escritorio.
export const DESKTOP_SECTIONS = ["/explorar", "/favoritos", "/historial", "/estadisticas"] as const;

/// Paso de volumen para las órdenes volume_up / volume_down.
const VOLUME_STEP = 0.05;

interface FavoriteSnapshot {
  id: string;
  name: string;
  favicon: string | null;
}

interface TauriGlobal {
  core: {
    invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;
  };
  event: {
    emit(event: string, payload?: unknown): Promise<void>;
    listen<T = unknown>(
      event: string,
      handler: (event: { payload: T }) => void,
    ): Promise<() => void>;
  };
}

interface PlayerSnapshot {
  stationId: string | null;
  name: string | null;
  favicon: string | null;
  isPlaying: boolean;
  isBuffering: boolean;
  volume: number;
  muted: boolean;
}

type ShellVersionListener = (version: string | null) => void;

type PlayerState = ReturnType<typeof usePlayerStore.getState>;

type SectionNavigator = (path: string) => void;

let started = false;
let shellVersion: string | null = null;
const shellVersionListeners = new Set<ShellVersionListener>();
/// Último listado de favoritos publicado; solo en memoria.
let favoritesCache: Station[] = [];
let navigator: SectionNavigator | null = null;

/// Registra la función de navegación del router (se llama desde dentro de la app).
export function registerDesktopNavigator(fn: SectionNavigator | null): void {
  navigator = fn;
}

/// Publica al shell la lista de favoritos del usuario para el submenú de la bandeja.
export function publishFavorites(items: FavoriteEntry[]): void {
  favoritesCache = items.map((entry) => entry.station);
  const tauri = typeof window !== "undefined" ? window.__TAURI__ : undefined;
  if (!tauri) return;
  const summaries: FavoriteSnapshot[] = favoritesCache.map((station) => ({
    id: station.id,
    name: station.name,
    favicon: station.favicon,
  }));
  void tauri.event.emit("desktop:favorites", { items: summaries });
}

function roundVolume(value: number): number {
  return Math.round(value * 100) / 100;
}

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
  }
}

/// Indica si la interfaz se está ejecutando dentro del cliente de escritorio.
export function isDesktop(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI__);
}

export function getShellVersion(): string | null {
  return shellVersion;
}

export function onShellVersion(listener: ShellVersionListener): () => void {
  shellVersionListeners.add(listener);
  listener(shellVersion);
  return () => {
    shellVersionListeners.delete(listener);
  };
}

function setShellVersion(version: string | null): void {
  shellVersion = version;
  for (const listener of shellVersionListeners) {
    listener(version);
  }
}

function snapshot(state: {
  station: Station | null;
  isPlaying: boolean;
  isBuffering: boolean;
  volume: number;
  muted: boolean;
}): PlayerSnapshot {
  return {
    stationId: state.station?.id ?? null,
    name: state.station?.name ?? null,
    favicon: state.station?.favicon ?? null,
    isPlaying: state.isPlaying,
    isBuffering: state.isBuffering,
    volume: state.volume,
    muted: state.muted,
  };
}

/// Conecta la interfaz con el cliente de escritorio (eventos) cuando se detecta Tauri.
///
/// Fuera del cliente de escritorio no se registra nada.
export async function initDesktopBridge(): Promise<void> {
  if (started) return;
  const tauri = typeof window !== "undefined" ? window.__TAURI__ : undefined;
  if (!tauri) return;
  started = true;

  let lastPayload = "";
  const emitState = (state: PlayerState): void => {
    const payload = snapshot(state);
    const serialized = JSON.stringify(payload);
    if (serialized === lastPayload) return;
    lastPayload = serialized;
    void tauri.event.emit("player:update", payload);
  };

  usePlayerStore.subscribe((state) => emitState(state));
  emitState(usePlayerStore.getState());

  await tauri.event.listen<{ action?: string; value?: number; stationId?: unknown }>(
    "player:command",
    (event) => {
      const command = event.payload;
      if (!command || typeof command !== "object") return;
      const store = usePlayerStore.getState();
      switch (command.action) {
        case "toggle":
          if (!store.station) return;
          store.toggle();
          break;
        case "stop":
          if (!store.station) return;
          store.stop();
          break;
        case "volume":
          if (typeof command.value !== "number" || Number.isNaN(command.value)) return;
          store.setVolume(Math.min(1, Math.max(0, command.value)));
          break;
        case "volume_up":
        case "volume_down": {
          const delta = command.action === "volume_up" ? VOLUME_STEP : -VOLUME_STEP;
          if (store.muted) store.toggleMute();
          store.setVolume(Math.min(1, Math.max(0, roundVolume(store.volume + delta))));
          break;
        }
        case "mute_toggle":
          store.toggleMute();
          break;
        case "play": {
          const stationId = command.stationId;
          if (typeof stationId !== "string") return;
          const station = favoritesCache.find((item) => item.id === stationId);
          if (!station) return;
          store.play(station);
          break;
        }
        default:
          break;
      }
    },
  );

  await tauri.event.listen<{ path?: unknown }>("desktop:navigate", (event) => {
    const path = event.payload?.path;
    if (typeof path !== "string") return;
    if (!(DESKTOP_SECTIONS as readonly string[]).includes(path)) return;
    navigator?.(path);
  });

  await tauri.event.listen<{ version?: string }>("desktop:info", (event) => {
    const version = event.payload?.version;
    setShellVersion(typeof version === "string" ? version : null);
  });

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin === window.location.origin) return;
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      event.preventDefault();
      void tauri.event.emit("external:open", { url: url.href });
    },
    true,
  );

  void tauri.event.emit("desktop:ready");
}
