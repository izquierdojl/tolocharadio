import { afterEach, describe, expect, it, vi } from "vitest";
import { HLS_ID3_PROBE_BYTES, NowPlayingService, probeHlsId3, probeIcy } from "../src/services/nowPlaying.js";

const UA = "TolochaRadio-test";

function padded(text: string): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  const out = new Uint8Array(Math.ceil(bytes.length / 16) * 16);
  out.set(bytes);
  return out;
}

/** Construye un stream ICY: `metaint` bytes de audio + longitud + bloque. */
function icyBody(metaint: number, title: string | null, chunkSize = 7): ReadableStream<Uint8Array> {
  const meta = title === null ? new Uint8Array(0) : padded(`StreamTitle='${title}';`);
  const all = new Uint8Array(metaint + 1 + meta.length + 32);
  all.fill(0xff, 0, metaint);
  all[metaint] = meta.length / 16;
  all.set(meta, metaint + 1);
  let pos = 0;
  return new ReadableStream({
    pull(controller) {
      if (pos >= all.length) return controller.close();
      controller.enqueue(all.subarray(pos, pos + chunkSize));
      pos += chunkSize;
    },
  });
}

function icyResponse(
  metaint: string | null,
  body: ReadableStream<Uint8Array>,
  extra: Record<string, string> = {},
) {
  const headers: Record<string, string> = { "content-type": "audio/mpeg", ...extra };
  if (metaint !== null) headers["icy-metaint"] = metaint;
  return new Response(body, { status: 200, headers });
}

function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: unknown, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("probeIcy", () => {
  it("lee el primer bloque, pide metadatos y no reenvía Authorization", async () => {
    const fetchMock = stubFetch(() =>
      icyResponse("16", icyBody(16, "Maná - Clavado en un bar"), { "icy-name": "Cadena 100" }),
    );
    const result = await probeIcy("https://radio.example.org/live", { userAgent: UA });
    expect(result).toEqual({ kind: "title", raw: "Maná - Clavado en un bar", icyName: "Cadena 100" });
    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["Icy-MetaData"]).toBe("1");
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain("authorization");
  });

  it("lee correctamente aunque el bloque llegue en el mismo trozo que el audio", async () => {
    stubFetch(() => icyResponse("16", icyBody(16, "Uno - Dos", 4096)));
    expect(await probeIcy("https://radio.example.org/live", { userAgent: UA })).toMatchObject({
      kind: "title",
      raw: "Uno - Dos",
    });
  });

  it("devuelve empty con un bloque de longitud cero", async () => {
    stubFetch(() => icyResponse("16", icyBody(16, null)));
    expect(await probeIcy("https://radio.example.org/live", { userAgent: UA })).toEqual({ kind: "empty" });
  });

  it("devuelve empty con StreamTitle vacío", async () => {
    stubFetch(() => icyResponse("16", icyBody(16, "")));
    expect(await probeIcy("https://radio.example.org/live", { userAgent: UA })).toEqual({ kind: "empty" });
  });

  it("devuelve unsupported sin icy-metaint o con un valor anómalo", async () => {
    stubFetch(() => icyResponse(null, icyBody(16, "x")));
    expect(await probeIcy("https://a.example.org/", { userAgent: UA })).toEqual({ kind: "unsupported" });
    stubFetch(() => icyResponse("abc", icyBody(16, "x")));
    expect(await probeIcy("https://a.example.org/", { userAgent: UA })).toEqual({ kind: "unsupported" });
    stubFetch(() => icyResponse("99999999", icyBody(16, "x")));
    expect(await probeIcy("https://a.example.org/", { userAgent: UA })).toEqual({ kind: "unsupported" });
  });

  it("devuelve error si el origen falla o corta antes del bloque", async () => {
    stubFetch(() => new Response("nope", { status: 503 }));
    expect(await probeIcy("https://a.example.org/", { userAgent: UA })).toEqual({ kind: "error" });
    stubFetch(() => {
      throw new Error("red caída");
    });
    expect(await probeIcy("https://a.example.org/", { userAgent: UA })).toEqual({ kind: "error" });
    stubFetch(() =>
      icyResponse(
        "64",
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(10));
            c.close();
          },
        }),
      ),
    );
    expect(await probeIcy("https://a.example.org/", { userAgent: UA })).toEqual({ kind: "error" });
  });

  it("aborta por tiempo si el origen no entrega el bloque", async () => {
    stubFetch(() =>
      icyResponse(
        "16000",
        new ReadableStream({
          pull() {
            return new Promise(() => {});
          },
        }),
      ),
    );
    const started = Date.now();
    const result = await probeIcy("https://slow.example.org/", { userAgent: UA, timeoutMs: 50 });
    expect(result).toEqual({ kind: "error" });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("aborta por tiempo si el origen no responde", async () => {
    stubFetch(() => new Promise<Response>(() => {}));
    const result = await probeIcy("https://slow.example.org/", { userAgent: UA, timeoutMs: 50 });
    expect(result).toEqual({ kind: "error" });
  });
});

