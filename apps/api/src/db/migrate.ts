import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { DB } from "./client.js";

function packageRoot(fromFile: string): string {
  let dir = dirname(fromFile);
  while (!existsSync(resolve(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return dir;
}

export function applyMigrations(db: DB, migrationsFolder: string): void {
  const folder = resolve(migrationsFolder);
  migrate(db, { migrationsFolder: folder });
}

export function migrationsFolderPath(): string {
  return resolve(packageRoot(fileURLToPath(import.meta.url)), "drizzle");
}