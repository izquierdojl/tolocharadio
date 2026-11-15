import { extractStreamTitle, normalizeNowPlaying } from "../lib/icy.js";
import { fetchFollowingRedirects } from "../lib/upstream.js";
import { Cache } from "./cache.js";
import { detectPlaylistFormat, fetchPlaylist, type PlaylistFormat } from "./playlist.js";

export const NOW_PLAYING_PROBE_TIMEOUT_MS = 5_000;
export const NOW_PLAYING_TTL_MS = 25_000;
export const NOW_PLAYING_UNSUPPORTED_TTL_MS = 10 * 60_000;
export const NOW_PLAYING_MAX_ENTRIES = 500;
export const ICY_MAX_METAINT = 65_536;

export type IcyProbeResult =
  | { kind: "title"; raw: string; icyName: string | null }
  | { kind: "empty" }
  | { kind: "unsupported" }
  | { kind: "error" };

export interface IcyProbeOptions {
  userAgent: string;
  timeoutMs?: number;
}

function abortPromise(signal: AbortSignal): Promise<never> {
  const toError = () => new Error("ICY probe aborted", { cause: signal.reason });
  return new Promise((_, reject) => {
    if (signal.aborted) reject(toError());
    else signal.addEventListener("abort", () => reject(toError()), { once: true });
  });
}

function parseMetaint(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const metaint = Number(value.trim());
  return metaint >= 1 && metaint <= ICY_MAX_METAINT ? metaint : null;
}

/**
 * Abre una conexión corta al origen pidiendo metadatos ICY, lee el primer
 * bloque y la cierra. Nunca lanza: cualquier fallo se traduce en `error`.
 * La conexión es independiente del stream de audio que recibe el cliente.
 */
export async function probeIcy(url: string, options: IcyProbeOptions): Promise<IcyProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("ICY probe timeout")),
    options.timeoutMs ?? NOW_PLAYING_PROBE_TIMEOUT_MS,
  );
  const aborted = abortPromise(controller.signal);
  aborted.catch(() => {});
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const { response } = await Promise.race([
      fetchFollowingRedirects(
        url,
        {
          "User-Agent": options.userAgent,
          Accept: "*/*",
          "Accept-Encoding": "identity",
          "Icy-MetaData": "1",
        },
        { signal: controller.signal },
      ),
      aborted,
    ]);

    if (!response.ok) {
      response.body?.cancel().catch(() => {});
      return { kind: "error" };
    }

    const metaint = parseMetaint(response.headers.get("icy-metaint"));
    if (metaint === null) {
      response.body?.cancel().catch(() => {});
      return { kind: "unsupported" };
    }
    const icyName = response.headers.get("icy-name")?.trim() || null;

    reader = response.body?.getReader() as ReadableStreamDefaultReader<Uint8Array> | undefined;
    if (!reader) return { kind: "error" };

    // Se descartan `metaint` bytes de audio; después llega 1 byte de longitud
    // (×16, como máximo 4080) y el bloque de metadatos. Lectura total acotada
    // a metaint + 1 + 4080 bytes.
    let toSkip = metaint;
    const meta: number[] = [];
    let blockLength: number | null = null;

    for (;;) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) return { kind: "error" };
      if (!value) continue;

      let offset = 0;
      if (toSkip > 0) {
        const skipped = Math.min(toSkip, value.byteLength);
        toSkip -= skipped;
        offset = skipped;
      }
      while (offset < value.byteLength) {
        if (blockLength === null) {
          blockLength = value[offset]! * 16;
          offset++;
          if (blockLength === 0) return { kind: "empty" };
          continue;
        }
        const take = Math.min(blockLength - meta.length, value.byteLength - offset);
        for (let i = 0; i < take; i++) meta.push(value[offset + i]!);
        offset += take;
        if (meta.length >= blockLength) break;
      }

      if (blockLength !== null && meta.length >= blockLength) break;
    }

    const title = extractStreamTitle(Uint8Array.from(meta));
    if (!title || !title.trim()) return { kind: "empty" };
    return { kind: "title", raw: title, icyName };
  } catch {
    return { kind: "error" };
  } finally {
    clearTimeout(timer);
    controller.abort();
    reader?.cancel().catch(() => {});
  }
}

export interface NowPlayingStation {
  name: string;
  url: string;
}

export interface NowPlayingServiceOptions {
  userAgent: string;
  probeTimeoutMs?: number;
  ttlMs?: number;
  unsupportedTtlMs?: number;
  maxEntries?: number;
}

/**
 * Obtiene el título que suena ahora en una emisora a partir de sus metadatos
 * ICY, con caché compartida por URL y deduplicación de sondas simultáneas.
 */
export class NowPlayingService {
  private readonly cache: Cache<IcyProbeResult>;
  private readonly inflight = new Map<string, Promise<IcyProbeResult>>();
  private readonly ttlMs: number;
  private readonly unsupportedTtlMs: number;

  constructor(private readonly options: NowPlayingServiceOptions) {
    this.ttlMs = options.ttlMs ?? NOW_PLAYING_TTL_MS;
    this.unsupportedTtlMs = options.unsupportedTtlMs ?? NOW_PLAYING_UNSUPPORTED_TTL_MS;
    this.cache = new Cache(options.maxEntries ?? NOW_PLAYING_MAX_ENTRIES, this.ttlMs);
  }

  async getTitle(station: NowPlayingStation): Promise<string | null> {
    const format = detectPlaylistFormat(station.url);
    if (format === "hls") return null;

    const result = await this.resolve(station.url, format);
    if (result.kind !== "title") return null;
    return normalizeNowPlaying(result.raw, { stationName: station.name, icyName: result.icyName });
  }

  private resolve(url: string, format: PlaylistFormat | null): Promise<IcyProbeResult> {
    const cached = this.cache.get(url);
    if (cached) return Promise.resolve(cached);

    const pending = this.inflight.get(url);
    if (pending) return pending;

    const promise = this.lookup(url, format)
      .catch((): IcyProbeResult => ({ kind: "error" }))
      .then((result) => {
        this.cache.set(url, result, result.kind === "unsupported" ? this.unsupportedTtlMs : this.ttlMs);
        return result;
      })
      .finally(() => {
        this.inflight.delete(url);
      });
    this.inflight.set(url, promise);
    return promise;
  }

  private async lookup(url: string, format: PlaylistFormat | null): Promise<IcyProbeResult> {
    const probeOptions = { userAgent: this.options.userAgent, timeoutMs: this.options.probeTimeoutMs };
    if (format !== "m3u" && format !== "pls") return probeIcy(url, probeOptions);

    let candidates: string[];
    try {
      ({ candidates } = await fetchPlaylist(format, url, { userAgent: this.options.userAgent }));
    } catch {
      return { kind: "error" };
    }

    let sawUnsupported = false;
    for (const candidate of candidates) {
      const result = await probeIcy(candidate, probeOptions);
      if (result.kind === "title" || result.kind === "empty") return result;
      if (result.kind === "unsupported") sawUnsupported = true;
    }
    return sawUnsupported ? { kind: "unsupported" } : { kind: "error" };
  }
}