describe("NowPlayingService", () => {
  const station = { name: "Cadena 100", url: "https://radio.example.org/live.mp3" };

  it("devuelve el título filtrado y cachea por URL entre emisoras", async () => {
    const fetchMock = stubFetch(() => icyResponse("16", icyBody(16, "Maná - Clavado en un bar")));
    const service = new NowPlayingService({ userAgent: UA });
    expect(await service.getTitle(station)).toBe("Maná - Clavado en un bar");
    expect(await service.getTitle({ ...station, name: "Otra emisora" })).toBe("Maná - Clavado en un bar");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aplica el filtro con el nombre de cada emisora", async () => {
    stubFetch(() => icyResponse("16", icyBody(16, "Loca FM")));
    const service = new NowPlayingService({ userAgent: UA });
    expect(await service.getTitle({ name: "Loca FM live", url: "https://loca.example.org/" })).toBeNull();
  });

  it("aplica el filtro con icy-name", async () => {
    stubFetch(() => icyResponse("16", icyBody(16, "Loca URBAN"), { "icy-name": "Loca Urban" }));
    const service = new NowPlayingService({ userAgent: UA });
    expect(await service.getTitle({ name: "Loca FM", url: "https://loca.example.org/" })).toBeNull();
  });

  it("agrupa sondas simultáneas en una sola petición", async () => {
    const fetchMock = stubFetch(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return icyResponse("16", icyBody(16, "Uno - Dos"));
    });
    const service = new NowPlayingService({ userAgent: UA });
    const results = await Promise.all([
      service.getTitle(station),
      service.getTitle(station),
      service.getTitle(station),
    ]);
    expect(results).toEqual(["Uno - Dos", "Uno - Dos", "Uno - Dos"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("vuelve a sondear al caducar la caché", async () => {
    const fetchMock = stubFetch(() => icyResponse("16", icyBody(16, "Uno - Dos")));
    const service = new NowPlayingService({ userAgent: UA, ttlMs: 10 });
    await service.getTitle(station);
    await new Promise((r) => setTimeout(r, 25));
    await service.getTitle(station);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recuerda más tiempo las emisoras sin soporte ICY", async () => {
    const fetchMock = stubFetch(() => icyResponse(null, icyBody(16, "x")));
    const service = new NowPlayingService({ userAgent: UA, ttlMs: 10, unsupportedTtlMs: 60_000 });
    expect(await service.getTitle(station)).toBeNull();
    await new Promise((r) => setTimeout(r, 25));
    expect(await service.getTitle(station)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("obtiene el título filtrado de una emisora HLS y lo cachea", async () => {
    const fetchMock = stubFetch(hlsOrigin({ title: "Sorry", artist: "Madonna" }));
    const service = new NowPlayingService({ userAgent: UA });
    const hls = { name: "Cadena100", url: HLS_MASTER };
    expect(await service.getTitle(hls)).toBe("Madonna - Sorry");
    expect(await service.getTitle(hls)).toBe("Madonna - Sorry");
    expect(fetchMock).toHaveBeenCalledTimes(3); // maestra + medios + segmento, una sola vez
  });

  it("descarta el marcador de publicidad de una emisora HLS", async () => {
    stubFetch(hlsOrigin({ title: "Advertisement" }));
    const service = new NowPlayingService({ userAgent: UA });
    expect(await service.getTitle({ name: "Onda Cero Gijón", url: HLS_MASTER })).toBeNull();
  });

  it("recuerda 10 min las emisoras HLS sin ID3", async () => {
    const fetchMock = stubFetch(hlsOrigin({ segment: TS_SEGMENT }));
    const service = new NowPlayingService({ userAgent: UA, ttlMs: 10, unsupportedTtlMs: 60_000 });
    const hls = { name: "RNE Radio 3", url: HLS_MASTER };
    expect(await service.getTitle(hls)).toBeNull();
    await new Promise((r) => setTimeout(r, 25));
    expect(await service.getTitle(hls)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("vuelve a sondear una emisora HLS al caducar la caché", async () => {
    const fetchMock = stubFetch(hlsOrigin({ title: "Uno - Dos" }));
    const service = new NowPlayingService({ userAgent: UA, ttlMs: 10 });
    const hls = { name: "HLS", url: HLS_MASTER };
    await service.getTitle(hls);
    await new Promise((r) => setTimeout(r, 25));
    await service.getTitle(hls);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("sondea los candidatos HTTPS de una lista en orden", async () => {
    const fetchMock = stubFetch((url) => {
      if (url.endsWith("radio.pls")) {
        return new Response(
          "[playlist]\nFile1=http://insecure.example.org/a\nFile2=https://down.example.org/b\nFile3=https://ok.example.org/c\nNumberOfEntries=3\n",
          { status: 200 },
        );
      }
      if (url.startsWith("https://down.")) return new Response("x", { status: 503 });
      if (url.startsWith("https://ok.")) return icyResponse("16", icyBody(16, "Artista - Tema"));
      throw new Error(`inesperada ${url}`);
    });
    const service = new NowPlayingService({ userAgent: UA });
    expect(await service.getTitle({ name: "Lista", url: "https://lists.example.org/radio.pls" })).toBe(
      "Artista - Tema",
    );
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls).toEqual([
      "https://lists.example.org/radio.pls",
      "https://down.example.org/b",
      "https://ok.example.org/c",
    ]);
  });

  it("devuelve null si la lista no se puede resolver", async () => {
    stubFetch(() => {
      throw new Error("caída");
    });
    const service = new NowPlayingService({ userAgent: UA });
    expect(await service.getTitle({ name: "Lista", url: "https://lists.example.org/radio.m3u" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Utilidades HLS + ID3
// ---------------------------------------------------------------------------

const HLS_MASTER = "https://cdn.example.org/live/playlist.m3u8";
const HLS_MEDIA = "https://cdn.example.org/live/chunks.m3u8";
const TS_SEGMENT = Uint8Array.from([0x47, 0x40, 0x11, 0x10, ...new Array(184).fill(0xff)]);

function syncsafe(n: number): number[] {
  return [(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f];
}

function id3Tag(frames: Record<string, string>): Uint8Array {
  const body: number[] = [];
  for (const [id, text] of Object.entries(frames)) {
    const data = [3, ...Buffer.from(text, "utf8")];
    body.push(...Buffer.from(id, "latin1"), ...syncsafe(data.length), 0, 0, ...data);
  }
  return Uint8Array.from([0x49, 0x44, 0x33, 4, 0, 0, ...syncsafe(body.length), ...body]);
}

function segmentWithId3(frames: Record<string, string>, audioBytes = 512): Uint8Array {
  const tag = id3Tag(frames);
  const out = new Uint8Array(tag.length + audioBytes);
  out.set(tag);
  out.fill(0xff, tag.length);
  return out;
}

function mediaPlaylist(extra = ""): string {
  return [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-TARGETDURATION:7",
    "#EXT-X-MEDIA-SEQUENCE:100",
    extra,
    "#EXTINF:6.0,",
    "seg_100.aac",
    "#EXTINF:6.0,",
    "seg_101.aac",
  ]
    .filter(Boolean)
    .join("\n");
}

const MASTER_PLAYLIST = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS="mp4a.40.2"\nchunks.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=128000\nhq.m3u8\n';

interface HlsOriginOptions {
  title?: string;
  artist?: string;
  segment?: Uint8Array;
  media?: string;
}

function hlsOrigin(options: HlsOriginOptions) {
  return (url: string): Response => {
    if (url === HLS_MASTER) return new Response(MASTER_PLAYLIST, { status: 200 });
    if (url === HLS_MEDIA) return new Response(options.media ?? mediaPlaylist(), { status: 200 });
    if (url.endsWith("seg_101.aac")) {
      const frames: Record<string, string> = { PRIV: "x" };
      if (options.artist) frames.TPE1 = options.artist;
      if (options.title !== undefined) frames.TIT2 = options.title;
      return new Response(options.segment ?? segmentWithId3(frames), { status: 206 });
    }
    throw new Error(`inesperada ${url}`);
  };
}

describe("probeHlsId3", () => {
  it("sigue la primera variante y lee el ID3 del último segmento", async () => {
    const fetchMock = stubFetch(hlsOrigin({ title: "Sorry", artist: "Madonna" }));
    expect(await probeHlsId3(HLS_MASTER, { userAgent: UA })).toEqual({
      kind: "title",
      raw: "Madonna - Sorry",
      icyName: null,
    });
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls).toEqual([HLS_MASTER, HLS_MEDIA, "https://cdn.example.org/live/seg_101.aac"]);

    const segmentHeaders = fetchMock.mock.calls[2]![1]!.headers as Record<string, string>;
    expect(segmentHeaders.Range).toBe(`bytes=0-${HLS_ID3_PROBE_BYTES - 1}`);
    for (const call of fetchMock.mock.calls) {
      const headers = (call[1]?.headers ?? {}) as Record<string, string>;
      expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain("authorization");
    }
  });

  it("admite una playlist de medios directa", async () => {
    stubFetch(hlsOrigin({ title: "Madonna - Sorry" }));
    expect(await probeHlsId3(HLS_MEDIA, { userAgent: UA })).toMatchObject({ kind: "title", raw: "Madonna - Sorry" });
  });

  it("devuelve empty si el segmento trae ID3 sin título", async () => {
    stubFetch(hlsOrigin({}));
    expect(await probeHlsId3(HLS_MASTER, { userAgent: UA })).toEqual({ kind: "empty" });
  });

  it("devuelve unsupported con segmentos MPEG-TS sin ID3", async () => {
    stubFetch(hlsOrigin({ segment: TS_SEGMENT }));
    expect(await probeHlsId3(HLS_MASTER, { userAgent: UA })).toEqual({ kind: "unsupported" });
  });

  it("devuelve unsupported con playlists cifradas o con EXT-X-MAP", async () => {
    stubFetch(hlsOrigin({ title: "x", media: mediaPlaylist('#EXT-X-KEY:METHOD=AES-128,URI="https://k.example.org/k"') }));
    expect(await probeHlsId3(HLS_MASTER, { userAgent: UA })).toEqual({ kind: "unsupported" });
    stubFetch(hlsOrigin({ title: "x", media: mediaPlaylist('#EXT-X-MAP:URI="init.mp4"') }));
    expect(await probeHlsId3(HLS_MASTER, { userAgent: UA })).toEqual({ kind: "unsupported" });
  });

  it("acota la lectura si el origen ignora Range", async () => {
    let enqueued = 0;
    const big = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(segmentWithId3({ TIT2: "Uno - Dos" }, 0));
      },
      pull(controller) {
        enqueued += 4096;
        controller.enqueue(new Uint8Array(4096).fill(0xff));
        if (enqueued > 10 * 1024 * 1024) controller.close();
      },
    });
    stubFetch((url) => {
      if (url.endsWith("seg_101.aac")) return new Response(big, { status: 200 });
      return hlsOrigin({})(url);
    });
    expect(await probeHlsId3(HLS_MASTER, { userAgent: UA })).toMatchObject({ kind: "title", raw: "Uno - Dos" });
    expect(enqueued).toBeLessThan(64 * 1024);
  });

  it("devuelve error si el segmento falla o el origen es lento", async () => {
    stubFetch((url) => (url.endsWith(".aac") ? new Response("x", { status: 404 }) : hlsOrigin({})(url)));
    expect(await probeHlsId3(HLS_MASTER, { userAgent: UA })).toEqual({ kind: "error" });

    stubFetch((url) => (url === HLS_MASTER ? new Promise<Response>(() => {}) : hlsOrigin({})(url)));
    const started = Date.now();
    expect(await probeHlsId3(HLS_MASTER, { userAgent: UA, timeoutMs: 50 })).toEqual({ kind: "error" });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("devuelve error si el manifiesto no es HLS", async () => {
    stubFetch(() => new Response("<html></html>", { status: 200 }));
    expect(await probeHlsId3(HLS_MASTER, { userAgent: UA })).toEqual({ kind: "error" });
  });
});
