import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaybackEngine, type PlaybackSnapshot } from "./playbackEngine.js";

class FakeAudio extends EventTarget {
  src = "";
  paused = true;
  error: { code: number } | null = null;
  volume = 1;
  muted = false;
  preload = "";
  canPlayType = vi.fn(() => "");

  play = vi.fn(async () => {
    this.paused = false;
    this.dispatchEvent(new Event("playing"));
  });

  pause = vi.fn(() => {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  });

  load = vi.fn();

  removeAttribute(name: string): void {
    if (name === "src") this.src = "";
  }

  triggerError(code: number): void {
    this.error = { code };
    this.dispatchEvent(new Event("error"));
  }
}

const STATION = { id: "s1", url: "https://stream.example.org/live.mp3" };
const HLS_STATION = { id: "s2", url: "https://stream.example.org/live/stream.m3u8" };

let audio: FakeAudio;
let snapshots: PlaybackSnapshot[];
let prepareSession: ReturnType<typeof vi.fn>;
let nativeSupport: boolean;
let engine: PlaybackEngine;

function latest(): PlaybackSnapshot {
  const snapshot = snapshots[snapshots.length - 1];
  if (!snapshot) throw new Error("sin cambios de estado");
  return snapshot;
}

beforeEach(() => {
  vi.useFakeTimers();
  audio = new FakeAudio();
  snapshots = [];
  prepareSession = vi.fn(async () => true);
  nativeSupport = false;
  engine = new PlaybackEngine({
    audio: audio as unknown as HTMLAudioElement,
    prepareSession: prepareSession as unknown as () => Promise<boolean>,
    sourceUrl: (stationId, attempt, mode) => `${mode}:${stationId}:${attempt}`,
    supportsNativeHls: () => nativeSupport,
    onChange: (snapshot) => snapshots.push(snapshot),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("PlaybackEngine", () => {
  it("conecta y reproduce usando el flujo continuo", async () => {
    engine.play(STATION);
    await vi.advanceTimersByTimeAsync(0);

    expect(audio.src).toBe("live:s1:0");
    expect(latest().status).toBe("playing");
    expect(latest().error).toBeNull();
  });

  it("reconecta tras un error de red", async () => {
    engine.play(STATION);
    await vi.advanceTimersByTimeAsync(0);

    audio.triggerError(2);
    expect(latest().status).toBe("reconnecting");

    await vi.advanceTimersByTimeAsync(0);
    expect(audio.src).toBe("live:s1:1");
    expect(latest().status).toBe("playing");
  });

  it("reconecta cuando el origen termina la conexion", async () => {
    engine.play(STATION);
    await vi.advanceTimersByTimeAsync(0);

    audio.dispatchEvent(new Event("ended"));
    expect(latest().status).toBe("reconnecting");

    await vi.advanceTimersByTimeAsync(0);
    expect(latest().status).toBe("playing");
  });

  it("reconecta cuando el audio se estanca", async () => {
    engine.play(STATION);
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(16_000);
    expect(snapshots.some((snapshot) => snapshot.status === "reconnecting")).toBe(true);
  });

  it("vuelve a HLS nativo si el flujo continuo no se soporta y el navegador puede", async () => {
    nativeSupport = true;
    engine.play(HLS_STATION);
    await vi.advanceTimersByTimeAsync(0);

    audio.triggerError(4);
    await vi.advanceTimersByTimeAsync(0);

    expect(audio.src).toBe("native:s2:0");
    expect(latest().status).toBe("playing");
  });

  it("falla con mensaje si el formato no se soporta y no hay HLS nativo", async () => {
    nativeSupport = false;
    engine.play(HLS_STATION);
    await vi.advanceTimersByTimeAsync(0);

    audio.triggerError(4);
    expect(latest().status).toBe("failed");
    expect(latest().error).toContain("formato");
  });

  it("no reintenta ante un error de decodificacion", async () => {
    engine.play(STATION);
    await vi.advanceTimersByTimeAsync(0);

    audio.triggerError(3);
    expect(latest().status).toBe("failed");
    expect(latest().error).toContain("decodificar");
  });

  it("falla si la sesion no se puede refrescar", async () => {
    prepareSession.mockResolvedValueOnce(false);
    engine.play(STATION);
    await vi.advanceTimersByTimeAsync(0);

    expect(latest().status).toBe("failed");
    expect(latest().error).toContain("sesión");
  });

  it("permite reintentar tras un fallo", async () => {
    engine.play(STATION);
    await vi.advanceTimersByTimeAsync(0);
    audio.triggerError(3);
    expect(latest().status).toBe("failed");

    engine.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(latest().status).toBe("playing");
    expect(audio.src).toBe("live:s1:0");
  });

  it("pausa y reanuda sin cambiar de emisora", async () => {
    engine.play(STATION);
    await vi.advanceTimersByTimeAsync(0);

    engine.toggle();
    expect(audio.paused).toBe(true);
    expect(latest().status).toBe("paused");

    engine.toggle();
    await vi.advanceTimersByTimeAsync(0);
    expect(latest().status).toBe("playing");
  });

  it("detiene la reproduccion y limpia la fuente", async () => {
    engine.play(STATION);
    await vi.advanceTimersByTimeAsync(0);

    engine.stop();
    expect(latest().status).toBe("idle");
    expect(audio.src).toBe("");
    expect(audio.pause).toHaveBeenCalled();
  });
});
