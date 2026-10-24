# Desarrollo y release

> [← Volver al README](../README.md)

## Comandos de desarrollo

Comandos raíz:

```bash
npm run typecheck    # typecheck de todos los workspaces
npm run lint         # eslint de todos los workspaces
npm test             # tests de API y web
npm run verify       # typecheck + lint + tests de todos los workspaces
npm run verify:full  # verify + build
npm run build        # compila API (dist/) y web (dist/)
npm start            # arranca la API compilada (sirviendo la web si STATIC_DIR apunta a ella)
```

Migraciones de la base de datos (el arranque de la API ya las aplica automáticamente; para gestionarlas a mano, dentro del workspace `@tolocharadio/api`):

```bash
npm run db:generate   # genera una nueva migración desde el esquema de Drizzle
npm run db:migrate    # aplica las migraciones pendientes
```

## Cliente de escritorio (Tauri)

El workspace `apps/desktop` contiene el cliente nativo (Tauri 2 + Rust) que carga la
interfaz de un servidor TolochaRadio remoto y añade bandeja, controles multimedia,
atajos globales y autoactualización.

Requisitos de desarrollo:

- **Rust >= 1.90** (rustup) y las herramientas de compilación del sistema.
- **Linux (Debian/Ubuntu)**:
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf
  ```
- **Windows**: Visual Studio Build Tools (C++) y WebView2 (incluido en Windows 10/11).

Comandos:

```bash
npm run tauri dev --workspace @tolocharadio/desktop    # desarrollo con recarga
npm run tauri build --workspace @tolocharadio/desktop  # instaladores en src-tauri/target/release/bundle
```

La ventana principal se crea en Rust (`src-tauri/src/lib.rs`) con un guard de navegación
que solo permite la página local y el origen del servidor configurado. El puente con la
interfaz usa eventos (`player:update`, `player:command`, `external:open`,
`desktop:ready`, `desktop:info`).

### Claves del updater

La autoactualización firmada requiere un par de claves de Tauri:

```bash
npx tauri signer generate -- -w ~/.tauri/tolocharadio.key
```

- La **clave pública** se pega en `apps/desktop/src-tauri/tauri.conf.json`
  (`plugins.updater.pubkey`), sustituyendo el placeholder.
- La **clave privada** y su contraseña se guardan como secretos del repositorio:
  `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- Si se pierde la clave privada no se podrán publicar actualizaciones para las
  instalaciones existentes; guárdala en un lugar seguro.

## Integración continua y publicación (GitHub)

- **`ci`**: en `push` a `main` y en `pull_request` ejecuta `npm ci`, `npm audit --omit=dev --audit-level=high`, `npm run verify` (typecheck + lint + tests de API y web) y `npm run build`. La imagen Docker solo se construye, prueba y escanea en PRs que tocan `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore` o `package-lock.json`; no se publica nada desde integración. Los PR cancelan ejecuciones antiguas del mismo PR; los pushes a `main` no se cancelan para no romper el gate de release.
- **`release`**: al crear un tag `v*` **sobre `main`** espera a que el check `quality` del commit esté en verde, construye **una sola vez** la imagen, la escanea con Trivy y le hace smoke test (`/api/v1/health` y servido de la web) **antes** de publicarla en GHCR con tags semVer (`X.Y.Z`), `latest` y `node<versión de Node>`. Si el CI falla o el tag no está en `main`, no publica. Los tags de ramas sin fusionar no publican nada.
- **`desktop`**: se dispara con el tag y compila el cliente de escritorio en Linux y Windows publicando instaladores y `latest.json` (updater) como assets. Solo se ejecuta si `apps/desktop` cambió desde la release anterior (el diff ignora el bump de versiones); se puede forzar con `workflow_dispatch` (`force=true`). Requiere los secretos del updater.
- **`node-image`**: mantiene al día la base Node/Alpine de **la última release**. Se ejecuta al cambiar `.nvmrc` o el propio workflow, a diario y manualmente. Compara el último parche `22.x` de `nodejs.org/dist/index.json` y el digest de `node:22-alpine` con los labels de `:latest`; si cambia, reconstruye el tag de la última release (nunca `main`) y republica `:latest` y `:node<versión>`. Se puede lanzar a mano (`gh workflow run node-image.yml --ref main`) y forzar con `-f force=true`.
- **`security`**: cada día escanea `:latest` con Trivy y sube los resultados `HIGH`/`CRITICAL` a code scanning (SARIF), y audita los crates Rust del cliente de escritorio con `cargo audit`.
- **Dependabot** (`.github/dependabot.yml`): abre PRs semanales para npm (grupos de producción y desarrollo con parches y menores) y GitHub Actions, y mensuales para los crates de `apps/desktop/src-tauri`. Las alertas y actualizaciones de seguridad están activadas en el repositorio.
- **Protección de `main`**: requiere PR y los checks `quality` y `docker` de `ci` (sin aprobaciones obligatorias). `docker` se salta en PRs que no tocan la imagen y un check skipped cuenta como correcto. `enforce_admins=false` permite al administrador empujar el commit/tag de release. El auto-merge está habilitado a nivel de repositorio y es seguro: `gh pr merge <n> --auto --squash` espera a los checks requeridos; no hay workflow que fusione directamente.

