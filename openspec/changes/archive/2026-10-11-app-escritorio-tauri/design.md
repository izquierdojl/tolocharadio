# Design

## Context

Ver `proposal.md` para la motivación. Restricciones actuales que condicionan el diseño:

- El frontend (`apps/web`) llama a la API por ruta relativa `/api/v1` con `credentials: "same-origin"` (`apps/web/src/lib/api.ts:3,43`) y la auth depende de cookies httpOnly `tolocha-refresh`/`tolocha-access` (`apps/api/src/routes/auth.ts:9-15`). Cargar la interfaz desde un origen distinto al del servidor rompería la sesión.
- La API sirve el frontend compilado vía `STATIC_DIR` (`apps/api/src/app.ts:106`), de modo que en el servidor todo es mismo origen.
- El reproductor usa un `HTMLAudioElement` creado con `new Audio()` y fuera del DOM (`apps/web/src/stores/player.ts:28`), y no usa `navigator.mediaSession`. Un script inyectado no puede alcanzarlo; hace falta cooperación del propio frontend para el control nativo.
- El proyecto ya es PWA instalable (`apps/web/vite.config.ts`) y publica imágenes GHCR al tag `vX.Y.Z` con `scripts/bump.js`.

Decisión de partida (aprobada): **cliente ligero con datos compartidos** — la app apunta al servidor autoalojado del usuario; no se empaqueta API ni SQLite.

## Goals / Non-Goals

**Goals:**

- Cliente de escritorio Tauri 2 para Windows y Linux que reutilice la interfaz web y la API sin cambios.
- Integración nativa: bandeja, controles multimedia del SO, atajos globales, instancia única, enlaces externos, autoactualización.
- Configuración de la URL del servidor en el primer arranque y modificable después.
- Empaquetado y autoactualización integrados en el flujo de release existente.

**Non-Goals:**

- Empaquetar Node/la API o una base de datos local (rompe los datos compartidos).
- Reescribir la API en Rust o usar un sidecar Node.
- Firma/notarización de macOS y Flatpak en esta fase (la configuración queda preparada).
- Cambios en la API, el esquema SQLite o Docker.

## Decisions

### 1. Tauri 2 cargando la URL remota en la ventana principal

La ventana carga directamente la URL del servidor configurado. Así la interfaz, las cookies de sesión y el `<audio>` viven en el mismo origen que la API, sin CORS ni `sameSite=None`. El frontend se actualiza con cada despliegue del servidor sin recompilar el shell.

**Alternativas descartadas:** empaquetar el frontend dentro del binario (rompe el mismo origen con una API remota y obliga a CORS + cookies `SameSite=None`; además exigiría recompilar por cada deploy web) y Electron (reutiliza la API Node pero pesa ~10× y, si se usa como cliente remoto, no aporta nada sobre Tauri).

### 2. Puente web↔shell por eventos, mínimo y aislado

El frontend añade `apps/web/src/lib/desktop.ts`, que solo actúa si existe `window.__TAURI__` (Tauri con `withGlobalTauri: true`), evitando dependencias npm de Tauri en `apps/web`. Contrato:

- Web → shell `player:update`: `{ stationId, name, favicon, isPlaying, isBuffering, volume }`, emitido al cambiar el store del reproductor.
- Shell → web `player:command`: `{ action: "toggle" | "stop" | "volume", value? }`; la web llama a las acciones existentes del store.
- La web expone además al shell la versión del shell para mostrarla en el diálogo "Acerca de" y señaliza `desktopMode` para ocultar el aviso de versión web (lo sustituye el updater nativo).

**Alternativa descartada:** inyección de script desde Tauri (`initialization_script`), que no puede acceder al `Audio()` fuera del DOM ni al store de Zustand.

### 3. IPC remoto con capability restringida y validación de origen en runtime

Como la URL del servidor es configurable, `remote.urls` no puede fijar un dominio concreto en tiempo de compilación. Se define una capability con `remote.urls: ["https://*", "http://localhost", "http://127.0.0.1"]` y el mínimo de permisos (`core:event` para el puente; ningún permiso de plugins). Para que el wildcard no conceda IPC efectivo a un tercero:

