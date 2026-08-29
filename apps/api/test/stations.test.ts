import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RAW_STATION, RAW_STATION_TWO } from "./fixtures.js";
import type { TestServer } from "./helpers.js";
import { request, setupServer } from "./helpers.js";

let server: TestServer;
let fetchMock: ReturnType<typeof vi.fn>;

function stubSearch(callback: (url: URL) => Promise<unknown[]>) {
  fetchMock = vi.fn(async (input: unknown) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/stations/search")) {
      return Response.json(await callback(url));
    }
    throw new Error(`fetch inesperado: ${String(url)}`);
  });
  vi.stubGlobal("fetch", fetchMock);
}

function stubByUuidByList(list: Array<Record<string, unknown>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/stations/search")) return Response.json(list);
      if (url.pathname.includes("/stations/byuuid/")) {
        const uuid = url.pathname.split("/").pop()!;
        const hit = list.find((s) => s.stationuuid === uuid || uuid.includes(String(s.stationuuid).slice(0, 8)));
        return Response.json(hit ? [hit] : []);
      }
throw new Error(`fetch inesperado: ${String(url)}`);
    }),
  );
}

beforeEach(() => {
  server = setupServer();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stations catalog", () => {
  it("normaliza y devuelve una pagina de emisoras", async () => {
    stubSearch(async () => [RAW_STATION]);

    const res = await request(server.app)
      .get("/api/v1/stations")
      .query({ name: "Radio Test" })
      .expect(200);

    const item = res.body.items[0] as Record<string, unknown>;
    expect(res.body.pagination).toEqual({ offset: 0, limit: 24, hasMore: false });
    expect(item).toMatchObject({
      id: RAW_STATION.stationuuid,
      name: "Radio Test",
      url: "https://cdn.example.org/live.mp3",
      country: "Spain",
      countryCode: "ES",
      language: "spanish",
      codec: "MP3",
      bitrate: 128,
      isSsl: true,
      votes: 42,
    });
    expect(item.tags).toEqual(["pop", "rock"]);
  });

  it("propaga el User-Agent y appname a radio-browser", async () => {
    let captured: { headers: Headers; url: URL } | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown, init?: RequestInit) => {
        captured = {
          headers: new Headers(init?.headers),
          url: new URL(String(input)),
        };
        return Response.json([RAW_STATION]);
      }),
    );
    await request(server.app).get("/api/v1/stations").query({ name: "x" }).expect(200);
    expect(captured?.headers.get("User-Agent")).toBe("TolochaRadio");
    expect(captured?.url.searchParams.get("appname")).toBe("TolochaRadio");
    expect(captured?.url.searchParams.get("hidebroken")).toBe("true");
  });

  it("deduplica por nombre con unique=true", async () => {
    const deberiaDuplicar = { ...RAW_STATION, name: "Radio Test" };
    stubSearch(async () => [RAW_STATION, RAW_STATION_TWO, deberiaDuplicar]);
    const res = await request(server.app).get("/api/v1/stations").query({ unique: "true" }).expect(200);
    expect(res.body.items).toHaveLength(2);
  });

  it("devuelve 422 si un parametro de busqueda es invalido (no 500)", async () => {
    stubSearch(async () => []);
    const res = await request(server.app)
      .get("/api/v1/stations")
      .query({ limit: "abc" })
      .expect(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].field).toBe("limit");
  });

  it("acota el limite al maximo permitido (100)", async () => {
    let askedLimit: string | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        askedLimit = new URL(String(input)).searchParams.get("limit");
        return Response.json([]);
      }),
    );
    await request(server.app).get("/api/v1/stations").query({ limit: "200" }).expect(200);
    expect(askedLimit).toBe("100");
  });

  it("usa la cache para no repetir llamadas", async () => {
    stubSearch(async () => [RAW_STATION]);
    await request(server.app).get("/api/v1/stations").query({ name: "cache" }).expect(200);
    await request(server.app).get("/api/v1/stations").query({ name: "cache" }).expect(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("devuelve 503 si el catalogo esta caido sin cache", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("radio-browser down");
      }),
    );
    const res = await request(server.app).get("/api/v1/stations").expect(503);
    expect(res.body.error.code).toBe("CATALOG_UNAVAILABLE");
  });

  it("devuelve staleness cuando el catalogo se cae tras cachear", async () => {
    stubSearch(async () => [RAW_STATION]);
    await request(server.app).get("/api/v1/stations").query({ name: "stale" }).expect(200);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("caido");
      }),
    );
    const res = await request(server.app).get("/api/v1/stations").query({ name: "stale" }).expect(200);
    expect(res.body.items).toHaveLength(1);
  });
});

describe("station detail", () => {
  it("devuelve una emisora por uuid", async () => {
    stubByUuidByList([RAW_STATION, RAW_STATION_TWO]);
    const res = await request(server.app).get(`/api/v1/stations/${RAW_STATION.stationuuid}`).expect(200);
    expect(res.body.id).toBe(RAW_STATION.stationuuid);
    expect(res.body.name).toBe("Radio Test");
  });

  it("devuelve 404 si la emisora no existe", async () => {
    stubByUuidByList([RAW_STATION]);
    const res = await request(server.app).get("/api/v1/stations/unknown-uuid").expect(404);
    expect(res.body.error.code).toBe("STATION_NOT_FOUND");
  });
});

