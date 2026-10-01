import { describe, expect, it } from "vitest";
import { StatsService } from "../src/services/stats.js";
import { normalizeStation } from "../src/services/normalize.js";
import { playbackSessions, userStationStatsHourly, users } from "../src/db/schema.js";
import { RAW_STATION, rawFromJson } from "./fixtures.js";
import { setupServer, type TestServer } from "./helpers.js";

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

interface Harness {
  server: TestServer;
  stats: StatsService;
  clock: { now: number };
}

function makeService(overrides: Partial<NodeJS.ProcessEnv> = {}): Harness {
  const server = setupServer(overrides);
  const clock = { now: 1_000_000 };
  const stats = new StatsService(server.ctx.db, server.config, () => clock.now);
  return { server, stats, clock };
}

async function createUser(server: TestServer, email = "stats@example.com"): Promise<number> {
  const [user] = await server.ctx.db
    .insert(users)
    .values({ email, passwordHash: "x", createdAt: 1 })
    .returning();
  return user!.id;
}

function hourlyRows(server: TestServer) {
  return server.ctx.db.select().from(userStationStatsHourly).all();
}

function sessionRows(server: TestServer) {
  return server.ctx.db.select().from(playbackSessions).all();
}

describe("StatsService captura", () => {
  it("acredita tiempo entre pulsos y persiste sesion y acumulado al cerrar", async () => {
    const { server, stats, clock } = makeService();
    const userId = await createUser(server);

    const end = stats.startListening(userId, STATION_A, "direct");
    clock.now += 2_000;
    stats.pulse(userId, STATION_A, "direct");
    clock.now += 3_000;
    stats.pulse(userId, STATION_A, "direct");
    clock.now += 1_000;
    stats.flush();

    expect(hourlyRows(server)).toHaveLength(1);
    expect(hourlyRows(server)[0]!.totalMs).toBe(5_000);

    clock.now += 3_000;
    end();

    const sessions = sessionRows(server);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.durationMs).toBe(9_000);
    expect(sessions[0]!.startedAt).toBe(1_000_000);
    expect(sessions[0]!.endedAt).toBe(1_009_000);
    expect(sessions[0]!.source).toBe("direct");
    expect(JSON.parse(sessions[0]!.snapshot).id).toBe(STATION_A.id);
    expect(hourlyRows(server)[0]!.totalMs).toBe(9_000);
  });

  it("la pausa no acumula mas que el tope por pulso", async () => {
    const { server, stats, clock } = makeService({ STATS_PULSE_CAP_MS: "5000" });
    const userId = await createUser(server);

    const end = stats.startListening(userId, STATION_A, "direct");
    clock.now += 1_000;
    stats.pulse(userId, STATION_A, "direct");
    clock.now += 60_000;
    stats.flush();
    end();

    expect(hourlyRows(server)[0]!.totalMs).toBe(6_000);
    expect(sessionRows(server)[0]!.durationMs).toBe(6_000);
  });

  it("fusiona conexiones simultaneas de la misma emisora", async () => {
    const { server, stats, clock } = makeService();
    const userId = await createUser(server);

    const endA = stats.startListening(userId, STATION_A, "direct");
    clock.now += 1_000;
    const endB = stats.startListening(userId, STATION_A, "direct");
    clock.now += 4_000;
    stats.pulse(userId, STATION_A, "direct");
    endA();
    expect(sessionRows(server)).toHaveLength(0);

    clock.now += 1_000;
    stats.flush();
    endB();

    const sessions = sessionRows(server);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.durationMs).toBe(6_000);
    expect(hourlyRows(server)).toHaveLength(1);
    expect(hourlyRows(server)[0]!.totalMs).toBe(6_000);
  });

  it("acota el tiempo acreditado entre dos pulsos lejanos", async () => {
    const { server, stats, clock } = makeService({ STATS_PULSE_CAP_MS: "5000" });
    const userId = await createUser(server);

    stats.startListening(userId, STATION_A, "direct");
    clock.now += 60_000;
    stats.pulse(userId, STATION_A, "direct");
    stats.flush();
    stats.endListening(userId, STATION_A.id);

    expect(hourlyRows(server)[0]!.totalMs).toBe(5_000);
    expect(sessionRows(server)[0]!.durationMs).toBe(5_000);
  });

  it("no duplica el acumulado entre varios volcados", async () => {
    const { server, stats, clock } = makeService({ STATS_PULSE_CAP_MS: "5000" });
    const userId = await createUser(server);

    const end = stats.startListening(userId, STATION_A, "direct");
    for (let i = 0; i < 6; i += 1) {
      clock.now += 5_000;
      stats.pulse(userId, STATION_A, "direct");
      stats.flush();
    }
    end();

    expect(hourlyRows(server)).toHaveLength(1);
    expect(hourlyRows(server)[0]!.totalMs).toBe(30_000);
    expect(sessionRows(server)[0]!.durationMs).toBe(30_000);
  });

  it("cierra la sesion HLS por inactividad sin acreditar el hueco", async () => {
    const { server, stats, clock } = makeService({
      STATS_PULSE_CAP_MS: "5000",
      STATS_HLS_IDLE_MS: "10000",
    });
    const userId = await createUser(server);

    stats.pulse(userId, STATION_A, "hls");
    clock.now += 30_000;
    stats.pulse(userId, STATION_A, "hls");
    stats.flush();
    expect(sessionRows(server)).toHaveLength(0);

    clock.now += 11_000;
    stats.flush();

    expect(sessionRows(server)).toHaveLength(1);
    expect(sessionRows(server)[0]!.durationMs).toBe(5_000);
    expect(sessionRows(server)[0]!.source).toBe("hls");

    clock.now += 60_000;
    stats.flush();
    expect(sessionRows(server)).toHaveLength(1);
    expect(hourlyRows(server)[0]!.totalMs).toBe(5_000);
  });

  it("stop() vuelca lo pendiente antes de cerrar", async () => {
    const { server, stats, clock } = makeService();
    const userId = await createUser(server);

    stats.startListening(userId, STATION_B, "direct");
    clock.now += 4_000;
    stats.pulse(userId, STATION_B, "direct");
    stats.stop();

    expect(sessionRows(server)).toHaveLength(1);
    expect(sessionRows(server)[0]!.durationMs).toBe(4_000);
    expect(hourlyRows(server)[0]!.totalMs).toBe(4_000);

    stats.stop();
    expect(sessionRows(server)).toHaveLength(1);
  });
});

