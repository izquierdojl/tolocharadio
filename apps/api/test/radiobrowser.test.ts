import { afterEach, describe, expect, it, vi } from "vitest";
import { RadioBrowserClient } from "../src/services/radiobrowser.js";
import { testConfig } from "./helpers.js";

let captured: { headers: Headers; url: URL } | undefined;

function stubFetch(body: unknown): void {
  captured = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown, init?: RequestInit) => {
      captured = { headers: new Headers(init?.headers), url: new URL(String(input)) };
      return Response.json(body);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RadioBrowserClient listados", () => {
  it("countries() identifica la app y devuelve el listado", async () => {
    const countries = [
      { name: "Spain", iso_3166_1: "ES", stationcount: 500 },
      { name: "Argentina", iso_3166_1: "AR", stationcount: 300 },
    ];
    stubFetch(countries);
    const client = new RadioBrowserClient(testConfig());

    const result = await client.countries();

    expect(result).toEqual(countries);
    expect(captured?.url.pathname.endsWith("/json/countries")).toBe(true);
    expect(captured?.url.searchParams.get("appname")).toBe("TolochaRadio");
    expect(captured?.headers.get("User-Agent")).toBe("TolochaRadio");
  });

  it("languages() identifica la app y devuelve el listado", async () => {
    const languages = [
      { name: "spanish", iso_639: "es", stationcount: 1000 },
      { name: "english", iso_639: "en", stationcount: 2000 },
    ];
    stubFetch(languages);
    const client = new RadioBrowserClient(testConfig());

    const result = await client.languages();

    expect(result).toEqual(languages);
    expect(captured?.url.pathname.endsWith("/json/languages")).toBe(true);
    expect(captured?.url.searchParams.get("appname")).toBe("TolochaRadio");
    expect(captured?.headers.get("User-Agent")).toBe("TolochaRadio");
  });

  it("tags() identifica la app y devuelve el listado de generos", async () => {
    const tags = [
      { name: "jazz", stationcount: 120 },
      { name: "pop", stationcount: 90 },
    ];
    stubFetch(tags);
    const client = new RadioBrowserClient(testConfig());

    const result = await client.tags();

    expect(result).toEqual(tags);
    expect(captured?.url.pathname.endsWith("/json/tags")).toBe(true);
    expect(captured?.url.searchParams.get("limit")).toBe("100000");
    expect(captured?.url.searchParams.get("appname")).toBe("TolochaRadio");
    expect(captured?.headers.get("User-Agent")).toBe("TolochaRadio");
  });

  it("degenera a lista vacia si la respuesta no es un array", async () => {
    stubFetch({ derp: true });
    const client = new RadioBrowserClient(testConfig());
    expect(await client.languages()).toEqual([]);
  });
});