import { afterEach, describe, expect, it, vi } from "vitest";
import { NowPlayingService, probeIcy } from "../src/services/nowPlaying.js";

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

  it("no contacta con el origen para emisoras HLS", async () => {
    const fetchMock = stubFetch(() => icyResponse("16", icyBody(16, "x")));
    const service = new NowPlayingService({ userAgent: UA });
    expect(await service.getTitle({ name: "HLS", url: "https://cdn.example.org/master.m3u8?x=1" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
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
