import { describe, expect, it } from "vitest";
import { buildOpenApi } from "../src/openapi.js";

describe("OpenAPI spec", () => {
  const spec = buildOpenApi() as {
    openapi: string;
    info: { title: string };
    paths: Record<string, Record<string, unknown>>;
    components: Record<string, unknown>;
  };

  it("es OpenAPI 3.1 con los metadatos correctos", () => {
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("TolochaRadio API");
  });

  it("declara todos los endpoints requeridos", () => {
    const expected = [
      "/health",
      "/config",
      "/auth/register",
      "/auth/login",
      "/auth/refresh",
      "/auth/logout",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/users/me",
      "/users/me/password",
      "/stations",
      "/stations/{id}",
      "/stations/countries",
      "/stations/languages",
      "/stations/tags",
      "/favorites",
      "/favorites/{stationId}",
      "/history",
      "/stats/me/top",
      "/stats/me/timeline",
      "/stats/me/habits",
      "/stats/me/genres",
      "/stats/me/countries",
      "/stats/me/recent",
      "/playback/{stationId}",
      "/playback/{stationId}/hls",
      "/playback/{stationId}/status",
    ];
    for (const path of expected) {
      expect(spec.paths).toHaveProperty(path);
    }
  });

  it("documenta los parametros firmados del proxy de subrecursos HLS", () => {
    const hlsGet = spec.paths["/playback/{stationId}/hls"]!.get! as {
      parameters?: Array<{ name: string; required?: boolean }>;
    };
    const names = (hlsGet.parameters ?? []).map((parameter) => parameter.name);
    expect(names).toEqual(expect.arrayContaining(["stationId", "u", "d", "s"]));
  });

  it("define el esquema bearerAuth y la respuesta de error", () => {
    const security = spec.components as {
      securitySchemes: Record<string, { type: string; scheme?: string }>;
    };
    expect(security.securitySchemes.bearerAuth!.type).toBe("http");
    expect(security.securitySchemes.bearerAuth!.scheme).toBe("bearer");
    expect(spec.components).toHaveProperty("schemas.Error");
  });

  it("protege las rutas privadas y deja pulicas las de catalogo", () => {
    const favoritesGet = spec.paths["/favorites"]!.get! as { security?: unknown };
    expect(favoritesGet.security).toBeDefined();
    const stationsGet = spec.paths["/stations"]!.get! as { security?: unknown };
    expect(Array.isArray(stationsGet.security) && stationsGet.security.length === 0).toBe(true);
    const countriesGet = spec.paths["/stations/countries"]!.get! as { security?: unknown };
    expect(Array.isArray(countriesGet.security) && countriesGet.security.length === 0).toBe(true);
    const languagesGet = spec.paths["/stations/languages"]!.get! as { security?: unknown };
    expect(Array.isArray(languagesGet.security) && languagesGet.security.length === 0).toBe(true);
    const tagsGet = spec.paths["/stations/tags"]!.get! as { security?: unknown };
    expect(Array.isArray(tagsGet.security) && tagsGet.security.length === 0).toBe(true);
  });

  it("documenta los endpoints de estadisticas con autenticacion y parametros", () => {
    const paths = [
      "/stats/me/top",
      "/stats/me/timeline",
      "/stats/me/habits",
      "/stats/me/genres",
      "/stats/me/countries",
      "/stats/me/recent",
    ];
    for (const path of paths) {
      const get = spec.paths[path]!.get! as { security?: unknown };
      expect(get.security).toBeDefined();
    }

    const topGet = spec.paths["/stats/me/top"]!.get! as {
      parameters?: Array<{ name: string; schema?: { default?: unknown } }>;
    };
    expect((topGet.parameters ?? []).map((parameter) => parameter.name)).toEqual(
      expect.arrayContaining(["from", "to", "limit"]),
    );

    const timelineGet = spec.paths["/stats/me/timeline"]!.get! as {
      parameters?: Array<{ name: string; schema?: { enum?: string[]; default?: unknown } }>;
    };
    const granularity = (timelineGet.parameters ?? []).find(
      (parameter) => parameter.name === "granularity",
    );
    expect(granularity?.schema?.enum).toEqual(["day", "week", "month"]);
    expect(granularity?.schema?.default).toBe("day");
  });
});