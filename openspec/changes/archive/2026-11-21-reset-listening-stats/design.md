# Design

## Context

Ver `proposal.md` — Why. Estado actual relevante:

- `StatsService` (`apps/api/src/services/stats.ts`) mantiene en memoria las sesiones activas de radio por `usuario+emisora`, con volcado periódico a `user_station_stats_hourly` y cierre en `playback_sessions`. Las consultas de radio usan ambas tablas (los agregados para top/evolución/hábitos y las sesiones para géneros, países y recientes).
- `PodcastStatsService` (`apps/api/src/services/podcasts/stats.ts`) agrega desde `user_podcast_stats_hourly` y deriva resumen, iniciados/completados y recientes desde `podcast_listen_sessions`. El progreso funcional vive en `podcast_progress` y no es una tabla de estadísticas.
- El cliente de podcasts reporta `listenedMs` **acumulado por sesión de cliente** cada ~12 s (`apps/web/src/stores/player.ts`); el servidor calcula el delta contra la fila existente de `podcast_listen_sessions`.
- La web usa `@tanstack/react-query` con claves `["stats", ...]` y `["podcast-stats", ...]`, `ConfirmDialog` para acciones destructivas y `toast` de Sonner para feedback.
- `/perfil` ya agrupa preferencias en tarjetas y puede consultar `["config"]` para saber si podcasts está habilitado.

## Goals / Non-Goals

**Goals:**

- Reinicio totalmente independiente de radio y podcasts, con API propia por sección.
- Que un reinicio sea inmediato y completo de cara al usuario, incluso si hay una escucha en curso.
- Cero impacto en datos funcionales (historial, favoritos, emisoras, suscripciones, cola, descargas, progreso).
- Feedback claro en el perfil con confirmación previa y refresco de las vistas afectadas.

**Non-Goals:**

- Borrar la cuenta, el historial o el progreso de reproducción de podcasts.
- Exportar estadísticas antes de borrarlas o programar reinicios automáticos.
- Cambiar la captura de estadísticas, los formatos de respuesta existentes o el comportamiento de los clientes actuales.

## Decisions

### D1. Dos endpoints `DELETE` en los namespaces existentes

- Radio: `DELETE /api/v1/stats/me`, dentro de `statsRouter`, junto a `GET /stats/me/*`.
- Podcasts: `DELETE /api/v1/podcasts/stats`, dentro de `podcastsRouter`, junto a `GET /podcasts/stats/*`.
- Ambos con `requireAuth`, responden `200 { ok: true }` y operan solo con `req.authUser.id`.

**Alternativa descartada:** un único `DELETE /stats/me?scope=radio|podcast`. Obliga a acoplar dos servicios y dos routers para una operación que el usuario percibe como dos acciones distintas; además complica la validación y los tests de aislamiento.

### D2. Radio: borrado exacto y reinicio de la contabilidad en memoria

`StatsService.reset(userId)`:

1. Recorre las sesiones activas del usuario y descarta su estado acumulado: `pending.clear()`, `accountedMs = 0`, `startedAt`, `lastPulseAt` y `accountedUpTo` pasan a `now`, conservando el número de conexiones.
2. En una transacción, borra `user_station_stats_hourly` y `playback_sessions` del usuario.

Así el tiempo anterior no puede reaparecer en el siguiente volcado y una emisora que siga sonando empieza una sesión nueva desde el reinicio. Como `better-sqlite3` es síncrono y el servicio no hace `await` entre pasos, no hay ventana para un volcado intermedio. `history`, `favorites` y `custom_stations` no se tocan.

**Alternativa descartada:** borrar solo las filas y dejar las sesiones en memoria. El siguiente `flush()` volvería a persistir el tiempo anterior; el reinicio no sería real.

### D3. Podcasts: corte por usuario en lugar de borrar sesiones en vuelo

`PodcastStatsService.reset(userId)`:

1. En una transacción, borra `user_podcast_stats_hourly` del usuario.
2. Fija `users.podcast_stats_reset_at = now` (columna nueva, `INTEGER NOT NULL DEFAULT 0`).

Todas las consultas que leen `podcast_listen_sessions` (resumen, iniciados/completados, conteos por podcast, recientes y marca de completado de episodios) añaden `started_at >= podcast_stats_reset_at`. Las consultas de agregados ya quedan a cero porque se borran sus filas.