describe("stations service listados", () => {
  function stubListados(body: unknown) {
    fetchMock = vi.fn(async (input: unknown) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/json/countries")) return Response.json(body);
      if (url.pathname.endsWith("/json/languages")) return Response.json(body);
      if (url.pathname.endsWith("/json/tags")) return Response.json(body);
      throw new Error(`fetch inesperado: ${String(url)}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  }

  it("listCountries devuelve opciones normalizadas y cachea", async () => {
    stubListados([
      { name: "Spain", stationcount: 10 },
      { name: "Argentina", stationcount: 0 },
      { name: "Brazil", stationcount: 5 },
    ]);
    const first = await server.ctx.stations.listCountries();
    expect(first).toEqual(["Brazil", "Spain"]);
    await server.ctx.stations.listCountries();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("listLanguages devuelve opciones normalizadas y usan claves de cache distintas", async () => {
    stubListados([{ name: "english", stationcount: 5 }]);
    await server.ctx.stations.listCountries();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const langs = await server.ctx.stations.listLanguages();
    expect(langs).toEqual(["english"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("listTags devuelve opciones por popularidad y cachea con su propia clave", async () => {
    stubListados([
      { name: "jazz", stationcount: 5 },
      { name: "Pop", stationcount: 900 },
      { name: "rock", stationcount: 3000 },
      { name: "dead", stationcount: 0 },
    ]);
    const tags = await server.ctx.stations.listTags();
    expect(tags).toEqual(["rock", "Pop", "jazz"]);
    await server.ctx.stations.listTags();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sirve caché si el origen se cae tras cachear", async () => {
    stubListados([{ name: "Spain", stationcount: 10 }]);
    await server.ctx.stations.listCountries();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("caido");
      }),
    );
    await expect(server.ctx.stations.listCountries()).resolves.toEqual(["Spain"]);
  });

  it("lanza 503 si el origen se cae sin caché", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("caido");
      }),
    );
    await expect(server.ctx.stations.listCountries()).rejects.toMatchObject({
      status: 503,
      code: "CATALOG_UNAVAILABLE",
    });
    await expect(server.ctx.stations.listLanguages()).rejects.toMatchObject({
      status: 503,
      code: "CATALOG_UNAVAILABLE",
    });
  });
});

describe("endpoints de listados", () => {
  it("GET /stations/countries no es capturado por :id y devuelve { items }", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/json/countries")) {
          return Response.json([
            { name: "Spain", stationcount: 10 },
            { name: "Brazil", stationcount: 5 },
          ]);
        }
        throw new Error(`fetch inesperado: ${String(url)}`);
      }),
    );
    const res = await request(server.app).get("/api/v1/stations/countries").expect(200);
    expect(res.body).toEqual({ items: ["Brazil", "Spain"] });
  });

  it("GET /stations/languages devuelve { items }", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/json/languages")) {
          return Response.json([
            { name: "spanish", stationcount: 1 },
            { name: "english", stationcount: 2 },
          ]);
        }
        throw new Error(`fetch inesperado: ${String(url)}`);
      }),
    );
    const res = await request(server.app).get("/api/v1/stations/languages").expect(200);
    expect(res.body).toEqual({ items: ["english", "spanish"] });
  });

  it("GET /stations/tags no es capturado por :id y devuelve { items }", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/json/tags")) {
          return Response.json([
            { name: "jazz", stationcount: 5 },
            { name: "rock", stationcount: 3 },
            { name: "Pop", stationcount: 0 },
          ]);
        }
        throw new Error(`fetch inesperado: ${String(url)}`);
      }),
    );
    const res = await request(server.app).get("/api/v1/stations/tags").expect(200);
    expect(res.body).toEqual({ items: ["jazz", "rock"] });
  });

  it("GET /stations?tag propaga el genero a radio-browser", async () => {
    let capturedTag: string | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/stations/search")) {
          capturedTag = url.searchParams.get("tag");
          return Response.json([RAW_STATION]);
        }
        throw new Error(`fetch inesperado: ${String(url)}`);
      }),
    );
    const res = await request(server.app).get("/api/v1/stations").query({ tag: "jazz" }).expect(200);
    expect(capturedTag).toBe("jazz");
    expect(res.body.items).toHaveLength(1);
  });

  it("GET /stations/:id sigue devolviendo 404 para UUID inexistente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = new URL(String(input));
        if (url.pathname.includes("/stations/byuuid/")) return Response.json([]);
        throw new Error(`fetch inesperado: ${String(url)}`);
      }),
    );
    const res = await request(server.app).get("/api/v1/stations/unknown-uuid").expect(404);
    expect(res.body.error.code).toBe("STATION_NOT_FOUND");
  });

  it("devuelve 503 con formato de error si el listado no puede cargarse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("caido");
      }),
    );
    const res = await request(server.app).get("/api/v1/stations/languages").expect(503);
    expect(res.body.error).toMatchObject({ code: "CATALOG_UNAVAILABLE", status: 503 });
  });

  it("openapi.json expone los nuevos endpoints de listados", async () => {
    const res = await request(server.app).get("/api/v1/openapi.json").expect(200);
    expect(res.body.paths).toHaveProperty("/stations/countries");
    expect(res.body.paths).toHaveProperty("/stations/languages");
    const countries = res.body.paths["/stations/countries"].get;
    expect(countries.security).toEqual([]);
    expect(countries.responses).toHaveProperty("503");
  });
});