import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { DB } from "./client.js";
import { packageRoot } from "../lib/paths.js";

export function applyMigrations(db: DB, migrationsFolder: string): void {
  const folder = resolve(migrationsFolder);
  migrate(db, { migrationsFolder: folder });
}

export function migrationsFolderPath(): string {
  return resolve(packageRoot(fileURLToPath(import.meta.url)), "drizzle");
}