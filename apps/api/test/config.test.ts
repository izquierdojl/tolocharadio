import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { parseDuration } from "../src/lib/time.js";
import { request, setupServer, TEST_ACCESS_SECRET, TEST_REFRESH_SECRET } from "./helpers.js";

describe("parseDuration", () => {
  it("convierte unidades validas a milisegundos", () => {
    expect(parseDuration("500ms")).toBe(500);
    expect(parseDuration("30s")).toBe(30_000);
    expect(parseDuration("15m")).toBe(900_000);
    expect(parseDuration("2h")).toBe(7_200_000);
    expect(parseDuration("1d")).toBe(86_400_000);
    expect(parseDuration("1w")).toBe(604_800_000);
    expect(parseDuration("1.5s")).toBe(1500);
  });

  it("rechaza valores invalidos", () => {
    for (const bad of ["", "s", "5x", "-3m", "0s", "abc"]) {
      expect(() => parseDuration(bad)).toThrow();
    }
  });
});

describe("loadConfig", () => {
  it("aplica valores por defecto en desarrollo", () => {
    const config = loadConfig({ NODE_ENV: "development" });
    expect(config.port).toBe(3000);
    expect(config.databasePath).toBe("data/tolocharadio.db");
    expect(config.jwtAccessSecret.length).toBeGreaterThanOrEqual(32);
    expect(config.registrationEnabled).toBe(true);
    expect(config.corsOrigins).toEqual(["*"]);
    expect(config.radioBrowserAppName).toBe("TolochaRadio");
  });

  it("divide y recorta CORS_ORIGINS", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      CORS_ORIGINS: " https://app.example.com , http://localhost:5173 ",
    });
    expect(config.corsOrigins).toEqual(["https://app.example.com", "http://localhost:5173"]);
  });

  it("exige secretos de 32+ chars en produccion", () => {
    expect(() =>
      loadConfig({ NODE_ENV: "production", JWT_ACCESS_SECRET: "corto" , JWT_REFRESH_SECRET: "ok-secret-de-32-caracteres-abcdefghijklmn" }),
    ).toThrow(/JWT_ACCESS_SECRET/);

    expect(() =>
      loadConfig({ NODE_ENV: "production", JWT_ACCESS_SECRET: TEST_ACCESS_SECRET }),
    ).toThrow(/JWT_REFRESH_SECRET/);

    const ok = loadConfig({
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: TEST_ACCESS_SECRET,
      JWT_REFRESH_SECRET: TEST_REFRESH_SECRET,
    });
    expect(ok.jwtAccessSecret).toBe(TEST_ACCESS_SECRET);
  });

  it("valida el puerto", () => {
    expect(() => loadConfig({ PORT: "99999" })).toThrow();
    expect(() => loadConfig({ PORT: "no" })).toThrow();
  });

  it("aplica los valores por defecto de estadisticas", () => {
    const config = loadConfig({ NODE_ENV: "development" });
    expect(config.statsTimezone).toBe("Europe/Madrid");
    expect(config.statsFlushIntervalMs).toBe(30_000);
    expect(config.statsPulseCapMs).toBe(15_000);
    expect(config.statsHlsIdleMs).toBe(60_000);
  });

  it("rechaza una zona horaria invalida", () => {
    expect(() =>
      loadConfig({ NODE_ENV: "development", STATS_TIMEZONE: "Mars/Olympus" }),
    ).toThrow(/STATS_TIMEZONE/);
  });

  it("aplica los valores por defecto de podcasts", () => {
    const config = loadConfig({ NODE_ENV: "development" });
    expect(config.podcastsEnabled).toBe(true);
    expect(config.podcastDiscoveryProvider).toBe("itunes");
    expect(config.podcastFeedMaxBytes).toBe(5_242_880);
    expect(config.podcastRefreshIntervalMs).toBe(900_000);
    expect(config.podcastPlaybackTokenTtlMs).toBe(21_600_000);
  });
});

describe("GET /api/v1/config", () => {
  it("expone capacidades, limites, auth y version con podcasts deshabilitados", async () => {
    const srv = setupServer({ PODCASTS_ENABLED: "false" });
    try {
      const res = await request(srv.app).get("/api/v1/config").expect(200);
      expect(res.body).toMatchObject({
        appName: "TolochaRadio",
        apiVersion: 1,
        registrationEnabled: true,
        features: {
          radio: true,
          podcasts: false,
          podcastDiscovery: "itunes",
          podcastOpml: false,
          podcastQueue: false,
          podcastFavorites: false,
          podcastStats: false,
          podcastDownloads: false,
        },
        limits: {
          podcastQueueMax: 200,
          podcastSubscriptionsMax: 200,
          podcastFeedMaxBytes: 5_242_880,
          podcastEpisodesPageSize: 50,
          podcastOpmlMaxFeeds: 200,
        },
        auth: {
          accessTokenTtlSec: 900,
          playbackTokenTtlSec: 21_600,
        },
      });
      expect(typeof res.body.version).toBe("string");
      expect(res.body.jwtAccessSecret).toBeUndefined();
      expect(res.body.podcastIndexApiSecret).toBeUndefined();
    } finally {
      srv.db.sqlite.close();
    }
  });

  it("refleja podcasts habilitados y proveedor configurado", async () => {
    const srv = setupServer({
      PODCASTS_ENABLED: "true",
      PODCAST_DISCOVERY_PROVIDER: "podcastindex",
    });
    try {
      const res = await request(srv.app).get("/api/v1/config").expect(200);
      expect(res.body.features).toEqual({
        radio: true,
        podcasts: true,
        podcastDiscovery: "podcastindex",
        podcastOpml: true,
        podcastQueue: true,
        podcastFavorites: true,
        podcastStats: true,
        podcastDownloads: false,
      });
    } finally {
      srv.db.sqlite.close();
    }
  });
});