### Carriles de trabajo

- **Cambio pequeño** (pocos archivos, sin dependencias, Dockerfile, migraciones ni desktop): `npm run verify`, push directo a `main` y CI en segundo plano. No hace falta PR.
- **Cambio grande** (desktop, dependencias, Dockerfile, esquema o varias áreas): rama + PR; el PR ejecuta `quality` y, si toca la imagen, `docker`/Trivy. Merge squash.
- El flujo OpenSpec de archivo/versionado no cambia: cada change archivado genera su versión y su release, como antes.

### Retención de imágenes

GHCR conserva los tags `X.Y.Z`, `latest` y `node<versión>`. No hay retención automática en el repo; la política recomendada es mantener las **últimas 10 releases** y borrar las anteriores desde la configuración del paquete o con un `workflow_dispatch` manual (con dry-run). Con 70 tags y ~2,2 GB de capas únicas, no es urgente.

La imagen acepta `--build-arg NODE_VERSION=<x.y.z>` para fijar la versión exacta de Node; por defecto usa la línea 22 (último parche disponible al construir). La etapa de ejecución elimina `npm`, `npx` y `corepack` porque el servicio solo necesita `node`; así no arrastra las dependencias internas de npm (con CVEs propios) dentro de la imagen publicada.

## Versionado automático

La versión sube **sola al archivar una especificación** (flujo OpenSpec): al finalizar el archivo de un change, se **fusiona la rama feature a `main`** y, ya en `main`, se ejecuta `node scripts/bump.js minor`. El script sincroniza la versión en la raíz, en todos los workspaces (incluido el cliente de escritorio, también en `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`), crea el commit `chore: release vX.Y.Z` y el tag `vX.Y.Z`. Tras `git push origin main`, esperar a que el CI del commit esté en verde y ejecutar `git push origin --tags`: el tag dispara `release` → GHCR, y `desktop` publica instaladores solo si cambió `apps/desktop`. Las releases **solo se publican desde `main`**: el workflow ignora los tags que no apunten a un commit fusionado o cuyo CI no esté verde (guard `preflight`), así que nunca se etiqueta desde una rama feature.

Regla semver mientras la versión principal sea `0`:

| Situación | Bump | Ejemplo |
| --- | --- | --- |
| Nueva especificación archivada (feature, infraestructura, etc.) | `minor` (automático) | `0.1.0 → 0.2.0` |
| Bugfix / hotfix | `patch` | `0.2.0 → 0.2.1` |
| Primera versión estable (decisión tuya) | `major` | `0.2.0 → 1.0.0` |

Comandos manuales equivalentes (por si quieres lanzar un release sin archivar nada):

```bash
npm run release:spec   # minor (0.1.0 -> 0.2.0)
npm run release:fix    # patch (0.1.0 -> 0.1.1)
npm run release:major  # major (0.1.0 -> 1.0.0)
git push origin main
# esperar a que el CI del commit de release esté en verde
git push origin --tags
```

**A prueba de `openspec update`**: el trigger se ancla en el `AGENTS.md` de la raíz (que openspec
no regenera), por si `openspec update` sobreescribe el skill `openspec-archive-change` con su
template original. Tras ejecutar `openspec update`, revisa `git status` sobre
`.opencode/skills/`; si el paso de release desapareció, la regla del `AGENTS.md` sigue siendo
obligatoria (puedes re-añadir el paso 7 al skill manualmente si quieres).