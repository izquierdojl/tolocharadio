import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { parseDuration } from "../src/lib/time.js";
import { TEST_ACCESS_SECRET, TEST_REFRESH_SECRET } from "./helpers.js";

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
});