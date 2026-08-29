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
      "/playback/{stationId}",
      "/playback/{stationId}/status",
    ];
    for (const path of expected) {
      expect(spec.paths).toHaveProperty(path);
    }
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
});