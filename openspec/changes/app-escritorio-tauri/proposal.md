# Proposal

## Why

TolochaRadio funciona en navegador y como PWA instalable, pero no ofrece integración nativa de escritorio: bandeja del sistema, teclas multimedia, atajos globales ni autoactualización del sistema operativo. Además, la PWA depende del navegador del usuario para la ventana de aplicación. Como ya existe una app Android nativa en otro repositorio, falta cubrir Windows/Linux (y Mac en menor medida) con un cliente de escritorio que reutilice al máximo el frontend y la API actuales, sin duplicar lógica ni fragmentar los datos del usuario.

## What Changes

- Nuevo workspace `apps/desktop` con **Tauri 2** como cliente ligero: la ventana carga la URL de un servidor TolochaRadio autoalojado (mismo origen), por lo que sesión, cookies httpOnly, reproducción y proxy de audio (incluido HLS) funcionan sin tocar la API.
- **Configuración de servidor**: pantalla local de primer arranque para introducir la URL del servidor, persistida en el almacén de la app y modificable después; permite apuntar a cualquier instancia autoalojada.
- **Bandeja del sistema** con controles de play/pausa/stop y tooltip con la emisora en reproducción.
- **Controles multimedia del SO** (MPRIS en Linux, SMTC en Windows) y atajos globales para play/pausa/stop, reflejados en la bandeja y el menú de la app.
- **Autoactualización firmada** del shell vía GitHub Releases usando Tauri Updater; el frontend remoto se actualiza solo con cada despliegue del servidor.
- **Puente web↔shell**: el frontend, al detectarse dentro del cliente de escritorio, publica el estado del reproductor y obedece comandos (play/pausa/stop/volumen) sin alterar el comportamiento en navegador o PWA.
- **Gestión de servidor inaccesible**: pantalla de error local con opción de reintentar o cambiar la URL, en lugar de una ventana en blanco.
- **Empaquetado y CI**: instaladores `.deb`/AppImage (Linux) y MSI/NSIS (Windows) publicados como assets de release junto al `latest.json` del updater; el bump de versión sincroniza también `tauri.conf.json` y `Cargo.toml`.

Fuera de alcance de esta primera fase: firma/notarización de macOS (queda preparado pero no se valida), app Android (vive en otro repositorio) y cambios en la API, la base de datos o el despliegue Docker.

## Capabilities

### New Capabilities

- `desktop-app`: cliente de escritorio TolochaRadio (ventana Tauri, configuración de servidor, sesión compartida en mismo origen, bandeja del sistema, controles multimedia, atajos globales, autoactualización, manejo de servidor no disponible y contrato del puente web↔shell).

### Modified Capabilities

- `web-ui`: se añade un requisito de integración en modo escritorio: detectar el entorno Tauri y exponer/obedecer el puente del reproductor, manteniendo intacto el comportamiento en navegador y PWA.

## Impact

- **Nuevo**: workspace `apps/desktop` (configuración Tauri + código Rust; sin frontend propio), workflow de build de instaladores.
- **Modificado**: `apps/web` (módulo de puente y detección de entorno), `package.json` (workspace), `scripts/bump.js` (versión en `tauri.conf.json`/`Cargo.toml`), `.github/workflows` (release de instaladores), README y documentación.
- **Sin cambios**: `apps/api`, esquema SQLite y GHCR. (El `Dockerfile` solo añade la copia de `apps/desktop/package.json` en la etapa de dependencias para que `npm ci` resuelva el nuevo workspace; el contenido de la imagen no cambia.)
- **Dependencias nuevas**: Tauri 2 y plugins oficiales (`updater`, `global-shortcut`, `store`, `process`), crate `souvlaki` para controles multimedia. Sin cambios de dependencias en `apps/api`.
