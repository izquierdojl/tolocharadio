# Proposal

## Why

Las estadísticas de escucha ya se capturan y se visualizan, pero el usuario no tiene forma de ponerlas a cero: quien quiere empezar de nuevo (tras una etapa de pruebas, un dispositivo compartido o simplemente por privacidad) depende de una intervención manual en la base de datos. El change `listening-stats` dejó el borrado por parte del usuario como decisión futura; ahora se cubre con un reinicio independiente para radio y para podcasts desde el perfil.

## What Changes

- **Dos endpoints autenticados e independientes**:
  - `DELETE /api/v1/stats/me` reinicia las estadísticas de radio.
  - `DELETE /api/v1/podcasts/stats` reinicia las estadísticas de podcasts.
- **Reinicio de radio**: elimina los agregados horarios (`user_station_stats_hourly`) y las sesiones (`playback_sessions`) del usuario, y reinicia la contabilidad de las escuchas en curso en memoria, de modo que solo cuenta el tiempo posterior al reinicio. No toca historial, favoritos ni emisoras personalizadas.
- **Reinicio de podcasts**: elimina los agregados horarios (`user_podcast_stats_hourly`) y fija un corte por usuario para que las sesiones anteriores dejen de mostrarse y no vuelvan a contabilizarse en resumen, rankings ni recientes. No toca suscripciones, favoritos, cola, descargas ni el progreso de episodios (posición/completado).
- **Sección "Estadísticas de escucha" en `/perfil`** con dos acciones separadas ("Reiniciar estadísticas de radio" y "Reiniciar estadísticas de podcasts"), confirmación modal destructiva, avisos en español y refresco automático de las páginas de estadísticas.
- **Contrato y documentación**: los dos endpoints `DELETE` se añaden a OpenAPI y a `docs/api.md`; el contrato `/api/v1` sigue siendo aditivo.
- **Privacidad**: ambos endpoints requieren token y operan exclusivamente sobre los datos del usuario autenticado.

## Capabilities

### New Capabilities

<!-- Ninguna: el comportamiento se incorpora a capacidades existentes. -->

### Modified Capabilities

- `listening-stats`: nuevo requisito para que el usuario autenticado reinicie sus estadísticas de radio y deje de ver los datos anteriores.
- `podcast-stats`: nuevo requisito para reiniciar las estadísticas de podcasts preservando suscripciones, progreso y demás datos funcionales.
- `stats-visualization`: controles de reinicio en el perfil, con confirmación, textos en español y recarga de las vistas afectadas.

## Impact

- **Backend (`apps/api`)**:
  - `src/routes/stats.ts` y `src/routes/podcasts.ts` — endpoints `DELETE`.
  - `src/services/stats.ts` y `src/services/podcasts/stats.ts` — operaciones de reinicio.
  - `src/db/schema.ts` y migración Drizzle — marca de corte `podcast_stats_reset_at` en `users`.
  - `src/openapi.ts` — documentación de los endpoints.
  - Tests de ruta y servicio para aislamiento entre usuarios, 401 y efecto del reinicio.
- **Frontend (`apps/web`)**:
  - `src/pages/Profile.tsx` — sección de estadísticas y diálogos de confirmación.
  - `src/lib/api.ts` — llamadas `DELETE`; invalidación de las cachés `stats` y `podcast-stats`.
- **Documentación**: tabla de endpoints en `docs/api.md`.
- **Sin cambios de compatibilidad**: no se modifica ningún endpoint existente ni la forma de los datos de las estadísticas; no se borran historial, favoritos, suscripciones, cola, descargas ni progreso de episodios.
- **Fuera de alcance**: reinicio de estadísticas de toda la instalación, programación automática del borrado, exportación previa de estadísticas y borrado de la cuenta.
