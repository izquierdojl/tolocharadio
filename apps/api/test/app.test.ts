import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { request, setupServer } from "./helpers.js";

describe("app base", () => {
  const { app } = setupServer();

  it("responde en /api/v1/health", async () => {
    const res = await request(app).get("/api/v1/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.timestamp).toBe("number");
  });

  it("devuelve 404 con formato estandar en rutas API desconocidas", async () => {
    const res = await request(app).get("/api/v1/unknown-route").expect(404);
    expect(res.body).toEqual({
      error: { code: "NOT_FOUND", message: "Ruta no encontrada", status: 404 },
    });
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("devuelve 404 en /api fuera de v1", async () => {
    const res = await request(app).get("/api/v2/something").expect(404);
    expect(res.body.error.status).toBe(404);
  });

  it("no pierde headers al responder errores", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "a@b.c" });
    expect([400, 401, 422]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });
});

describe("CORS", () => {
  it("permite el origin configurado", async () => {
    const { app } = setupServer({ CORS_ORIGINS: "https://app.example.com" });
    const res = await request(app)
      .options("/api/v1/auth/login")
      .set("Origin", "https://app.example.com")
      .set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBe("https://app.example.com");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("no envia allow-origin si el origin no esta permitido", async () => {
    const { app } = setupServer({ CORS_ORIGINS: "https://app.example.com" });
    const res = await request(app)
      .options("/api/v1/auth/login")
      .set("Origin", "https://evil.example.com")
      .set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("static serving", () => {
  const root = mkdtempSync(join(tmpdir(), "tolocha-static-"));
  writeFileSync(join(root, "index.html"), "<html><body>spa</body></html>");
  writeFileSync(join(root, "app.js"), "console.log('ok')");
  const { app } = setupServer({ STATIC_DIR: root });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it("sirve ficheros estaticos", async () => {
    const res = await request(app).get("/app.js").expect(200);
    expect(res.text).toContain("console.log");
  });

  it("hace fallback a index.html para rutas SPA", async () => {
    const res = await request(app).get("/some/spa/route").expect(200);
    expect(res.text).toContain("spa");
  });

  it("no pisa rutas /api", async () => {
    await request(app).get("/api/v1/health").expect(200);
  });
});