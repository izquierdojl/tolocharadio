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
una nueva versión de la aplicación:

1. Commitear el archivo/sync de specs si quedó algo pendiente (`git add openspec/ && git commit`).
2. Ejecutar la release:
   - `node scripts/bump.js minor` para un change de feature/infra/docs (lo habitual), o
   - `node scripts/bump.js patch` si el change era un bugfix/hotfix.
   El script sincroniza la versión en raíz + workspaces, crea el commit `chore: release vX.Y.Z` y el tag `vX.Y.Z`.
3. `git push origin <rama> && git push origin --tags` → el tag dispara el workflow `release` de GitHub Actions → GHCR.

Primera versión estable: cuando el usuario la decida, `node scripts/bump.js major` (→ 1.0.0).

Esta regla está anclada aquí (y no solo en el skill `openspec-archive-change`) porque
`openspec update` regenera los archivos de `.opencode/skills/*` sobreescribiendo modificaciones
propias. Si tras `openspec update` el skill perdió el paso de release, esta sección sigue
aplicando tal cual; opcionalmente se puede re-aplicar el paso 7 al skill
(`git restore .opencode/skills/openspec-archive-change/SKILL.md` NO sirve si el template cambió:
mejor re-añadir el paso manualmente).