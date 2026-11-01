export const RECONNECT_DELAYS_MS = [0, 1000, 2000, 4000, 8000, 15000] as const;
export const STALL_TIMEOUT_MS = 15_000;
export const STABLE_RESET_MS = 60_000;
export const WATCHDOG_INTERVAL_MS = 2_000;

export type MediaErrorKind = "aborted" | "network" | "decode" | "unsupported" | "unknown";

export function classifyMediaError(code: number | null | undefined): MediaErrorKind {
  switch (code) {
    case 1:
      return "aborted";
    case 2:
      return "network";
    case 3:
      return "decode";
    case 4:
      return "unsupported";
    default:
      return "unknown";
  }
}

export class ReconnectPolicy {
  private attempts = 0;

  get attemptsMade(): number {
    return this.attempts;
  }

  nextDelay(): number | null {
    const delay = RECONNECT_DELAYS_MS[this.attempts];
    if (delay === undefined) return null;
    this.attempts += 1;
    return delay;
  }

  reset(): void {
    this.attempts = 0;
  }
}

export function isHlsSource(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

export function supportsNativeHls(audio: HTMLAudioElement): boolean {
  try {
    return audio.canPlayType("application/vnd.apple.mpegurl") !== "";
  } catch {
    return false;
  }
}
