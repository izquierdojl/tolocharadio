import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playbackSessions, userStationStatsHourly } from "../src/db/schema.js";
import { normalizeStation } from "../src/services/normalize.js";
import { RAW_STATION, rawFromJson } from "./fixtures.js";
import { request, setupServer, type TestServer } from "./helpers.js";

let server: TestServer;

const STATION_A = normalizeStation({
  ...rawFromJson(RAW_STATION),
  stationuuid: "aaaaaaaa-1111-2222-3333-444444444444",
  name: "Radio A",
  tags: "pop, rock",
  country: "Spain",
  countrycode: "ES",
})!;

const STATION_B = normalizeStation({
  ...rawFromJson(RAW_STATION),
  stationuuid: "bbbbbbbb-1111-2222-3333-444444444444",
  name: "Radio B",
  tags: "",
  country: null,
  countrycode: null,
})!;

const PATHS = [
  "/api/v1/stats/me/top",
  "/api/v1/stats/me/timeline",
  "/api/v1/stats/me/habits",
  "/api/v1/stats/me/genres",
  "/api/v1/stats/me/countries",
  "/api/v1/stats/me/recent",
];

interface TestUser {
  token: string;
  id: number;
}

async function registerUser(email: string): Promise<TestUser> {
  const res = await request(server.app)
    .post("/api/v1/auth/register")
    .send({ email, password: "Password1" })
    .expect(201);
  return { token: res.body.accessToken as string, id: res.body.user.id as number };
}

async function seed(userId: number): Promise<void> {
  await server.ctx.db.insert(userStationStatsHourly).values([
    { userId, stationId: STATION_A.id, bucket: "2026-09-28T10", totalMs: 3_600_000 },
    { userId, stationId: STATION_A.id, bucket: "2026-09-28T11", totalMs: 1_800_000 },
    { userId, stationId: STATION_B.id, bucket: "2026-09-29T22", totalMs: 900_000 },
  ]);
  await server.ctx.db.insert(playbackSessions).values([
    {
      userId,
      stationId: STATION_A.id,
      snapshot: JSON.stringify(STATION_A),
      source: "direct",
      startedAt: Date.UTC(2026, 8, 28, 10, 0),
      endedAt: Date.UTC(2026, 8, 28, 11, 0),
      durationMs: 3_600_000,
    },
    {
      userId,
      stationId: STATION_B.id,
      snapshot: JSON.stringify(STATION_B),
      source: "hls",
      startedAt: Date.UTC(2026, 8, 29, 22, 0),
      endedAt: Date.UTC(2026, 8, 29, 22, 15),
      durationMs: 900_000,
    },
  ]);
}

function get(path: string, token: string) {
  return request(server.app).get(path).set("Authorization", `Bearer ${token}`);
}

beforeEach(() => {
  server = setupServer();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stats me", () => {
  it("requiere autenticacion en los seis endpoints", async () => {
    for (const path of PATHS) {
      await request(server.app).get(path).expect(401);
    }
  });

  it("devuelve el contrato de los seis endpoints", async () => {
    const user = await registerUser("stats1@example.com");
    await seed(user.id);

    const top = await get("/api/v1/stats/me/top", user.token).expect(200);
    expect(top.body.items.map((item: { station: { id: string } }) => item.station.id)).toEqual([
      STATION_A.id,
      STATION_B.id,
    ]);
    expect(top.body.items[0].totalMs).toBe(5_400_000);

    const timeline = await get(
      "/api/v1/stats/me/timeline?from=2026-09-27&to=2026-09-29",
      user.token,
    ).expect(200);
    expect(timeline.body.granularity).toBe("day");
    expect(timeline.body.items).toEqual([
      { bucket: "2026-09-27", totalMs: 0 },
      { bucket: "2026-09-28", totalMs: 5_400_000 },
      { bucket: "2026-09-29", totalMs: 900_000 },
    ]);

    const habits = await get("/api/v1/stats/me/habits", user.token).expect(200);
    expect(habits.body.items).toContainEqual({ weekday: 0, hour: 10, totalMs: 3_600_000 });
    expect(habits.body.items).toContainEqual({ weekday: 1, hour: 22, totalMs: 900_000 });

    const genres = await get("/api/v1/stats/me/genres", user.token).expect(200);
    expect(genres.body.items).toContainEqual({ genre: "pop", totalMs: 3_600_000 });
    expect(genres.body.items).toContainEqual({ genre: "desconocido", totalMs: 900_000 });

    const countries = await get("/api/v1/stats/me/countries", user.token).expect(200);
    expect(countries.body.items).toContainEqual({
      country: "Spain",
      countryCode: "ES",
      totalMs: 3_600_000,
    });

    const recent = await get("/api/v1/stats/me/recent", user.token).expect(200);
    expect(recent.body.items).toHaveLength(2);
    expect(recent.body.items[0].station.id).toBe(STATION_B.id);
    expect(recent.body.items[0].durationMs).toBe(900_000);
  });

  it("aplica los defaults de timeline y recent", async () => {
    const user = await registerUser("stats2@example.com");
    await seed(user.id);

    const timeline = await get("/api/v1/stats/me/timeline", user.token).expect(200);
    expect(timeline.body.granularity).toBe("day");
    expect(timeline.body.items).toHaveLength(2);

    const recent = await get("/api/v1/stats/me/recent?limit=1", user.token).expect(200);
    expect(recent.body.items).toHaveLength(1);
  });

  it("rechaza parametros invalidos con 400", async () => {
    const user = await registerUser("stats3@example.com");
    const cases = [
      "/api/v1/stats/me/top?from=2026-13-01",
      "/api/v1/stats/me/top?from=2026-10-02&to=2026-10-01",
      "/api/v1/stats/me/top?limit=0",
      "/api/v1/stats/me/top?limit=51",
      "/api/v1/stats/me/timeline?granularity=hour",
      "/api/v1/stats/me/timeline?from=2015-01-01&to=2026-01-01",
      "/api/v1/stats/me/recent?limit=201",
      "/api/v1/stats/me/genres?limit=abc",
    ];
    for (const path of cases) {
      const res = await get(path, user.token).expect(400);
      expect(res.body.error.code).toBe("INVALID_PARAMS");
    }
  });

  it("acepta el maximo de limit y el rango maximo de timeline", async () => {
    const user = await registerUser("stats4@example.com");
    await get("/api/v1/stats/me/top?limit=50", user.token).expect(200);
    await get("/api/v1/stats/me/genres?limit=50", user.token).expect(200);
    await get("/api/v1/stats/me/recent?limit=200", user.token).expect(200);
    await get(
      "/api/v1/stats/me/timeline?from=2021-10-01&to=2026-10-01&granularity=month",
      user.token,
    ).expect(200);
  });

  it("aisla las estadisticas entre usuarios", async () => {
    const first = await registerUser("stats5@example.com");
    const second = await registerUser("stats6@example.com");
    await seed(first.id);

    for (const path of PATHS) {
      const res = await get(path, second.token).expect(200);
      expect(res.body.items).toEqual([]);
    }

    const secondTop = await get("/api/v1/stats/me/top", first.token).expect(200);
    expect(secondTop.body.items).toHaveLength(2);
  });
});
