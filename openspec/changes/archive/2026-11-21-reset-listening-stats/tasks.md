# Tasks

## 1. Esquema y migración

- [x] 1.1 Añadir `podcastStatsResetAt` (`podcast_stats_reset_at`, `INTEGER NOT NULL DEFAULT 0`) a `users` en `apps/api/src/db/schema.ts`, generar la migración con `npm --workspace @tolocharadio/api run db:generate` y verificar que la migración se aplica en los tests con `npm --workspace @tolocharadio/api test`.
- [x] 1.2 Ampliar `apps/api/test/db.test.ts` para comprobar que un usuario nuevo tiene `podcastStatsResetAt = 0` y que el valor se puede actualizar y leer, y verificar con `npm --workspace @tolocharadio/api test`.

## 2. Reinicio de estadísticas de radio

- [x] 2.1 Implementar `StatsService.reset(userId)` en `apps/api/src/services/stats.ts`: reiniciar el estado de las sesiones activas del usuario (pendientes, acumulados e instantes) y borrar en una transacción `user_station_stats_hourly` y `playback_sessions` solo de ese usuario; cubrirlo con tests de servicio y verificar con `npm --workspace @tolocharadio/api test`.
- [x] 2.2 Exponer `DELETE /api/v1/stats/me` con `requireAuth` y respuesta `{ ok: true }` en `apps/api/src/routes/stats.ts`, y verificar con tests de ruta que responde 401 sin token, 200 al reiniciar, deja las seis consultas de radio a cero/vacías y es idempotente.
- [x] 2.3 Verificar en test de ruta el aislamiento entre usuarios y que historial, favoritos y emisoras personalizadas siguen intactos tras el reinicio de radio; ejecutar `npm --workspace @tolocharadio/api test`.

## 3. Reinicio de estadísticas de podcasts

- [x] 3.1 Implementar `PodcastStatsService.reset(userId)` en `apps/api/src/services/podcasts/stats.ts`: borrar `user_podcast_stats_hourly` del usuario y fijar `podcastStatsResetAt = now` en su fila de `users`, en una transacción; verificar con test de servicio/ruta que el resumen queda a cero.
- [x] 3.2 Aplicar el corte `started_at >= podcastStatsResetAt` a todas las consultas basadas en `podcast_listen_sessions` (resumen, iniciados/completados, conteos por podcast, recientes y marca de completado de episodios) y verificar que tras el reinicio rankings, evolución, hábitos, categorías y recientes quedan vacíos o a cero con `npm --workspace @tolocharadio/api test`.
- [x] 3.3 Exponer `DELETE /api/v1/podcasts/stats` con `requireAuth` y respuesta `{ ok: true }` en `apps/api/src/routes/podcasts.ts`; verificar 401 sin token, 200 al reiniciar, idempotencia y aislamiento entre usuarios con tests de ruta.
- [x] 3.4 Cubrir con test que suscripciones, favoritos, cola, descargas y `podcast_progress` permanecen intactos tras el reinicio, y que una sesión en curso con la misma `sessionId` solo suma el delta posterior (sin recontar el tiempo anterior); verificar con `npm --workspace @tolocharadio/api test`.

## 4. OpenAPI y documentación

- [x] 4.1 Documentar `DELETE /stats/me` y `DELETE /podcasts/stats` en `apps/api/src/openapi.ts` con `bearerAuth`, respuesta `{ ok: boolean }` y 401, y añadir ambos paths a `apps/api/test/openapi.test.ts`; verificar con `npm --workspace @tolocharadio/api test`.
- [x] 4.2 Añadir ambas filas `DELETE` a la tabla de endpoints de `docs/api.md` y comprobar que el método, la ruta y la descripción coinciden con lo implementado.

## 5. Interfaz del perfil

- [x] 5.1 Crear el componente presentacional `apps/web/src/components/StatsResetSection.tsx` con la sección "Estadísticas de escucha", las dos acciones independientes y la ocultación de podcasts cuando la sección está deshabilitada; verificar con un test de render estático que aparecen los textos en español y que podcasts se omite cuando corresponde (`npm --workspace @tolocharadio/web test`).
- [x] 5.2 Integrar el componente en `apps/web/src/pages/Profile.tsx` con las mutaciones `api.delete("/stats/me")` y `api.delete("/podcasts/stats")`, `ConfirmDialog` destructivo, avisos de éxito/error en español, deshabilitado mientras hay una petición en curso e invalidación de `["stats"]` o `["podcast-stats"]` según la sección; verificar con `npm --workspace @tolocharadio/web run typecheck` y `npm --workspace @tolocharadio/web run lint`.
- [x] 5.3 Probar manualmente en la web que cancelar no borra nada, que reiniciar radio no altera podcasts (y viceversa), que las páginas de estadísticas se recargan sin datos y que podcasts no aparece en el perfil cuando `PODCASTS_ENABLED=false`.

## 6. Verificación integral

- [x] 6.1 Ejecutar en la raíz `npm run verify:full` y confirmar que typecheck, lint, tests y build pasan en ambos workspaces.
- [x] 6.2 Levantar `docker compose up --build -d` y hacer smoke con dos cuentas: sembrar escuchas de radio y podcasts, reiniciar solo radio y comprobar que podcasts conserva sus datos; reiniciar podcasts y comprobar que radio conserva los suyos y que suscripciones/progreso siguen disponibles.

## Workflow follow-up

- Archivar el change tras la revisión y mergear a `main` con todo el código commiteado.
- Desde `main`, ejecutar `node scripts/bump.js minor` y publicar la release según `AGENTS.md`.
