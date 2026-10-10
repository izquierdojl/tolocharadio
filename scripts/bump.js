#!/usr/bin/env node
/**
 * Sube la version (semver) en la raiz y en todos los workspaces,
 * crea el commit "chore: release vX.Y.Z" y el tag "vX.Y.Z".
 *
 * Uso:
 *   node scripts/bump.js minor   # 0.1.0 -> 0.2.0 (nueva especificacion, por defecto)
 *   node scripts/bump.js patch   # 0.2.0 -> 0.2.1 (bugfix/hotfix)
 *   node scripts/bump.js major   # 0.2.0 -> 1.0.0 (primera version estable)
 *
 * Con BUMP_DRY_RUN=1 no toca ficheros ni git: solo imprime la proxima version.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACES = [
  "apps/api/package.json",
  "apps/web/package.json",
  "apps/desktop/package.json",
];
const TAURI_CONF = "apps/desktop/src-tauri/tauri.conf.json";
const CARGO_TOML = "apps/desktop/src-tauri/Cargo.toml";
const DRY = process.env.BUMP_DRY_RUN === "1";

const type = process.argv[2] ?? "minor";
if (!["major", "minor", "patch"].includes(type)) {
  console.error(`Tipo de bump desconocido: ${type} (usa major | minor | patch)`);
  process.exit(1);
}

const rootPkgPath = join(REPO_ROOT, "package.json");
const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));

const [major, minor, patch] = rootPkg.version.split(".").map((n) => Number(n) || 0);
const next =
  type === "major" ? [major + 1, 0, 0] : type === "minor" ? [major, minor + 1, 0] : [major, minor, patch + 1];
const version = next.join(".");

console.log(`Versión actual: ${rootPkg.version} -> ${version} (${type})`);
if (DRY) {
  console.log("Modo dry-run: no se modifica nada.");
  process.exit(0);
}

rootPkg.version = version;
writeFileSync(rootPkgPath, `${JSON.stringify(rootPkg, null, 2)}\n`);

for (const rel of WORKSPACES) {
  const pkgPath = join(REPO_ROOT, rel);
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

const tauriConfPath = join(REPO_ROOT, TAURI_CONF);
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
tauriConf.version = version;
writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);

const cargoTomlPath = join(REPO_ROOT, CARGO_TOML);
const cargoToml = readFileSync(cargoTomlPath, "utf8");
const versionPattern = /^version\s*=\s*"[^"]*"/m;
if (!versionPattern.test(cargoToml)) {
  console.error(`No se encontró la versión en ${CARGO_TOML}`);
  process.exit(1);
}
writeFileSync(cargoTomlPath, cargoToml.replace(versionPattern, `version = "${version}"`));

const changed = ["package.json", ...WORKSPACES, TAURI_CONF, CARGO_TOML];
execSync(`git add ${changed.join(" ")}`, { cwd: REPO_ROOT, stdio: "inherit" });
execSync(`git commit -m "chore: release v${version}"`, { cwd: REPO_ROOT, stdio: "inherit" });
execSync(`git tag "v${version}"`, { cwd: REPO_ROOT, stdio: "inherit" });
console.log(`Release local creado: commit + tag v${version}`);
console.log("Publica con: git push origin <rama> && git push origin --tags");