import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOW_PLAYING_POLL_MS,
  NowPlayingPoller,
  syncMediaSession,
  type MediaSessionLike,
} from "./nowPlaying.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>((r) => queueMicrotask(r)).then(() => Promise.resolve());

describe("NowPlayingPoller", () => {
  let fetchTitle: ReturnType<typeof vi.fn<(id: string) => Promise<string | null>>>;
  let onTitle: ReturnType<typeof vi.fn<(id: string, title: string | null) => void>>;
  let poller: NowPlayingPoller;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchTitle = vi.fn(async (id: string) => `título ${id}`);
    onTitle = vi.fn();
    poller = new NowPlayingPoller({ fetchTitle, onTitle });
  });

  afterEach(() => {
    poller.dispose();
    vi.useRealTimers();
  });

  it("consulta de inmediato al empezar a sonar y luego periódicamente", async () => {
    poller.update({ stationId: "s1", active: true });
    expect(fetchTitle).toHaveBeenCalledTimes(1);
    await flush();
    expect(onTitle).toHaveBeenCalledWith("s1", "título s1");

    await vi.advanceTimersByTimeAsync(NOW_PLAYING_POLL_MS);
    expect(fetchTitle).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(NOW_PLAYING_POLL_MS);
    expect(fetchTitle).toHaveBeenCalledTimes(3);
  });

  it("no consulta si no está activo", async () => {
    poller.update({ stationId: "s1", active: false });
    await vi.advanceTimersByTimeAsync(NOW_PLAYING_POLL_MS * 3);
    expect(fetchTitle).not.toHaveBeenCalled();
  });

  it("deja de consultar al pausar u ocultar la pestaña y reanuda al volver", async () => {
    poller.update({ stationId: "s1", active: true });
    poller.update({ stationId: "s1", active: false });
    await vi.advanceTimersByTimeAsync(NOW_PLAYING_POLL_MS * 3);
    expect(fetchTitle).toHaveBeenCalledTimes(1);

    poller.update({ stationId: "s1", active: true });
    expect(fetchTitle).toHaveBeenCalledTimes(2);
  });

  it("no duplica consultas si el estado activo se repite", () => {
    poller.update({ stationId: "s1", active: true });
    poller.update({ stationId: "s1", active: true });
    expect(fetchTitle).toHaveBeenCalledTimes(1);
  });

  it("descarta la respuesta tardía de la emisora anterior", async () => {
    const slow = deferred<string | null>();
    fetchTitle.mockImplementationOnce(() => slow.promise);
    poller.update({ stationId: "s1", active: true });
    poller.update({ stationId: "s2", active: true });
    slow.resolve("título viejo");
    await flush();
    await flush();

    expect(onTitle).not.toHaveBeenCalledWith("s1", expect.anything());
    expect(onTitle).toHaveBeenCalledWith("s2", "título s2");
  });

  it("ignora los errores y reintenta en la siguiente consulta", async () => {
    fetchTitle.mockRejectedValueOnce(new Error("red"));
    poller.update({ stationId: "s1", active: true });
    await flush();
    expect(onTitle).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(NOW_PLAYING_POLL_MS);
    expect(onTitle).toHaveBeenCalledWith("s1", "título s1");
  });

  it("para al quedarse sin emisora", async () => {
    poller.update({ stationId: "s1", active: true });
    poller.update({ stationId: null, active: true });
    await vi.advanceTimersByTimeAsync(NOW_PLAYING_POLL_MS * 2);
    expect(fetchTitle).toHaveBeenCalledTimes(1);
  });
});

describe("syncMediaSession", () => {
  const station = { name: "Cadena 100", favicon: "https://example.org/logo.png" };
  const create = (init: unknown) => ({ init });

  function session(): MediaSessionLike {
    return { metadata: "previo", playbackState: "none" };
  }

  it("no hace nada sin Media Session", () => {
    expect(() =>
      syncMediaSession(undefined, create, { station, title: "x", isPlaying: true }),
    ).not.toThrow();
    const s = session();
    syncMediaSession(s, undefined, { station, title: "x", isPlaying: true });
    expect(s.metadata).toBe("previo");
  });

  it("publica el título actual y la emisora", () => {
    const s = session();
    syncMediaSession(s, create, { station, title: "Maná - Clavado en un bar", isPlaying: true });
    expect(s.metadata).toEqual({
      init: {
        title: "Maná - Clavado en un bar",
        artist: "Cadena 100",
        artwork: [{ src: "https://example.org/logo.png" }],
      },
    });
    expect(s.playbackState).toBe("playing");
  });

  it("usa el nombre de la emisora si no hay título", () => {
    const s = session();
    syncMediaSession(s, create, { station: { name: "SER", favicon: null }, title: null, isPlaying: false });
    expect(s.metadata).toEqual({ init: { title: "SER", artist: "TolochaRadio", artwork: [] } });
    expect(s.playbackState).toBe("paused");
  });

  it("limpia los metadatos al detener", () => {
    const s = session();
    syncMediaSession(s, create, { station: null, title: null, isPlaying: false });
    expect(s.metadata).toBeNull();
    expect(s.playbackState).toBe("none");
  });

  it("ignora errores del navegador", () => {
    const s = session();
    const throwing = () => {
      throw new TypeError("artwork inválido");
    };
    expect(() => syncMediaSession(s, throwing, { station, title: null, isPlaying: true })).not.toThrow();
  });
});
