# Tasks

## 1. Esquema de progreso/sesiones y token de reproducción en API

- [x] 1.1 Añadir las tablas `podcast_progress`, `podcast_listen_sessions` y `user_podcast_stats_hourly` con sus índices en `apps/api/src/db/schema.ts`, generar la migración en `apps/api/drizzle/` y añadir `PODCAST_STREAM_MODE` en `apps/api/src/config/env.ts`, verificando con `npm run typecheck -w @tolocharadio/api`.
- [x] 1.2 Implementar `apps/api/src/services/podcasts/playbackToken.ts` (firma HMAC-SHA256 con contexto `tolocharadio/podcast-playback/v1`, validación timing-safe y expiración) y verificarlo con tests unitarios en `apps/api/test/podcasts-playback-token.test.ts`.
- [x] 1.3 Implementar `POST /api/v1/podcasts/episodes/:episodeId/playback` y `GET/HEAD /api/v1/podcasts/episodes/:episodeId/stream` (soporte `Range`, `206`, propagación de `416` y modo `proxy`/`redirect`) en `apps/api/src/routes/podcasts.ts`, y verificar con tests de integración en `apps/api/test/podcasts-stream.test.ts`.

## 2. Servicio y endpoints idempotentes de progreso

- [x] 2.1 Implementar `apps/api/src/services/podcasts/progress.ts` y las rutas `GET/PUT/POST /api/v1/podcasts/episodes/:episodeId/progress` (control de `sequence`, cálculo de delta acumulativo, actualización de `podcast_progress`, regla de completado y cubo horario en `user_podcast_stats_hourly`), documentar los nuevos endpoints en `apps/api/src/openapi.ts` y `docs/api.md`, y verificar con tests en `apps/api/test/podcasts-progress.test.ts` y `apps/api/test/openapi.test.ts`.

## 3. Motor de reproducción bajo demanda y `PlayerBar` en web

- [x] 3.1 Extender `apps/web/src/lib/playbackEngine.ts` y `apps/web/src/stores/player.ts` con el modelo discriminado `radio | podcast`, soporte de `currentTime`, `duration`, `seek`, `skip`, `playbackRate`, restauración de posición tras reconexión, manejo de `ended` sin reconexión infinita y envío periódico/keepalive de progreso, verificando con tests unitarios en `apps/web/src/lib/playbackEngine.test.ts`.
- [x] 3.2 Actualizar `apps/web/src/components/PlayerBar.tsx` y crear `apps/web/src/components/podcasts/EpisodePlayerControls.tsx` (badge **EN DIRECTO** / **PODCAST**, barra de progreso interactiva, tiempos, saltos `-15 s` / `+30 s`, selector de velocidad `1x`–`2x` y `Media Session API`), verificando con tests de componente y `npm run verify:full`.
