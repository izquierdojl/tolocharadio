import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TestServer } from "./helpers.js";
import { request, setupServer } from "./helpers.js";

let server: TestServer;

beforeEach(() => {
  server = setupServer();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        {
          type: "audio/mpeg",
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array([0x49, 0x44, 0x33]));
              controller.close();
            },
          }),
        },
        { status: 200 },
      ),
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function registerUser(email = "cs@example.com") {
  const res = await request(server.app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Password1" })
    .expect(201);
  return res.body.accessToken as string;
}

describe("custom-stations", () => {
  it("requiere autenticacion", async () => {
    await request(server.app)
      .post("/api/v1/custom-stations")
      .send({ name: "Mi Radio", url: "https://radio.example.org/live.mp3" })
      .expect(401);
    await request(server.app).get("/api/v1/custom-stations").expect(401);
    await request(server.app).delete("/api/v1/custom-stations/custom:abc").expect(401);
  });

  it("crea, lista y elimina emisoras personalizadas", async () => {
    const token = await registerUser();
    const create = await request(server.app)
      .post("/api/v1/custom-stations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mi Emisora", url: "https://stream.example.org/live.mp3" })
      .expect(201);
    const station = create.body.station;
    expect(station.id).toMatch(/^custom:/);
    expect(station.name).toBe("Mi Emisora");
    expect(station.url).toBe("https://stream.example.org/live.mp3");
    expect(station.isCustom).toBe(true);
    expect(station.favicon).toBeNull();

    const list = await request(server.app)
      .get("/api/v1/custom-stations")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].id).toBe(station.id);

    const del = await request(server.app)
      .delete(`/api/v1/custom-stations/${station.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(del.body).toEqual({ ok: true });

    const empty = await request(server.app)
      .get("/api/v1/custom-stations")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(empty.body.items).toHaveLength(0);
  });

  it("rechaza nombre vacio con 422", async () => {
    const token = await registerUser();
    const res = await request(server.app)
      .post("/api/v1/custom-stations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "   ", url: "https://stream.example.org/live.mp3" })
      .expect(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rechaza URL invalida o no HTTP(S) con 422", async () => {
    const token = await registerUser();
    await request(server.app)
      .post("/api/v1/custom-stations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mi Radio", url: "no-es-una-url" })
      .expect(422);
    await request(server.app)
      .post("/api/v1/custom-stations")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mi Radio", url: "ftp://stream.example.org/live.mp3" })
      .expect(422);
  });

  it("aisla emisoras personalizadas entre cuentas", async () => {
    const tokenA = await registerUser("a@example.com");
    const tokenB = await registerUser("b@example.com");
    const station = await request(server.app)
      .post("/api/v1/custom-stations")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Solo de A", url: "https://stream.example.org/a.mp3" })
      .expect(201);
    const listB = await request(server.app)
      .get("/api/v1/custom-stations")
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(200);
    expect(listB.body.items).toHaveLength(0);

    const delB = await request(server.app)
      .delete(`/api/v1/custom-stations/${station.body.station.id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(200);
    expect(delB.body).toEqual({ ok: true });

    const listA = await request(server.app)
      .get("/api/v1/custom-stations")
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);
    expect(listA.body.items).toHaveLength(1);
  });

  it("eliminar limpia favoritos e historial de la cuenta", async () => {
    const token = await registerUser();
    const station = (
      await request(server.app)
        .post("/api/v1/custom-stations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mi Emisora", url: "https://stream.example.org/live.mp3" })
        .expect(201)
    ).body.station;

    await request(server.app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send({ stationId: station.id })
      .expect(201);

    await request(server.app)
      .delete(`/api/v1/custom-stations/${station.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const favorites = await request(server.app)
      .get("/api/v1/favorites")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(favorites.body.items).toHaveLength(0);
  });

  it("permite reproducir (status) una emisora personalizada ajena como inexistente", async () => {
    const tokenA = await registerUser("a@example.com");
    const tokenB = await registerUser("b@example.com");
    const station = (
      await request(server.app)
        .post("/api/v1/custom-stations")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ name: "Solo de A", url: "https://stream.example.org/a.mp3" })
        .expect(201)
    ).body.station;

    const ownerStatus = await request(server.app)
      .get(`/api/v1/playback/${station.id}/status`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(200);
    expect(ownerStatus.body.id).toBe(station.id);

    await request(server.app)
      .get(`/api/v1/playback/${station.id}/status`)
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(404);
  });

  it("reproducir una emisora personalizada la registra en el historial", async () => {
    const token = await registerUser();
    const station = (
      await request(server.app)
        .post("/api/v1/custom-stations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mi Emisora", url: "https://stream.example.org/live.mp3" })
        .expect(201)
    ).body.station;

    await request(server.app)
      .get(`/api/v1/playback/${station.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const history = await request(server.app)
      .get("/api/v1/history")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(history.body.items).toHaveLength(1);
    expect(history.body.items[0].station.id).toBe(station.id);
    expect(history.body.items[0].station.isCustom).toBe(true);
  });
});
