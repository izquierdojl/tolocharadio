import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectPlaylistFormat,
  fetchPlaylist,
  openFirstPlayable,
  parseM3u,
  parsePls,
  resolveCandidateEntries,
  isRecognizedPls,
} from "../src/services/playlist.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("detectPlaylistFormat", () => {
  it("detecta por extension ignorando query, fragmento y mayusculas", () => {
    expect(detectPlaylistFormat("https://x.example/radio.M3U8?token=1")).toBe("hls");
    expect(detectPlaylistFormat("https://x.example/radio.m3u?token=1")).toBe("m3u");
    expect(detectPlaylistFormat("https://x.example/dir/Radio.PLS#frag")).toBe("pls");
  });

  it("devuelve null para streams directos o URLs invalidas", () => {
    expect(detectPlaylistFormat("https://x.example/live.mp3")).toBeNull();
    expect(detectPlaylistFormat("https://x.example/live")).toBeNull();
    expect(detectPlaylistFormat("no-es-una-url")).toBeNull();
  });
});

describe("parseM3u", () => {
  it("ignora vacias y comentarios y toma el primer token", () => {
    const text = [
      "#EXTM3U",
      "#EXTINF:-1,Radio Ejemplo",
      "",
      "https://stream.example.com/live.mp3",
      "  https://backup.example.com/live.aac   ",
      "# otra directiva",
    ].join("\r\n");
    expect(parseM3u(text)).toEqual([
      "https://stream.example.com/live.mp3",
      "https://backup.example.com/live.aac",
    ]);
  });

  it("descarta el resto de la linea tras el primer token", () => {
    expect(parseM3u("https://stream.example.com/live.mp3 algo mas")).toEqual([
      "https://stream.example.com/live.mp3",
    ]);
  });
});

describe("parsePls", () => {
  it("ordena FileN ascendente e ignora el resto de claves", () => {
    const text = [
      "[playlist]",
      "NumberOfEntries=3",
      "File2=https://backup.example.com/live.aac",
      "Title2=Radio",
      "File1=https://stream.example.com/live.aac",
      "Length1=-1",
      "; comentario",
      "File10=https://tercero.example.com/live.aac",
    ].join("\n");
    expect(parsePls(text)).toEqual([
      "https://stream.example.com/live.aac",
      "https://backup.example.com/live.aac",
      "https://tercero.example.com/live.aac",
    ]);
  });

  it("reconoce el formato solo con claves FileN o seccion playlist", () => {
    expect(isRecognizedPls("File1=https://x.example/a")).toBe(true);
    expect(isRecognizedPls("[playlist]\nNumberOfEntries=0")).toBe(true);
    expect(isRecognizedPls("<html><body>error</body></html>")).toBe(false);
  });
});

describe("resolveCandidateEntries", () => {
  const base = "https://cdn.example.org/radio/lista.m3u";

  it("resuelve relativas contra la URL base", () => {
    const { candidates } = resolveCandidateEntries(["live.aac", "/stream/live.mp3"], base);
    expect(candidates).toEqual([
      "https://cdn.example.org/radio/live.aac",
      "https://cdn.example.org/stream/live.mp3",
    ]);
  });

  it("descarta entradas no HTTPS y las cuenta como URLs", () => {
    const resolution = resolveCandidateEntries(
      ["http://insegura.example/live", "rtsp://cam.example/live", "https://ok.example/live"],
      base,
    );
    expect(resolution.candidates).toEqual(["https://ok.example/live"]);
    expect(resolution.urlEntries).toBe(3);
  });

  it("deduplica preservando el orden y limita a cinco candidatos", () => {
    const entries = [
      "https://a.example/1",
      "https://a.example/1",
      ...Array.from({ length: 8 }, (_, i) => `https://b.example/${i}`),
    ];
    const { candidates } = resolveCandidateEntries(entries, base);
    expect(candidates).toHaveLength(5);
    expect(candidates[0]).toBe("https://a.example/1");
    expect(new Set(candidates).size).toBe(5);
  });

  it("ignora tokens que no son URLs", () => {
    const resolution = resolveCandidateEntries(["<html><body>error</body></html>"], base);
    expect(resolution.candidates).toEqual([]);
    expect(resolution.urlEntries).toBe(0);
  });
});

function stubTextFetch(body: string, init: ResponseInit = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status: 200, ...init })),
  );
}

