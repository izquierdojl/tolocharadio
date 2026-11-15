# Tasks

## 1. Cola sincronizada, favoritos, `/podcasts/home` y `defaultSection` en API

- [x] 1.1 Añadir las tablas `podcast_favorites`, `podcast_queue_state`, `podcast_queue_items` y la columna `default_section` en `users` en `apps/api/src/db/schema.ts`, generar la migración en `apps/api/drizzle/` y cambiar el valor por defecto de `PODCASTS_ENABLED` a `true` en `apps/api/src/config/env.ts`, verificando con `npm run typecheck -w @tolocharadio/api`.
- [x] 1.2 Implementar `apps/api/src/services/podcasts/queue.ts` (alta al final/siguiente, baja, reordenación con `baseRevision` y `409 Conflict`, tope 200) y `favorites.ts` (alta, baja y listado de episodios favoritos), verificándolos con tests en `apps/api/test/podcasts-queue-favorites.test.ts`.
- [x] 1.3 Exponer las rutas `/podcasts/queue`, `/podcasts/queue/order`, `/podcasts/favorites`, `/podcasts/home` en `apps/api/src/routes/podcasts.ts` y `defaultSection` en `PATCH /api/v1/users/me` (`apps/api/src/routes/users.ts`), documentarlas en `apps/api/src/openapi.ts` y `docs/api.md`, y verificar que `apps/api/test/openapi.test.ts` y los tests de integración pasan.

## 2. Navegación `Radio | Podcasts`, perfil y pantallas web de Podcasts

- [x] 2.1 Actualizar `apps/web/src/components/AppShell.tsx`, `apps/web/src/App.tsx`, `apps/web/src/lib/defaultView.ts` y `apps/web/src/pages/Profile.tsx` para incorporar el selector `Radio | Podcasts` (condicionado a `features.podcasts`), las redirecciones `/radio/*` y el selector `defaultSection`, verificando con tests en `apps/web`.
- [x] 2.2 Crear los componentes `PodcastCard.tsx`, `EpisodeRow.tsx` y `QueuePanel.tsx` en `apps/web/src/components/podcasts/` (con portadas `referrerPolicy="no-referrer"` y `loading="lazy"`), y conectar el avance automático de cola al terminar un episodio en `apps/web/src/stores/player.ts`, verificando con tests unitarios.
- [x] 2.3 Implementar las páginas `PodcastHome.tsx`, `PodcastSearch.tsx` (búsqueda + URL RSS + import/export OPML), `PodcastSubscriptions.tsx`, `PodcastShow.tsx`, `PodcastQueue.tsx` (reordenación con `@dnd-kit` y manejo de `409`) y `PodcastFavorites.tsx` en `apps/web/src/pages/podcasts/`, verificando la navegación y estados vacíos con tests.

## 3. Integración con el cliente de escritorio y verificación

- [x] 3.1 Ampliar `apps/desktop/src-tauri/src/bridge.rs`, `apps/desktop/src-tauri/src/media.rs` y `apps/web/src/lib/desktop.ts` para publicar metadatos de episodio (`kind`, `duration`, `position`) y manejar los comandos `next`/`previous` sobre la cola de podcasts, verificando con `apps/web/src/lib/desktop.test.ts` y `cargo check` (si el toolchain Rust está presente).
- [x] 3.2 Actualizar `docs/uso.md` y `docs/arquitectura.md` describiendo la sección de Podcasts, ejecutar `npm run verify:full` y comprobar el flujo completo en Docker (`docker compose up --build -d` + smoke test).
