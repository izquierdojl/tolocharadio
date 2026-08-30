import { beforeEach, describe, expect, it } from "vitest";
import type { TestServer } from "./helpers.js";
import { request, setupServer } from "./helpers.js";

const VALID_USER = { email: "user@example.com", password: "Password1" };

let server: TestServer;
beforeEach(() => {
  server = setupServer();
});

function register(body: Record<string, unknown> = VALID_USER) {
  return request(server.app).post("/api/v1/auth/register").send(body);
}

function login(body: Record<string, unknown> = VALID_USER) {
  return request(server.app).post("/api/v1/auth/login").send(body);
}

function refresh(refreshToken: string | undefined) {
  return request(server.app)
    .post("/api/v1/auth/refresh")
    .send(refreshToken !== undefined ? { refreshToken } : {});
}

describe("auth register/login", () => {
  it("registra un usuario y devuelve tokens", async () => {
    const res = await register().expect(201);
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user.name).toBeNull();
    expect(typeof res.body.accessToken).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("establece cookies httpOnly de acceso y refresco", async () => {
    const res = await register().expect(201);
    const cookies = (res.headers["set-cookie"] as unknown as string[]) ?? [];
    const access = cookies.find((c) => c.startsWith("tolocha-access=")) ?? "";
    const refresh = cookies.find((c) => c.startsWith("tolocha-refresh=")) ?? "";
    expect(access).toContain("HttpOnly");
    expect(access).toContain("Max-Age=900");
    expect(refresh).toContain("HttpOnly");
    expect(refresh).toContain("SameSite=Lax");
  });

  it("rechaza un email duplicado con 409", async () => {
    await register();
    const res = await register().expect(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });

  it("normaliza el email en minusculas", async () => {
    const res = await register({ email: "User@Example.COM", password: "Password1" }).expect(201);
    expect(res.body.user.email).toBe("user@example.com");
  });

  it("valida email y contrasena (422 con details)", async () => {
    const res = await register({ email: "nope", password: "corta" }).expect(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it("rechaza el registro si esta deshabilitado", async () => {
    server = setupServer({ REGISTRATION_ENABLED: "false" });
    const res = await register().expect(403);
    expect(res.body.error.code).toBe("REGISTRATION_DISABLED");
  });

  it("inicia sesion con credenciales correctas", async () => {
    await register();
    const res = await login().expect(200);
    expect(res.body.user.email).toBe(VALID_USER.email);
  });

  it("rechaza login con contrasena incorrecta", async () => {
    await register();
    const res = await login({ email: VALID_USER.email, password: "Password2" }).expect(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rechaza login de un email inexistente con el mismo codigo", async () => {
    const res = await login({ email: "ghost@example.com", password: "Password1" }).expect(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

describe("auth refresh/logout", () => {
  it("muta el refresh token al renovar y deja invalido el anterior", async () => {
    const first = await register().expect(201);
    const rt1 = first.body.refreshToken as string;

    const refreshed = await refresh(rt1).expect(200);
    const rt2 = refreshed.body.refreshToken as string;
    expect(rt2).not.toBe(rt1);

    const reuseOld = await refresh(rt1).expect(401);
    expect(reuseOld.body.error.code).toBe("INVALID_REFRESH_TOKEN");

    await refresh(rt2).expect(200);
  });

  it("renueva leyendo la cookie de refresco", async () => {
    const res = await register().expect(201);
    const cookies = (res.headers["set-cookie"] as unknown as string[]) ?? [];
    const cookie = cookies.find((c) => c.startsWith("tolocha-refresh=")) ?? "";
    const refreshToken = /tolocha-refresh=([^;]+)/.exec(cookie)![1]!;
    const refreshed = await request(server.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `tolocha-refresh=${refreshToken}`)
      .send({})
      .expect(200);
    expect(refreshed.body.accessToken).toBeDefined();
  });

  it("falla con 401 si no hay refresh token", async () => {
    const res = await refresh(undefined).expect(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("revoca el refresh al hacer logout", async () => {
    const first = await register().expect(201);
    const rt = first.body.refreshToken as string;
    await request(server.app).post("/api/v1/auth/logout").send({ refreshToken: rt }).expect(200);
    const res = await refresh(rt).expect(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });
});

describe("auth users/me", () => {
  it("devuelve el perfil con access token", async () => {
    const { accessToken } = (await register().expect(201)).body;
    const res = await request(server.app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.user.email).toBe(VALID_USER.email);
  });

  it("devuelve 401 sin token o con token invalido", async () => {
    await request(server.app).get("/api/v1/users/me").expect(401);
    await request(server.app).get("/api/v1/users/me").set("Authorization", "Bearer basura").expect(401);
  });

  it("permite cambiar el nombre", async () => {
    const { accessToken } = (await register().expect(201)).body;
    const res = await request(server.app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "  Nueva  " })
      .expect(200);
    expect(res.body.user.name).toBe("Nueva");
  });

  it("rechaza un nombre invalido", async () => {
    const { accessToken } = (await register().expect(201)).body;
    await request(server.app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "   " })
      .expect(422);
  });

  it("devuelve theme por defecto dark en un usuario nuevo", async () => {
    const res = await register().expect(201);
    expect(res.body.user.theme).toBe("dark");
  });

  it("actualiza la preferencia de tema", async () => {
    const { accessToken } = (await register().expect(201)).body;
    const res = await request(server.app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ theme: "light" })
      .expect(200);
    expect(res.body.user.theme).toBe("light");
  });

  it("rechaza un tema invalido", async () => {
    const { accessToken } = (await register().expect(201)).body;
    const res = await request(server.app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ theme: "blue" })
      .expect(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rechaza un patch sin campos", async () => {
    const { accessToken } = (await register().expect(201)).body;
    const res = await request(server.app)
      .patch("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({})
      .expect(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("auth password", () => {
  it("cambia la contrasena y revoca refrescos anteriores", async () => {
    const { accessToken, refreshToken: rt1 } = (await register().expect(201)).body;
    await request(server.app)
      .patch("/api/v1/users/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: VALID_USER.password, newPassword: "NewPassword2" })
      .expect(200);

    const res = await refresh(rt1).expect(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("rechaza contrasena actual incorrecta", async () => {
    const { accessToken } = (await register().expect(201)).body;
    const res = await request(server.app)
      .patch("/api/v1/users/me/password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "incorrecta", newPassword: "NewPassword2" })
      .expect(401);
    expect(res.body.error.code).toBe("WRONG_CURRENT_PASSWORD");
  });
});

describe("auth password recovery", () => {
  it("no revela si el email existe (resetToken null)", async () => {
    const res = await request(server.app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "ghost@example.com" })
      .expect(200);
    expect(res.body.resetToken).toBeNull();
  });

  it("devuelve un token de un solo uso para un email registrado", async () => {
    await register();
    const res = await request(server.app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: VALID_USER.email })
      .expect(200);
    expect(typeof res.body.resetToken).toBe("string");
    const resetToken = res.body.resetToken as string;

    await request(server.app)
      .post("/api/v1/auth/reset-password")
      .send({ token: resetToken, newPassword: "ResetPassword1" })
      .expect(200);

    const reused = await request(server.app)
      .post("/api/v1/auth/reset-password")
      .send({ token: resetToken, newPassword: "ResetPassword1" })
      .expect(400);
    expect(reused.body.error.code).toBe("INVALID_RESET_TOKEN");

    const login = await request(server.app)
      .post("/api/v1/auth/login")
      .send({ email: VALID_USER.email, password: "ResetPassword1" })
      .expect(200);
    expect(login.body.user.email).toBe(VALID_USER.email);
  });

  it("rechaza un token invalido", async () => {
    const res = await request(server.app)
      .post("/api/v1/auth/reset-password")
      .send({ token: "no-existe", newPassword: "ResetPassword1" })
      .expect(400);
    expect(res.body.error.code).toBe("INVALID_RESET_TOKEN");
  });
});