import type { Express } from "express";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { loadConfig, type Config } from "../src/config/env.js";
import { createDb, type DbConnection } from "../src/db/client.js";
import { applyMigrations, migrationsFolderPath } from "../src/db/migrate.js";
import { createContext } from "../src/factory.js";
import type { AppContext } from "../src/context.js";

export const TEST_ACCESS_SECRET = "test-access-secret-0123456789-abcdefghijklmnop";
export const TEST_REFRESH_SECRET = "test-refresh-secret-0123456789-abcdefghijklmnop";

export function testConfig(overrides: Partial<NodeJS.ProcessEnv> = {}): Config {
  return loadConfig({
    NODE_ENV: "test",
    DATABASE_PATH: ":memory:",
    JWT_ACCESS_SECRET: TEST_ACCESS_SECRET,
    JWT_REFRESH_SECRET: TEST_REFRESH_SECRET,
    CACHE_TTL_MS: "300000",
    HISTORY_LIMIT: "10",
    ...overrides,
  });
}

export interface TestServer {
  app: Express;
  ctx: AppContext;
  config: Config;
  db: DbConnection;
}

export function setupServer(overrides: Partial<NodeJS.ProcessEnv> = {}): TestServer {
  const config = testConfig(overrides);
  const conn = createDb(config.databasePath);
  applyMigrations(conn.db, migrationsFolderPath());
  const ctx = createContext(config, conn.db);
  const app = createApp(ctx);
  return { app, ctx, config, db: conn };
}

export function request(app: Express) {
  return supertest(app);
}