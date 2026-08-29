import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packageRoot } from "./paths.js";

export function loadDotEnv(): void {
  const apiRoot = packageRoot(fileURLToPath(import.meta.url));
  const repoRoot = resolve(apiRoot, "..");
  const candidates = [resolve(process.cwd(), ".env"), resolve(repoRoot, ".env")];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      process.loadEnvFile(file);
    } catch (err) {
      console.warn(`No se pudo cargar el fichero de entorno ${file}: ${(err as Error).message}`);
    }
    break;
  }
}