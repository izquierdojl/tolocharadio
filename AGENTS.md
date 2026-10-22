# AGENTS.md — TolochaRadio

## Proyecto

Monorepo TypeScript con `apps/api` (Express 5 + Drizzle/better-sqlite3) y `apps/web` (React + Vite + Zustand). Flujo de trabajo spec-driven con OpenSpec: las features/mejoras entran como *changes* en `openspec/changes/`.

## Reglas generales

- Hablar y escribir textos (UI, commits, docs) en **español**.
- No publicar secretos: `.env` está gitignored; no comitearlo ni exponerlo.
- No empezar implementaciones nuevas sin que exista un change OpenSpec propuesto.
- Calidad antes de terminar una tarea: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
- Confirmar en Docker tras cambios del backend: `docker compose up --build -d` + smoke.
- **Archivar = commitear TODO incluido codigo.** Al archivar un change, los cambios de codigo (componentes, CSS, etc.) DEBEN estar commiteados en la rama feature **antes** de mergeear a main. No commitear solo los openspec y el bump: verificar con `git status` que no quedan archivos modificados sin commitear.

## Versionado y release (IMPORTANTE — a prueba de `openspec update`)

Cada vez que se **archive un change OpenSpec**, tras el archivado hay que generar obligatoriamente
una nueva versión de la aplicación, **siempre desde `main`**. Nunca se etiqueta desde una rama
feature: el workflow `release` comprueba en un job `preflight` que el tag apunta a un commit de
`main` y, si no, no publica nada (solo avisa con un warning).

1. En la rama feature: commitear TODO (código + archivado/sync de specs) y fusionarla a `main`.
2. Ya en `main` actualizado, ejecutar la release:
   - `node scripts/bump.js minor` para un change de feature/infra/docs (lo habitual), o
   - `node scripts/bump.js patch` si el change era un bugfix/hotfix.
   El script sincroniza la versión en raíz + workspaces (+ `tauri.conf.json` y `Cargo.toml`), crea el commit `chore: release vX.Y.Z` y el tag `vX.Y.Z`.
3. `git push origin main && git push origin --tags` → el tag dispara el workflow `release` de GitHub Actions (solo si está en `main`) → GHCR + instaladores del cliente de escritorio.

### Imagen al día con Node y herramientas

El workflow `node-image` mantiene la imagen de GHCR actualizada con Node y su base Alpine:
se ejecuta al cambiar `.nvmrc`/`Dockerfile` en `main`, **cada 6 horas** y a mano. Compara
el último parche `22.x` de `nodejs.org/dist/index.json` **y el digest de
`node:22-alpine`** con lo que lleva la imagen `:latest`; si cambia cualquiera, reconstruye
y publica `:latest` y `:node<versión>` (por ejemplo, `node22.23.4`) sin tocar la versión
de la aplicación. Para lanzarlo manualmente:
`gh workflow run node-image.yml --ref main` (fuerza con `-f force=true`). Los tags de
release también incluyen `:node<versión>`, y el `Dockerfile` acepta
`--build-arg NODE_VERSION=<x.y.z>`.

### Dependencias y acciones

- `npm audit --omit=dev --audit-level=high` (solo producción) y Trivy (`HIGH`/`CRITICAL`
  con corrección) bloquean la CI; el workflow `security` escanea a diario la imagen
  publicada (SARIF) y audita los crates Rust con `cargo audit`.
- Dependabot (`.github/dependabot.yml`) abre PRs semanales para npm (grupos de producción y
  desarrollo con parches y menores) y GitHub Actions, y mensuales para los crates de
  `apps/desktop/src-tauri`. Las alertas y actualizaciones de seguridad están activadas en el
  repositorio.
- El auto-merge está habilitado a nivel de repositorio y es seguro porque `main` está
  protegida: todo PR necesita los checks `quality` y `docker` de `ci`. Se activa por PR con
  `gh pr merge --auto --squash`; no hay un workflow que fusione directamente.
- `enforce_admins=false`: el administrador puede saltarse la protección para empujar el
  commit y el tag de release generados por `scripts/bump.js`.
- No añadir `npm`/`npx` a la etapa de ejecución: el servicio solo necesita `node` y así se
  evitan las dependencias internas de npm (con CVEs propios) en la imagen publicada.

Primera versión estable: cuando el usuario la decida, `node scripts/bump.js major` (→ 1.0.0).

Esta regla está anclada aquí (y no solo en el skill `openspec-archive-change`) porque
`openspec update` regenera los archivos de `.opencode/skills/*` sobreescribiendo modificaciones
propias. Si tras `openspec update` el skill perdió el paso de release, esta sección sigue
aplicando tal cual; opcionalmente se puede re-aplicar el paso 7 al skill
(`git restore .opencode/skills/openspec-archive-change/SKILL.md` NO sirve si el template cambió:
mejor re-añadir el paso manualmente).