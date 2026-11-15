import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertSafeUpstreamUrl,
  fetchFollowingRedirects,
  isPrivateOrReservedIp,
  readBodyCapped,
} from "../src/lib/upstream.js";

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

describe("isPrivateOrReservedIp y assertSafeUpstreamUrl (SSRF)", () => {
  it("detecta IPs privadas, loopback, link-local y metadatos cloud", () => {
    for (const bad of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.10",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fe80::1",
      "fd00::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isPrivateOrReservedIp(bad)).toBe(true);
    }

    for (const pub of ["93.184.216.34", "1.1.1.1", "8.8.8.8", "2606:2800:220:1:248:1893:25c8:1946"]) {
      expect(isPrivateOrReservedIp(pub)).toBe(false);
    }
  });

  it("rechaza esquemas no http(s), puertos no estandar y hosts locales", async () => {
    for (const url of [
      "file:///etc/passwd",
      "ftp://example.com/feed.xml",
      "http://localhost/feed.xml",
      "http://127.0.0.1/feed.xml",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]/feed.xml",
      "https://example.com:8080/feed.xml",
    ]) {
      await expect(assertSafeUpstreamUrl(url)).rejects.toMatchObject({
        code: "SSRF_BLOCKED",
        status: 400,
      });
    }
  });

  it("rechaza dominios cuya resolucion DNS apunta a una IP privada", async () => {
    await expect(
      assertSafeUpstreamUrl("https://intranet.corp/feed.xml", async () => [
        { address: "10.12.0.5", family: 4 },
      ]),
    ).rejects.toMatchObject({
      code: "SSRF_BLOCKED",
      status: 400,
    });
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

  it("bloquea una redireccion hacia loopback o IP privada", async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url === "https://a.example/start") {
        return new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/internal" },
        });
      }
      return new Response("secret", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFollowingRedirects("https://a.example/start", {})).rejects.toMatchObject({
      code: "SSRF_BLOCKED",
      status: 400,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
