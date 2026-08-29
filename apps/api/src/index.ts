import { loadConfig } from "./config/env.js";
import { createDb } from "./db/client.js";
import { applyMigrations, migrationsFolderPath } from "./db/migrate.js";
import { createApp } from "./app.js";
import { createContext } from "./factory.js";

const config = loadConfig();
const { db, sqlite } = createDb(config.databasePath);
applyMigrations(db, migrationsFolderPath());
const ctx = createContext(config, db);
const app = createApp(ctx);

const server = app.listen(config.port, () => {
  console.log(`TolochaRadio API escuchando en http://localhost:${config.port}`);
  console.log(`Swagger UI: http://localhost:${config.port}/api/v1/docs`);
});

function shutdown(): void {
  server.close(() => {
    sqlite.close();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);