describe("StatsService consultas", () => {
  async function seed(server: TestServer, userId: number): Promise<void> {
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

  it("devuelve el top de emisoras ordenado con su snapshot", async () => {
    const { server, stats } = makeService();
    const userId = await createUser(server);
    await seed(server, userId);

    const top = stats.topStations(userId, { from: null, to: null }, 10);
    expect(top.map((entry) => entry.station.id)).toEqual([STATION_A.id, STATION_B.id]);
    expect(top[0]!.totalMs).toBe(5_400_000);
    expect(top[1]!.totalMs).toBe(900_000);
  });

  it("devuelve top vacio para un usuario sin escuchas", async () => {
    const { server, stats } = makeService();
    const userId = await createUser(server);
    expect(stats.topStations(userId, { from: null, to: null }, 10)).toEqual([]);
    expect(stats.recent(userId, 10)).toEqual([]);
  });

  it("lista escuchas recientes ordenadas y con duracion", async () => {
    const { server, stats } = makeService();
    const userId = await createUser(server);
    await seed(server, userId);

    const recent = stats.recent(userId, 10);
    expect(recent).toHaveLength(2);
    expect(recent[0]!.station.id).toBe(STATION_B.id);
    expect(recent[1]!.station.id).toBe(STATION_A.id);
    expect(recent[0]!.durationMs).toBe(900_000);
    expect(recent[0]!.startedAt).toBe(Date.UTC(2026, 8, 29, 22, 0));
  });

  it("construye la evolucion diaria con dias sin escucha a cero", async () => {
    const { server, stats } = makeService();
    const userId = await createUser(server);
    await seed(server, userId);

    const timeline = stats.timeline(userId, { from: "2026-09-27", to: "2026-09-30" }, "day");
    expect(timeline).toEqual([
      { bucket: "2026-09-27", totalMs: 0 },
      { bucket: "2026-09-28", totalMs: 5_400_000 },
      { bucket: "2026-09-29", totalMs: 900_000 },
      { bucket: "2026-09-30", totalMs: 0 },
    ]);
  });

  it("agrupa la evolucion por semana y por mes", async () => {
    const { server, stats } = makeService();
    const userId = await createUser(server);
    await seed(server, userId);

    const weekly = stats.timeline(userId, { from: "2026-09-01", to: "2026-09-30" }, "week");
    expect(weekly[0]!.bucket).toBe("2026-08-31");
    expect(weekly.reduce((sum, entry) => sum + entry.totalMs, 0)).toBe(6_300_000);

    const monthly = stats.timeline(userId, { from: "2026-08-01", to: "2026-10-31" }, "month");
    expect(monthly.map((entry) => entry.bucket)).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
    ]);
    expect(monthly[1]!.totalMs).toBe(6_300_000);
  });

  it("calcula habitos por dia de la semana y hora local", async () => {
    const { server, stats } = makeService();
    const userId = await createUser(server);
    await seed(server, userId);

    const habits = stats.habits(userId, { from: null, to: null });
    const monday10 = habits.find((entry) => entry.weekday === 0 && entry.hour === 10);
    const tuesday22 = habits.find((entry) => entry.weekday === 1 && entry.hour === 22);
    expect(monday10?.totalMs).toBe(3_600_000);
    expect(tuesday22?.totalMs).toBe(900_000);

    const ranged = stats.habits(userId, { from: "2026-09-29", to: "2026-09-29" });
    expect(ranged).toEqual([{ weekday: 1, hour: 22, totalMs: 900_000 }]);
  });

  it("desglosa generos sumando cada etiqueta y agrupa sin metadatos", async () => {
    const { server, stats } = makeService();
    const userId = await createUser(server);
    await seed(server, userId);

    const genres = stats.genres(userId, { from: null, to: null }, 10);
    expect(genres.find((entry) => entry.genre === "pop")?.totalMs).toBe(3_600_000);
    expect(genres.find((entry) => entry.genre === "rock")?.totalMs).toBe(3_600_000);
    expect(genres.find((entry) => entry.genre === "desconocido")?.totalMs).toBe(900_000);
  });

  it("desglosa paises y agrupa sin metadatos", async () => {
    const { server, stats } = makeService();
    const userId = await createUser(server);
    await seed(server, userId);

    const countries = stats.countries(userId, { from: null, to: null });
    expect(countries).toEqual([
      { country: "Spain", countryCode: "ES", totalMs: 3_600_000 },
      { country: "desconocido", countryCode: null, totalMs: 900_000 },
    ]);
  });
});
