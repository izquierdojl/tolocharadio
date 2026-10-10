# Desarrollo y release

> [← Volver al README](../README.md)

## Comandos de desarrollo

Comandos raíz:

```bash
npm run typecheck    # typecheck de todos los workspaces
npm run lint         # eslint de todos los workspaces
npm test             # tests de la API (vitest + supertest)
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

- **`ci`**: en `push`/`pull_request` ejecuta `npm ci`, typecheck, lint, tests y build, y además compila la imagen Docker y hace un smoke test en contenedor (`/api/v1/health` y servido de la web).
- **`release`**: al crear un tag `v*` **sobre `main`** construye la imagen y la publica en GitHub Container Registry (GHCR) con tags semVer y `latest`, y además compila el cliente de escritorio en Linux y Windows publicando los instaladores y `latest.json` (updater) como assets de la release. Requiere los secretos del updater configurados. Un job `preflight` comprueba que el tag apunta a un commit de `main`; los tags de ramas sin fusionar no publican nada (solo un warning).

## Versionado automático

La versión sube **sola al archivar una especificación** (flujo OpenSpec): al finalizar el archivo de un change, se **fusiona la rama feature a `main`** y, ya en `main`, se ejecuta `node scripts/bump.js minor`. El script sincroniza la versión en la raíz, en todos los workspaces (incluido el cliente de escritorio, también en `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`), crea el commit `chore: release vX.Y.Z` y el tag `vX.Y.Z`. Tras `git push origin main && git push origin --tags`, el tag dispara el workflow `release` → GHCR e instaladores de escritorio. Las releases **solo se publican desde `main`**: el workflow ignora los tags que no apunten a un commit fusionado (guard `preflight`), así que nunca se etiqueta desde una rama feature.

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
git push origin main && git push origin --tags   # siempre desde main
```

**A prueba de `openspec update`**: el trigger se ancla en el `AGENTS.md` de la raíz (que openspec
no regenera), por si `openspec update` sobreescribe el skill `openspec-archive-change` con su
template original. Tras ejecutar `openspec update`, revisa `git status` sobre
`.opencode/skills/`; si el paso de release desapareció, la regla del `AGENTS.md` sigue siendo
obligatoria (puedes re-añadir el paso 7 al skill manualmente si quieres).