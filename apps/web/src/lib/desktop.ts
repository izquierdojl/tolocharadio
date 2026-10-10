import { usePlayerStore } from "../stores/player.js";
import type { Station } from "./types.js";

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
}

type ShellVersionListener = (version: string | null) => void;

type PlayerState = ReturnType<typeof usePlayerStore.getState>;

let started = false;
let shellVersion: string | null = null;
const shellVersionListeners = new Set<ShellVersionListener>();

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
}): PlayerSnapshot {
  return {
    stationId: state.station?.id ?? null,
    name: state.station?.name ?? null,
    favicon: state.station?.favicon ?? null,
    isPlaying: state.isPlaying,
    isBuffering: state.isBuffering,
    volume: state.volume,
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

  await tauri.event.listen<{ action?: string; value?: number }>(
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
        default:
          break;
      }
    },
  );

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