- La ventana se crea en Rust con un guard de navegación que solo permite la página local y el origen del servidor configurado; cualquier otra navegación se abre en el navegador del sistema.
- Rust valida el origen real de la webview (servidor configurado) antes de procesar cada mensaje del puente (`player:update`, `external:open`).
- El puente usa solo eventos (sin comandos personalizados desde el origen remoto), de modo que el origen remoto no puede invocar ninguna capacidad nativa.

Tauri 2 exige ACL para orígenes remotos (desde 2.11.1); no se usa `dangerousRemoteDomainIpcAccess` global. La URL se valida antes de guardarse (HTTPS por defecto; `http://localhost` permitido para desarrollo).

### 4. Pantallas locales de arranque, error y configuración

En lugar de abrir la ventana directamente en la URL remota, el shell arranca siempre en una página local empaquetada:

1. Sin servidor configurado → pantalla local de configuración (persistida con `tauri-plugin-store`).
2. Con servidor → comprobación `GET /api/v1/health`; si responde, `location.replace(serverUrl)`; si no, pantalla local de error con reintentar/cambiar URL.

Esto cubre la gestión de servidor inaccesible sin ventana en blanco y mantiene una única ventana/webview.

### 5. Controles multimedia con `souvlaki`; atajos globales aparte

`souvlaki` (Rust) aporta MPRIS en Linux y SMTC en Windows, con metadatos y callbacks de play/pausa/stop. Se descarta `navigator.mediaSession` (soporte desigual en WebKitGTK/WebView2) y registrar las teclas multimedia como atajos globales (secuestra la tecla y no aporta metadatos al centro de medios). Los atajos globales configurables (p. ej. `Ctrl+Alt+P`/`Ctrl+Alt+S`) se implementan con `tauri-plugin-global-shortcut`.

### 6. Estado nativo centralizado en Rust

Rust mantiene el último `player:update` para: tooltip/menú de la bandeja (`TrayIconBuilder`), metadatos de `souvlaki`, y estado de los atajos. Las acciones nativas emiten `player:command` y esperan el siguiente `player:update`.

### 7. Integración en el monorepo, versionado y CI

- `apps/desktop` es un workspace npm mínimo (solo `@tauri-apps/cli` como devDependency y scripts), con el proyecto Rust en `apps/desktop/src-tauri`.
- `scripts/bump.js` sincroniza además `apps/desktop/src-tauri/tauri.conf.json` y `Cargo.toml`.
- El workflow de release existente (tag `vX.Y.Z`) añade un job con `tauri-action` (matriz Ubuntu/Windows) que publica instaladores `.deb`/AppImage y MSI/NSIS más `latest.json`. Las claves del updater viven en secretos del repositorio.
- Plugins: `updater`, `process`, `store`, `global-shortcut`, `single-instance`, `opener` y `dialog` (aviso nativo de actualización).

## Risks / Trade-offs

- [IPC desde origen remoto es sensible] → capability wildcard solo con `core:event`, puente basado únicamente en eventos, validación del origen real en Rust antes de procesar cada mensaje, guard de navegación y HTTPS obligatorio salvo localhost.
- [La app no funciona sin red/servidor] → trade-off inherente al modelo de datos compartidos; mitigado con pantalla de error, reintentar y cambio de URL.
- [Diferencias entre WebKitGTK y WebView2] (audio, HLS, códecs) → verificación en ambas plataformas como parte de las tareas; el `<audio>` del webview es el mismo motor que usa el navegador correspondiente.
- [`souvlaki` sin validar en macOS] → solo Linux/Windows en esta fase; macOS queda preparado pero no verificado.
- [Doble flujo de actualización] (shell nativo + web en cada deploy) → el puente oculta el aviso de versión web en escritorio y muestra la versión del shell en "Acerca de".
- [Firma del updater] → claves generadas una vez y guardadas como secretos; rotación documentada.

## Migration Plan

Cambio aditivo: no toca API, base de datos ni Docker, por lo que no hay migración de datos. El rollback consiste en retirar el job de CI y el workspace `apps/desktop` (el resto del proyecto no depende de ellos). La release sigue disparándose con el tag `vX.Y.Z` que ya genera `scripts/bump.js`.

## Open Questions

- Momento de firma/notarización de macOS (no afecta a specs ni a las tareas de esta fase).
- Inclusión futura de Flatpak como canal adicional en Linux.
