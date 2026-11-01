import { describe, expect, it, vi } from "vitest";
import {
  RECONNECT_DELAYS_MS,
  ReconnectPolicy,
  classifyMediaError,
  isHlsSource,
  supportsNativeHls,
} from "./playbackSupervisor.js";

describe("clasificacion de errores multimedia", () => {
  it("traduce los codigos del elemento de audio", () => {
    expect(classifyMediaError(1)).toBe("aborted");
    expect(classifyMediaError(2)).toBe("network");
    expect(classifyMediaError(3)).toBe("decode");
    expect(classifyMediaError(4)).toBe("unsupported");
    expect(classifyMediaError(null)).toBe("unknown");
    expect(classifyMediaError(undefined)).toBe("unknown");
    expect(classifyMediaError(99)).toBe("unknown");
  });
});

describe("politica de reconexion", () => {
  it("aplica la espera creciente y se agota", () => {
    const policy = new ReconnectPolicy();
    const delays = RECONNECT_DELAYS_MS.map(() => policy.nextDelay());
    expect(delays).toEqual([...RECONNECT_DELAYS_MS]);
    expect(policy.attemptsMade).toBe(RECONNECT_DELAYS_MS.length);
    expect(policy.nextDelay()).toBeNull();
  });

  it("se reinicia tras una reproduccion estable", () => {
    const policy = new ReconnectPolicy();
    policy.nextDelay();
    policy.nextDelay();
    policy.reset();
    expect(policy.attemptsMade).toBe(0);
    expect(policy.nextDelay()).toBe(0);
  });
});

describe("deteccion de HLS nativo", () => {
  it("reconoce las URLs de manifiesto", () => {
    expect(isHlsSource("https://x.example/live/stream.m3u8")).toBe(true);
    expect(isHlsSource("https://x.example/live/stream.M3U8?x=1")).toBe(true);
    expect(isHlsSource("https://x.example/live/stream.aac")).toBe(false);
    expect(isHlsSource("no-es-una-url")).toBe(false);
  });

  it("pregunta al elemento de audio por el soporte nativo", () => {
    const audio = { canPlayType: vi.fn(() => "maybe") } as unknown as HTMLAudioElement;
    expect(supportsNativeHls(audio)).toBe(true);

    const withoutSupport = { canPlayType: vi.fn(() => "") } as unknown as HTMLAudioElement;
    expect(supportsNativeHls(withoutSupport)).toBe(false);

    const broken = {
      canPlayType: vi.fn(() => {
        throw new Error("sin soporte");
      }),
    } as unknown as HTMLAudioElement;
    expect(supportsNativeHls(broken)).toBe(false);
  });
});