describe("fetchPlaylist", () => {
  it("devuelve los candidatos de una lista M3U", async () => {
    stubTextFetch("#EXTM3U\n#EXTINF:-1,Radio\nlive.aac\nhttps://backup.example/live.aac\n");
    const playlist = await fetchPlaylist("m3u", "https://cdn.example.org/dir/lista.m3u", {
      userAgent: "test",
    });
    expect(playlist.candidates).toEqual([
      "https://cdn.example.org/dir/live.aac",
      "https://backup.example/live.aac",
    ]);
    expect(playlist.finalUrl).toBe("https://cdn.example.org/dir/lista.m3u");
  });

  it("devuelve PLAYLIST_UNREACHABLE si la descarga falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("sin red");
      }),
    );
    await expect(
      fetchPlaylist("m3u", "https://cdn.example.org/lista.m3u", { userAgent: "test" }),
    ).rejects.toMatchObject({ code: "PLAYLIST_UNREACHABLE", status: 503 });
  });

  it("devuelve PLAYLIST_UNREACHABLE si se aborta la peticion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );
    const controller = new AbortController();
    const pending = fetchPlaylist("m3u", "https://cdn.example.org/lista.m3u", {
      userAgent: "test",
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "PLAYLIST_UNREACHABLE" });
  });

  it("devuelve PLAYLIST_UNREACHABLE si vence el timeout", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5);
      return controller.signal;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );

    await expect(
      fetchPlaylist("m3u", "https://cdn.example.org/lista.m3u", { userAgent: "test" }),
    ).rejects.toMatchObject({ code: "PLAYLIST_UNREACHABLE" });
    timeoutSpy.mockRestore();
  });

  it("devuelve PLAYLIST_MALFORMED si el cuerpo supera 1 MB", async () => {
    stubTextFetch("a".repeat(1_000_001));
    await expect(
      fetchPlaylist("m3u", "https://cdn.example.org/lista.m3u", { userAgent: "test" }),
    ).rejects.toMatchObject({ code: "PLAYLIST_MALFORMED" });
  });

  it("devuelve PLAYLIST_EMPTY si no hay entradas", async () => {
    stubTextFetch("#EXTM3U\n#EXTINF:-1,Radio\n");
    await expect(
      fetchPlaylist("m3u", "https://cdn.example.org/lista.m3u", { userAgent: "test" }),
    ).rejects.toMatchObject({ code: "PLAYLIST_EMPTY" });
  });

  it("devuelve PLAYLIST_INSECURE_ONLY si solo hay entradas no HTTPS", async () => {
    stubTextFetch("#EXTM3U\nhttp://insegura.example/live\nfile:///etc/passwd\n");
    await expect(
      fetchPlaylist("m3u", "https://cdn.example.org/lista.m3u", { userAgent: "test" }),
    ).rejects.toMatchObject({ code: "PLAYLIST_INSECURE_ONLY" });
  });

  it("devuelve PLAYLIST_MALFORMED si el texto no es una lista", async () => {
    stubTextFetch("<html><body>pagina de error</body></html>");
    await expect(
      fetchPlaylist("m3u", "https://cdn.example.org/lista.m3u", { userAgent: "test" }),
    ).rejects.toMatchObject({ code: "PLAYLIST_MALFORMED" });
  });

  it("devuelve PLAYLIST_MALFORMED si un .pls no tiene FileN", async () => {
    stubTextFetch("<html><body>pagina de error</body></html>");
    await expect(
      fetchPlaylist("pls", "https://cdn.example.org/lista.pls", { userAgent: "test" }),
    ).rejects.toMatchObject({ code: "PLAYLIST_MALFORMED" });
  });

  it("parsea PLS y resuelve relativas", async () => {
    stubTextFetch("[playlist]\nFile1=live.aac\n", {
      headers: { "content-type": "audio/x-scpls" },
    });
    const playlist = await fetchPlaylist("pls", "https://cdn.example.org/dir/lista.pls", {
      userAgent: "test",
    });
    expect(playlist.candidates).toEqual(["https://cdn.example.org/dir/live.aac"]);
  });
});

describe("openFirstPlayable", () => {
  it("usa el primer candidato que responde", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = String(input);
        if (url.includes("primero")) throw new Error("caido");
        if (url.includes("segundo")) return new Response("audio", { status: 200 });
        return new Response("no", { status: 503 });
      }),
    );

    const winner = await openFirstPlayable(
      ["https://a.example/primero", "https://a.example/segundo", "https://a.example/tercero"],
      {},
    );
    expect(winner?.url).toBe("https://a.example/segundo");
  });

  it("devuelve null si ningun candidato responde", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("caido");
      }),
    );
    expect(await openFirstPlayable(["https://a.example/uno"], {})).toBeNull();
  });

  it("salta candidatos con respuesta no exitosa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = String(input);
        return url.includes("malo")
          ? new Response("error", { status: 503 })
          : new Response("audio", { status: 200 });
      }),
    );
    const winner = await openFirstPlayable(["https://a.example/malo", "https://a.example/bueno"], {});
    expect(winner?.url).toBe("https://a.example/bueno");
  });
});
