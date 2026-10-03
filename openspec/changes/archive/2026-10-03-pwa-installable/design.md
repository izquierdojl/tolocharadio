# Design

## Context

Ver proposal.md (Why). Estado actual verificado: `apps/web/index.html` sin manifest ni SW; no existe `apps/web/public/`; `vite.config.ts` sin plugin PWA; `apps/api/src/app.ts:49-66` (`serveFrontend`) sirve `dist/` con fallback SPA a `index.html` en mismo origen; Docker publica `STATIC_DIR=/app/apps/web/dist`; aviso de versión actual en `useVersionCheck.ts` + `sonner` Toaster en `main.tsx`. La radio reproduce streams externos (radio-browser): el offline total no aplica al audio.

## Goals / Non-Goals

**Goals:**
- Criterio instalable Chromium con el mínimo (manifest + SW + iconos) sin tocar Express ni el despliegue.
- SW que nunca cachea API ni audio; solo acelera la cáscara.
- Un único aviso de actualización en español para ambas fuentes (GitHub release y SW en espera).

**Non-Goals:**
- Offline de audio/datos, shortcuts, screenshots, push, share_target, protocol handlers.
- Botón `beforeinstallprompt` propio (basta el icono nativo de la barra).
- Paridad de instalación en Firefox/Safari (queda como acceso directo; aceptado en exploración).

## Decisions

- **Generación con `vite-plugin-pwa` (Workbox `generateSW`, `registerType: 'prompt'`)** frente a SW manual. Por qué: precache con hash por build encaja con deploys Docker (cada release cambia assets), inyecta manifest y SW sin ficheros a mano, y expone evento de "SW en espera". Alternativa manual descartada: control total pero mantenimiento de invalidación y versionado propio.
- **Manifest declarado en config del plugin** (nombre TolochaRadio, `short_name`, `start_url: /`, `scope: /`, `display: standalone`, `theme/background #0f1a12`, `lang: es`, categorías música/entretenimiento). Por qué: evita deriva entre manifest escrito a mano y build; el plugin lo emite a `dist/` y lo enlaza en `index.html`. `start_url: /` + `scope: /` encajan con `BrowserRouter` y el fallback existente sin cambios en Express.
- **Estrategia de caché**: precache de cáscara (glob de `dist`: html/js/css) + `runtimeCaching` `NetworkOnly` para `/api/*` y para destinos de audio/cross-origin de streams. Por qué: es lo recomendable para multimedia — cachear un stream infinito corrompe el SW y llena disco; la API con auth no debe servirse stale. Alternativa `NetworkFirst` para API descartada: añade complejidad sin valor (los datos cambian por usuario).
- **Iconos**: extraer el SVG inline de `index.html` a `apps/web/public/icons/tolocha.svg` como fuente y generar `pwa-192.png`, `pwa-512.png`, `maskable-512.png` (con padding ~10-15% zona segura) y `apple-touch-icon-180.png`. Herramienta: `pwa-assets-generator` o script `sharp` en una sola pasada; los PNG generados se commitean para builds reproducibles sin red. Por qué derivados: el usuario lo pidió así; mantiene la marca montaña+sol.
- **Aviso unificado**: nuevo hook/estado que escucha `need-refresh` del registro PWA (`virtual:pwa-register`) y lo fusiona con `useVersionCheck` en un único toast/sonner "Hay nueva versión — Recargar" (recarga con `updateServiceWorker(true)` o enlace a GitHub según fuente; si ambas, un solo aviso con prioridad SW). Por qué: evita dos banners compitiendo y reutiliza el Toaster ya montado.
- **SW solo en build**: plugin desactivado en `vite dev` (comportamiento por defecto). Por qué: evita SW rancios en desarrollo y puertos 5173 vs 3000.

## Risks / Trade-offs

- [Cáscara obsoleta tras deploy] → `registerType: prompt` + aviso único de recarga; `skipWaiting` solo al aceptar, nunca automático silencioso que corte la escucha.
- [SW cachea audio por una regla demasiado amplia] → allowlist estricta: precache solo extensiones de `dist`, `NetworkOnly` explícito para `/api` y `requestDestination: audio/video` + orígenes de streams; prueba manual reproduciendo una emisora con SW activo.
- [Doble aviso GitHub+SW] → estado fusionado con prioridad SW y test de ambas señales simultáneas.
- [Recorte en maskable] → padding de zona segura + revisión visual del icono instalado en Android/Windows.
- [Cabeceras de `dist` vía Express] → verificación de `Content-Type` del manifest y `Service-Worker-Allowed: /`; si falla, ajuste menor en `serveFrontend` (no previsto por defecto).
- [Falsa expectativa offline] → el aviso y la doc dejan claro que sin red la UI abre pero el audio necesita internet.

## Migration Plan

1. Despliegue normal: `npm run build` genera manifest+SW en `dist/`; Docker lo sirve sin cambios (`docker compose up --build -d` + smoke de `/manifest.webmanifest` y `/sw.js`).
2. Usuarios con pestaña vieja abierta: reciben el aviso unificado y recargan; sin migración de datos (sin cambios de API/DB).
3. Rollback: revert del change + rebuild/redeploy; el SW viejo se sustituye en la siguiente visita (los clientes instalados actualizan al abrir con red).

## Open Questions

- Ninguna que bloquee specs o tareas. Detalle menor diferible a implementación: texto exacto del toast y si el enlace a GitHub convive dentro del mismo aviso o solo recarga (por defecto: recarga; enlace a release solo cuando la fuente es GitHub sin SW en espera).
