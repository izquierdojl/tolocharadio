import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { setupServer } from "./helpers.js";
import {
  favorites,
  history,
  playbackSessions,
  userStationStatsHourly,
  users,
} from "../src/db/schema.js";

describe("db schema", () => {
  it("aplica las migraciones y permite insertar usuarios", async () => {
    const server = setupServer();
    const [user] = await server.ctx.db
      .insert(users)
      .values({ email: "db@example.com", passwordHash: "x", createdAt: 1 })
      .returning();
    expect(user!.email).toBe("db@example.com");
  });

  it("hace unico el par (usuario, emisora) en favoritos", async () => {
    const server = setupServer();
    const [user] = await server.ctx.db.insert(users).values({ email: "db2@example.com", passwordHash: "x", createdAt: 1 }).returning();
    await server.ctx.db.insert(favorites).values({ userId: user!.id, stationId: "abc", snapshot: "{}", createdAt: 1 });
    await expect(
      server.ctx.db.insert(favorites).values({ userId: user!.id, stationId: "abc", snapshot: "{}", createdAt: 2 }),
    ).rejects.toThrow();
    await server.ctx.db.insert(favorites).values({ userId: user!.id, stationId: "def", snapshot: "{}", createdAt: 3 });
  });

  it("hace unico el par (usuario, emisora) en historial", async () => {
    const server = setupServer();
    const [user] = await server.ctx.db.insert(users).values({ email: "db3@example.com", passwordHash: "x", createdAt: 1 }).returning();
    await server.ctx.db.insert(history).values({ userId: user!.id, stationId: "abc", snapshot: "v1", playedAt: 1 });
    await expect(
      server.ctx.db.insert(history).values({ userId: user!.id, stationId: "abc", snapshot: "v2", playedAt: 2 }),
    ).rejects.toThrow(/UNIQUE/);
    await server.ctx.db.insert(history).values({ userId: user!.id, stationId: "def", snapshot: "v1", playedAt: 3 });
  });

  it("acumula total_ms por bucket con upsert incremental", async () => {
    const server = setupServer();
    const [user] = await server.ctx.db.insert(users).values({ email: "db4@example.com", passwordHash: "x", createdAt: 1 }).returning();
    const target = [
      userStationStatsHourly.userId,
      userStationStatsHourly.stationId,
      userStationStatsHourly.bucket,
    ];

    await server.ctx.db
      .insert(userStationStatsHourly)
      .values({ userId: user!.id, stationId: "abc", bucket: "2026-10-01T10", totalMs: 1000 });
    await server.ctx.db
      .insert(userStationStatsHourly)
      .values({ userId: user!.id, stationId: "abc", bucket: "2026-10-01T10", totalMs: 500 })
      .onConflictDoUpdate({
        target,
        set: { totalMs: sql`${userStationStatsHourly.totalMs} + ${500}` },
      });
    await server.ctx.db
      .insert(userStationStatsHourly)
      .values({ userId: user!.id, stationId: "abc", bucket: "2026-10-01T11", totalMs: 250 })
      .onConflictDoUpdate({
        target,
        set: { totalMs: sql`${userStationStatsHourly.totalMs} + ${250}` },
      });

    const rows = await server.ctx.db.select().from(userStationStatsHourly);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.bucket === "2026-10-01T10")!.totalMs).toBe(1500);
    expect(rows.find((r) => r.bucket === "2026-10-01T11")!.totalMs).toBe(250);
  });

  it("borra estadisticas y sesiones en cascada al eliminar el usuario", async () => {
    const server = setupServer();
    const [user] = await server.ctx.db.insert(users).values({ email: "db5@example.com", passwordHash: "x", createdAt: 1 }).returning();
    await server.ctx.db
      .insert(userStationStatsHourly)
      .values({ userId: user!.id, stationId: "abc", bucket: "2026-10-01T10", totalMs: 1000 });
    await server.ctx.db.insert(playbackSessions).values({
      userId: user!.id,
      stationId: "abc",
      snapshot: "{}",
      source: "direct",
      startedAt: 1,
      endedAt: 2,
      durationMs: 1000,
    });

    await server.ctx.db.delete(users).where(eq(users.id, user!.id));

    expect(await server.ctx.db.select().from(userStationStatsHourly)).toHaveLength(0);
    expect(await server.ctx.db.select().from(playbackSessions)).toHaveLength(0);
  });
});