**Por qué no borrar `podcast_listen_sessions`:** el cliente envía `listenedMs` acumulado de toda la sesión. Si se elimina la fila de una sesión en curso, el siguiente reporte no encuentra base, interpreta todo el acumulado como delta y vuelve a sumar el tiempo anterior al reinicio. Mantener la fila conserva la base incremental (solo entra tiempo nuevo en los agregados) y el corte la oculta de resumen y recientes. Las filas antiguas siguen sujetas a la purga por retención (`PODCAST_STATS_RETENTION_DAYS`).

**Consecuencia asumida:** si el usuario reinicia mientras escucha un episodio, el tiempo posterior al reinicio sí aparece en evolución/top, pero esa sesión concreta (iniciada antes del corte) no cuenta como episodio iniciado ni aparece en recientes hasta que empiece otra sesión. Es coherente con "las sesiones anteriores al reinicio dejan de contabilizarse" y evita el doble conteo.

**Alternativa descartada:** borrar también las sesiones y guardar una base por sesión en otra tabla. Añade escrituras y complejidad para un caso límite que el corte resuelve sin tocar el flujo de progreso.

### D4. La marca de corte vive en `users`

Se añade `podcast_stats_reset_at` a `users` con migración Drizzle. Es un dato de ciclo de vida de las estadísticas del usuario, no una preferencia visible: `toPublicUser` no lo expone. Un valor `0` significa "sin reinicio" y no altera las consultas actuales. Se descarta una tabla dedicada porque solo hay un corte activo por usuario y una columna evita joins y estados huérfanos.

**Alternativa descartada:** tabla `user_stats_resets`. Más ceremonia (upsert, claves, migración) para un único entero que se lee junto al usuario.

### D5. UI en el perfil con confirmación reutilizada

- Nueva sección `Estadísticas de escucha` en `Profile.tsx`, extraída como componente presentacional `StatsResetSection` para poder probar sus textos y la ocultación de podcasts.
- Dos acciones independientes: `Reiniciar radio` y `Reiniciar podcasts`. La segunda solo se muestra si `config.features.podcasts` es `true`.
- Cada acción abre el `ConfirmDialog` existente con `destructive`, explicando qué se borra y qué se conserva. Mientras hay una petición en curso se deshabilitan ambos botones y el diálogo.
- Mutaciones con `api.delete<{ ok: true }>`: éxito → `toast.success` y `invalidateQueries` de `["stats"]` o `["podcast-stats"]` (solo la sección afectada); error → `toast.error` con el mensaje del servidor y sin cambios.
- No se guarda ningún estado nuevo en el perfil del usuario: el reinicio es una acción, no una preferencia.

**Alternativa descartada:** botones dentro de las páginas de estadísticas. El perfil es el lugar de gestión de la cuenta y evita mezclar acciones destructivas con los gráficos; además permite reiniciar una sección sin cargar la otra.

### D6. Documentación y contrato

Los dos endpoints se añaden a `apps/api/src/openapi.ts` (tag Estadísticas, `bearerAuth`, respuesta `{ ok: boolean }`, 401) y a la tabla de `docs/api.md`. No cambia ningún esquema de respuesta existente; el contrato sigue siendo aditivo.

## Risks / Trade-offs

- [Sesión de podcast en curso tras el reinicio] → El corte oculta la sesión anterior y evita recontar tiempo; se documenta en D3 y se cubre con un test de delta con la misma `sessionId`.
- [Filas antiguas de podcasts permanecen en la base] → No son visibles (corte por `started_at`) y se purgan con la retención configurada; no se añade borrado sincrónico para no romper la base incremental.
- [Reinicio de radio con varias conexiones simultáneas] → El estado se reinicia una vez por usuario+emisora y se conservan las conexiones; cada conexión seguirá enviando pulsos y solo contará desde `now`.
- [Consultas de podcasts con una lectura extra de `users`] → Una consulta indexada por PK por petición de estadísticas; impacto despreciable frente a los agregados existentes.
- [Usuario que espera borrar también el progreso de podcasts] → El diálogo y la especificación indican explícitamente que suscripciones, cola, descargas y progreso se conservan; si se quisiera un borrado total sería otro change.

## Migration Plan

1. Añadir la columna a `apps/api/src/db/schema.ts` y generar la migración Drizzle con `npm --workspace @tolocharadio/api run db:generate`.
2. Las migraciones se aplican al arrancar la API (`applyMigrations`); el valor por defecto `0` mantiene el comportamiento actual para usuarios existentes.
3. Despliegue estándar (`docker compose up --build -d`) y smoke con dos cuentas.
4. Rollback: revertir el change. La columna puede quedarse sin uso (no rompe versiones anteriores); no hay migración destructiva de datos.
