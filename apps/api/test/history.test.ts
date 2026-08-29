import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RAW_STATION, rawFromJson } from "./fixtures.js";
import type { TestServer } from "./helpers.js";
import { request, setupServer } from "./helpers.js";

let server: TestServer;

function stubStations(uuids: string[]) {
  const pool = uuids.map((uuid, i) => ({
    ...rawFromJson(RAW_STATION),
    stationuuid: uuid,
    name: `Radio ${i + 1}`,
    url: `https://stream-${i}.example.org/live`,
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/stations/byuuid/")) {
        const uuid = url.pathname.split("/").pop()!;
        const hit = pool.find((s) => s.stationuuid === uuid);
        return Response.json(hit ? [hit] : []);
      }
      return Response.json(pool);
    }),
  );
  return pool;
}

async function registerUser() {
  const res = await request(server.app)
    .post("/api/v1/auth/register")
    .send({ email: "hist@example.com", password: "Password1" })
    .expect(201);
  return res.body.accessToken as string;
}

beforeEach(() => {
  server = setupServer();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("history", () => {
  it("requiere autenticacion", async () => {
    await request(server.app).get("/api/v1/history").expect(401);
    await request(server.app).delete("/api/v1/history").expect(401);
  });

  it("registra reproducciones y las lista de mas reciente a mas antiguo", async () => {
    const pool = stubStations(["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]);
    const token = await registerUser();
    const a = pool[0]!;
    const b = pool[1]!;

    for (const sid of [a.stationuuid, b.stationuuid]) {
      await request(server.app).get(`/api/v1/playback/${sid}`).set("Authorization", `Bearer ${token}`).expect(200);
    }

    await new Promise((r) => setTimeout(r, 20));
    const res = await request(server.app).get("/api/v1/history").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].station.id).toBe(b.stationuuid);
    expect(typeof res.body.items[0].playedAt).toBe("number");
  });

  it("limita el historial al HISTORY_LIMIT", async () => {
    server = setupServer({ HISTORY_LIMIT: "2" });
    const pool = stubStations([
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
    ]);
    const token = await registerUser();
    for (const s of pool) {
      await request(server.app).get(`/api/v1/playback/${s.stationuuid}`).set("Authorization", `Bearer ${token}`).expect(200);
    }
    const res = await request(server.app).get("/api/v1/history").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.items).toHaveLength(2);
  });

  it("no duplica reproducciones repetidas (upsert)", async () => {
    const pool = stubStations(["11111111-1111-1111-1111-111111111111"]);
    const token = await registerUser();
    await request(server.app).get(`/api/v1/playback/${pool[0]!.stationuuid}`).set("Authorization", `Bearer ${token}`).expect(200);
    await request(server.app).get(`/api/v1/playback/${pool[0]!.stationuuid}`).set("Authorization", `Bearer ${token}`).expect(200);
    const res = await request(server.app).get("/api/v1/history").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.items).toHaveLength(1);
  });

  it("limpia el historial", async () => {
    const pool = stubStations(["11111111-1111-1111-1111-111111111111"]);
    const token = await registerUser();
    await request(server.app).get(`/api/v1/playback/${pool[0]!.stationuuid}`).set("Authorization", `Bearer ${token}`).expect(200);
    await request(server.app).delete("/api/v1/history").set("Authorization", `Bearer ${token}`).expect(200);
    const res = await request(server.app).get("/api/v1/history").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.items).toHaveLength(0);
  });
});