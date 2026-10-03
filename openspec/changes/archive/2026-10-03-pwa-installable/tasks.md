# Tasks

## 1. Base PWA en Vite

- [x] 1.1 Añadir `vite-plugin-pwa` a `apps/web` y configurarlo (manifest Tolocha, `registerType: prompt`, desactivado en dev) y verificar que `npm run build` emite `dist/manifest.webmanifest` y `dist/sw.js`.
- [x] 1.2 Enlazar manifest y metadatos en `apps/web/index.html` (`rel=manifest`, `theme-color`, `apple-touch-icon`) y verificar en el HTML construido que los enlaces existen y responden 200 en preview local.

## 2. Iconos derivados de la marca

- [x] 2.1 Extraer el SVG inline a `apps/web/public/icons/tolocha.svg` como fuente y verificar que el favicon visible no cambia respecto al actual.
- [x] 2.2 Generar y commitear `pwa-192.png`, `pwa-512.png`, `maskable-512.png` (con zona segura) y `apple-touch-icon-180.png`, y verificar dimensiones/tipo de cada PNG con inspección de fichero y referencia en el manifest construido.

## 3. Service Worker seguro para multimedia

- [x] 3.1 Configurar precache solo de cáscara y `NetworkOnly` para `/api/*` y audio/streams externos, y verificar en `dist/sw.js` que las reglas runtime existen y ningún patrón cachea audio.
- [x] 3.2 Registrar el SW en scope `/` (registro PWA) y verificar en preview que `navigator.serviceWorker` queda activo, que `/favoritos` recarga vía fallback SPA y que reproduciendo una emisora no se escribe audio en Cache Storage.

## 4. Aviso unificado de actualización

- [x] 4.1 Fusionar la señal `need-refresh` del SW con `useVersionCheck` en un único aviso en español ("Hay nueva versión — Recargar") y verificar simulando cada fuente que aparece un solo toast y que aceptar recarga a la versión nueva.
- [x] 4.2 Cubrir con pruebas la fusión (GitHub solo, SW solo, ambas a la vez sin duplicar) y verificar que `npm run test --workspace @tolocharadio/web` (o el runner vigente) pasa.

## 5. Verificación de instalabilidad y release local

- [x] 5.1 Pasar la auditoría PWA instalable de DevTools/Lighthouse en build local servido por la API y verificar icono instalable, manifest válido y SW con `fetch`.
- [x] 5.2 Levantar `docker compose up --build -d`, verificar smoke (`/api/v1/health`, `/manifest.webmanifest`, `/sw.js`, navegación SPA) y calidad (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`).
