import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RAW_STATION, RAW_STATION_TWO } from "./fixtures.js";
import type { TestServer } from "./helpers.js";
import { request, setupServer } from "./helpers.js";

let server: TestServer;

beforeEach(() => {
  server = setupServer();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = new URL(String(input));
      const uuid = url.pathname.includes("/stations/byuuid/")
        ? url.pathname.split("/").pop()
        : undefined;
      if (uuid === RAW_STATION.stationuuid) return Response.json([RAW_STATION]);
      if (uuid === RAW_STATION_TWO.stationuuid) return Response.json([RAW_STATION_TWO]);
      return Response.json([]);
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function registerUser(email = "fav@example.com") {
  const res = await request(server.app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Password1" })
    .expect(201);
  return res.body.accessToken as string;
}

describe("favorites", () => {
  it("requiere autenticacion", async () => {
    await request(server.app).get("/api/v1/favorites").expect(401);
    await request(server.app).post("/api/v1/favorites").send({ stationId: "x" }).expect(401);
    await request(server.app).put("/api/v1/favorites/order").send({ stationIds: ["x"] }).expect(401);
  });

  it("anade, lista y elimina favoritos", async () => {
    const token = await registerUser();
    const add = await request(server.app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send({ stationId: RAW_STATION.stationuuid })
      .expect(201);
    expect(add.body.favorite.station.id).toBe(RAW_STATION.stationuuid);

    const list = await request(server.app).get("/api/v1/favorites").set("Authorization", `Bearer ${token}`).expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].station.name).toBe("Radio Test");
    expect(typeof list.body.items[0].addedAt).toBe("number");

    await request(server.app)
      .delete(`/api/v1/favorites/${RAW_STATION.stationuuid}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((res) => expect(res.body).toEqual({ ok: true }));

    const empty = await request(server.app).get("/api/v1/favorites").set("Authorization", `Bearer ${token}`).expect(200);
    expect(empty.body.items).toHaveLength(0);
  });

  it("rechaza duplicados con 409", async () => {
    const token = await registerUser();
    await request(server.app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send({ stationId: RAW_STATION.stationuuid })
      .expect(201);
    const dup = await request(server.app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send({ stationId: RAW_STATION.stationuuid })
      .expect(409);
    expect(dup.body.error.code).toBe("FAVORITE_ALREADY_EXISTS");
  });

  it("devuelve 404 si la emisora no existe", async () => {
    const token = await registerUser();
    const res = await request(server.app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send({ stationId: "no-existe" })
      .expect(404);
    expect(res.body.error.code).toBe("STATION_NOT_FOUND");
  });

  it("aisla favoritos entre usuarios", async () => {
    const tokenA = await registerUser("a@example.com");
    const tokenB = await registerUser("b@example.com");
    await request(server.app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ stationId: RAW_STATION_TWO.stationuuid })
      .expect(201);
    const listB = await request(server.app).get("/api/v1/favorites").set("Authorization", `Bearer ${tokenB}`).expect(200);
    expect(listB.body.items).toHaveLength(0);
  });

  it("reordena favoritos y persiste el nuevo orden en el listado", async () => {
    const token = await registerUser();
    for (const id of [RAW_STATION.stationuuid, RAW_STATION_TWO.stationuuid]) {
      await request(server.app)
        .post("/api/v1/favorites")
        .set("Authorization", `Bearer ${token}`)
        .send({ stationId: id })
        .expect(201);
    }

    const reorder = await request(server.app)
      .put("/api/v1/favorites/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ stationIds: [RAW_STATION_TWO.stationuuid, RAW_STATION.stationuuid] })
      .expect(200);
    expect(reorder.body).toEqual({ ok: true });

    const list = await request(server.app).get("/api/v1/favorites").set("Authorization", `Bearer ${token}`).expect(200);
    expect(list.body.items.map((f: { station: { id: string } }) => f.station.id)).toEqual([
      RAW_STATION_TWO.stationuuid,
      RAW_STATION.stationuuid,
    ]);
  });

  it("rechaza reordenar con lista incompleta (409)", async () => {
    const token = await registerUser();
    for (const id of [RAW_STATION.stationuuid, RAW_STATION_TWO.stationuuid]) {
      await request(server.app)
        .post("/api/v1/favorites")
        .set("Authorization", `Bearer ${token}`)
        .send({ stationId: id })
        .expect(201);
    }
    const res = await request(server.app)
      .put("/api/v1/favorites/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ stationIds: [RAW_STATION.stationuuid] })
      .expect(409);
    expect(res.body.error.code).toBe("FAVORITE_INVALID_ORDER");
  });

  it("rechaza reordenar con emisora no favorita (409)", async () => {
    const token = await registerUser();
    await request(server.app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send({ stationId: RAW_STATION.stationuuid })
      .expect(201);
    const res = await request(server.app)
      .put("/api/v1/favorites/order")
      .set("Authorization", `Bearer ${token}`)
      .send({ stationIds: [RAW_STATION.stationuuid, "no-favorita"] })
      .expect(409);
    expect(res.body.error.code).toBe("FAVORITE_INVALID_ORDER");
  });
});