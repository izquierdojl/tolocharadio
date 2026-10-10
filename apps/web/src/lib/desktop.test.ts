import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (event: { payload: unknown }) => void;

interface TauriMock {
  emitted: Array<{ event: string; payload: unknown }>;
  listeners: Map<string, Listener>;
  tauri: {
    core: { invoke: ReturnType<typeof vi.fn> };
    event: {
      emit: ReturnType<typeof vi.fn>;
      listen: ReturnType<typeof vi.fn>;
    };
  };
}

function createTauriMock(): TauriMock {
  const emitted: TauriMock["emitted"] = [];
  const listeners = new Map<string, Listener>();
  return {
    emitted,
    listeners,
    tauri: {
      core: { invoke: vi.fn() },
      event: {
        emit: vi.fn(async (event: string, payload?: unknown) => {
          emitted.push({ event, payload });
        }),
        listen: vi.fn(async (event: string, handler: Listener) => {
          listeners.set(event, handler);
          return () => listeners.delete(event);
        }),
      },
    },
  };
}

const playerState = {
  station: null as { id: string; name: string; favicon: string | null } | null,
  isPlaying: false,
  isBuffering: false,
  volume: 0.8,
};

const subscribers = new Set<(state: unknown) => void>();
const actions = {
  toggle: vi.fn(),
  stop: vi.fn(),
  setVolume: vi.fn(),
};

vi.mock("../stores/player.js", () => ({
  usePlayerStore: {
    getState: () => ({ ...playerState, ...actions }),
    subscribe: (listener: (state: unknown) => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  },
}));

function setWindow(mock: TauriMock | null): void {
  (globalThis as Record<string, unknown>).window = mock
    ? {
        __TAURI__: mock.tauri,
        location: {
          href: "https://radio.ejemplo.com/explorar",
          origin: "https://radio.ejemplo.com",
        },
      }
    : { location: { href: "https://radio.ejemplo.com/", origin: "https://radio.ejemplo.com" } };
}

type ClickHandler = (event: {
  target: unknown;
  preventDefault: ReturnType<typeof vi.fn>;
}) => void;
let clickHandler: ClickHandler | null = null;

beforeEach(() => {
  vi.resetModules();
  subscribers.clear();
  clickHandler = null;
  playerState.station = null;
  playerState.isPlaying = false;
  playerState.isBuffering = false;
  playerState.volume = 0.8;
  actions.toggle.mockClear();
  actions.stop.mockClear();
  actions.setVolume.mockClear();
  (globalThis as Record<string, unknown>).document = {
    addEventListener: vi.fn((type: string, handler: ClickHandler) => {
      if (type === "click") clickHandler = handler;
    }),
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).document;
});

async function loadDesktop() {
  return await import("./desktop.js");
}

function changeState(): void {
  for (const listener of subscribers) {
    listener({ ...playerState, ...actions });
  }
}

describe("puente de escritorio", () => {
  it("no registra nada si no existe window.__TAURI__", async () => {
    setWindow(null);
    const { initDesktopBridge, isDesktop } = await loadDesktop();
    expect(isDesktop()).toBe(false);
    await initDesktopBridge();
    expect(document.addEventListener).not.toHaveBeenCalled();
  });

  it("emite el estado del reproductor al arrancar y al cambiar", async () => {
    const mock = createTauriMock();
    setWindow(mock);
    const { initDesktopBridge } = await loadDesktop();
    await initDesktopBridge();

    expect(mock.tauri.event.emit).toHaveBeenCalledWith(
      "player:update",
      expect.objectContaining({ stationId: null, isPlaying: false, volume: 0.8 }),
    );

    playerState.station = { id: "s1", name: "Radio Test", favicon: "https://x/f.png" };
    playerState.isPlaying = true;
    changeState();

    expect(mock.tauri.event.emit).toHaveBeenCalledWith(
      "player:update",
      expect.objectContaining({
        stationId: "s1",
        name: "Radio Test",
        isPlaying: true,
      }),
    );
    expect(mock.tauri.event.emit).toHaveBeenCalledWith("desktop:ready");
  });

  it("ignora toggle y stop sin emisora seleccionada", async () => {
    const mock = createTauriMock();
    setWindow(mock);
    const { initDesktopBridge } = await loadDesktop();
    await initDesktopBridge();

    const commandHandler = mock.listeners.get("player:command");
    expect(commandHandler).toBeDefined();
    commandHandler!({ payload: { action: "toggle" } });
    commandHandler!({ payload: { action: "stop" } });

    expect(actions.toggle).not.toHaveBeenCalled();
    expect(actions.stop).not.toHaveBeenCalled();
  });

  it("obedece los comandos con emisora seleccionada y acota el volumen", async () => {
    const mock = createTauriMock();
    setWindow(mock);
    const { initDesktopBridge } = await loadDesktop();
    await initDesktopBridge();

    playerState.station = { id: "s1", name: "Radio Test", favicon: null };
    const commandHandler = mock.listeners.get("player:command")!;

    commandHandler({ payload: { action: "toggle" } });
    expect(actions.toggle).toHaveBeenCalledTimes(1);

    commandHandler({ payload: { action: "stop" } });
    expect(actions.stop).toHaveBeenCalledTimes(1);

    commandHandler({ payload: { action: "volume", value: 2 } });
    expect(actions.setVolume).toHaveBeenCalledWith(1);

    commandHandler({ payload: { action: "volume", value: 0.3 } });
    expect(actions.setVolume).toHaveBeenCalledWith(0.3);
  });

  it("guarda la versión del shell recibida del contenedor", async () => {
    const mock = createTauriMock();
    setWindow(mock);
    const { initDesktopBridge, getShellVersion, onShellVersion } = await loadDesktop();
    await initDesktopBridge();

    const seen: Array<string | null> = [];
    const unsubscribe = onShellVersion((version) => seen.push(version));
    expect(getShellVersion()).toBeNull();

    mock.listeners.get("desktop:info")!({ payload: { version: "1.2.3" } });
    expect(getShellVersion()).toBe("1.2.3");
    expect(seen).toEqual([null, "1.2.3"]);

    unsubscribe();
  });

  it("abre enlaces externos en el sistema y no toca los del propio servidor", async () => {
    const mock = createTauriMock();
    setWindow(mock);
    const { initDesktopBridge } = await loadDesktop();
    await initDesktopBridge();

    expect(clickHandler).not.toBeNull();

    const externalPrevent = vi.fn();
    clickHandler!({
      target: { closest: () => ({ getAttribute: () => "https://github.com/izquierdojl/tolocharadio" }) },
      preventDefault: externalPrevent,
    });
    expect(externalPrevent).toHaveBeenCalled();
    expect(mock.tauri.event.emit).toHaveBeenCalledWith("external:open", {
      url: "https://github.com/izquierdojl/tolocharadio",
    });

    const internalPrevent = vi.fn();
    clickHandler!({
      target: { closest: () => ({ getAttribute: () => "/favoritos" }) },
      preventDefault: internalPrevent,
    });
    expect(internalPrevent).not.toHaveBeenCalled();
  });
});
