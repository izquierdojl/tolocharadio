import { describe, expect, it } from "vitest";
import { setupServer } from "./helpers.js";
import { favorites, history, users } from "../src/db/schema.js";

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
});