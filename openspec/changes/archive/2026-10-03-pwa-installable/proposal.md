# Proposal

## Why

TolochaRadio es una app de escucha prolongada (se abre, se da al play y suena de fondo). Hoy solo vive como pestaña del navegador: sin icono instalable en Chrome/Edge, sin ventana propia standalone y sin shell cacheada de arranque rápido. Hacerla instalable como PWA cubre ese hueco con coste bajo y sin cambiar backend ni despliegue Docker.

## What Changes

- Añadir `manifest.webmanifest` servido en mismo origen con nombre, iconos 192/512 (+ maskable), `display: standalone`, `start_url: /`, colores Tolocha (`theme_color`/`background_color` `#0f1a12`).
- Registrar un Service Worker mínimo que hace instalable la app en Chromium y cachea solo la cáscara (HTML/CSS/JS); `/api/*` y streams de audio quedan siempre en red (nunca se cachean).
- Generar iconos PNG derivados del SVG actual (montaña + sol) con zona segura para maskable + `apple-touch-icon` 180.
- Unificar el aviso de actualización: la señal del SW ("nuevo SW en espera") y la de GitHub releases (`useVersionCheck`) confluyen en un único aviso "Hay nueva versión — Recargar" con los textos en español.
- Verificar instalabilidad con Lighthouse/DevTools y smoke en Docker (`docker compose up --build -d`).

## Capabilities

### New Capabilities

- `pwa`: aplicación web instalable (manifest, iconos, service worker con estrategia de caché segura para multimedia, metadatos de instalación).

### Modified Capabilities

- `version-check`: el aviso de "actualización disponible" pasa a tener dos fuentes (release de GitHub o SW en espera) fusionadas en un único aviso de recarga.

## Impact

- Afecta a `apps/web` (`index.html`, build Vite, `public/`, registro del SW, aviso de actualización). Nueva dev-dependencia `vite-plugin-pwa` (Workbox).
- Sin cambios de API ni de esquema de datos. `apps/api` no requiere cambios (sirve `dist/` tal cual, incluido manifest y SW); posible ajuste menor de cabeceras solo si se detecta en verificación.
- Riesgo principal: un SW mal configurado sirve shell obsoleta o cachea audio; se mitiga con precache solo de shell + `NetworkOnly` para API/audio y pruebas de actualización.
