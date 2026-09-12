import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFollowingRedirects, readBodyCapped } from "../src/lib/upstream.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readBodyCapped", () => {
  it("lee el cuerpo completo cuando no supera el tope", async () => {
    const response = new Response("hola mundo");
    expect(await readBodyCapped(response, 100)).toBe("hola mundo");
  });

  it("devuelve null y cancela la lectura al superar el tope", async () => {
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("12345"));
        controller.enqueue(new TextEncoder().encode("67890"));
      },
      cancel() {
        cancelled = true;
      },
    });
    const response = new Response(stream);
    expect(await readBodyCapped(response, 5)).toBeNull();
    expect(cancelled).toBe(true);
  });

  it("devuelve cadena vacia con cuerpo vacio", async () => {
    const response = new Response(new ReadableStream({ start: (c) => c.close() }));
    expect(await readBodyCapped(response, 5)).toBe("");
  });
});

describe("fetchFollowingRedirects", () => {
  it("sigue redirecciones y devuelve la URL final", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = String(input);
        if (url === "https://a.example/start") {
          return new Response(null, { status: 302, headers: { location: "/next" } });
        }
        return new Response("ok", { status: 200 });
      }),
    );

    const { response, finalUrl } = await fetchFollowingRedirects("https://a.example/start", {});
    expect(response.status).toBe(200);
    expect(finalUrl).toBe("https://a.example/next");
  });

  it("falla con STREAM_UNAVAILABLE tras demasiadas redirecciones", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 302, headers: { location: "/loop" } })),
    );

    await expect(fetchFollowingRedirects("https://a.example/loop", {})).rejects.toMatchObject({
      code: "STREAM_UNAVAILABLE",
      status: 400,
    });
  });
});
