# Tasks

## 1. Esquema de datos y migración

- [x] 1.1 Añadir a `apps/api/src/db/schema.ts` las tablas `playbackSessions` (FK `user_id` a `users` con `ON DELETE CASCADE`, snapshot y source, índices `(user_id, started_at)`) y `userStationStatsHourly` (PK compuesta `user_id, station_id, bucket`, índice `(user_id, bucket)`); verificar que `npm --workspace @tolocharadio/api run db:generate` genera una migración nueva sin errores y que `npm run typecheck` pasa.
- [x] 1.2 Cubrir la migración y su semántica en `apps/api/test/db.test.ts`: UPSERT incremental de `total_ms` por bucket y borrado en cascada de las estadísticas al eliminar el usuario; verificar con `npm --workspace @tolocharadio/api test`.

## 2. Configuración y utilidades de tiempo local

- [x] 2.1 Añadir `STATS_TIMEZONE` (default `Europe/Madrid`), `STATS_FLUSH_INTERVAL_MS` (`30000`), `STATS_PULSE_CAP_MS` (`15000`) y `STATS_HLS_IDLE_MS` (`60000`) a `apps/api/src/config/env.ts`, validando que la zona es IANA válida con `Intl`; verificar con casos válido/inválido en `apps/api/test/config.test.ts`.
- [x] 2.2 Implementar en `apps/api/src/lib/time.ts` los helpers de zona local (epoch → bucket `YYYY-MM-DDTHH`, inicio/fin de día local → epoch, weekday ISO lunes=0) usando `Intl`; verificar con tests unitarios de límites de día y de cambios de hora (DST) en `apps/api/test/`.
- [x] 2.3 Documentar las variables nuevas en `.env.example` y en la tabla de `docs/instalacion.md`, con los mismos valores por defecto que `EnvSchema`; verificar que lo documentado coincide con `loadConfig()`.

## 3. Servicio de captura y volcado

- [x] 3.1 Implementar `StatsService` en `apps/api/src/services/stats.ts` con `pulse`, `startListening`, `endListening` y `now()` inyectable: sesión fusionada por usuario+emisora, contabilidad por intervalos entre pulsos con tope y cierre al llegar a cero conexiones; verificar con tests unitarios de flujo continuo, pausa (sin pulsos), fusión de conexiones simultáneas y tope de atasco.
- [x] 3.2 Implementar `flush()` con cursor `flushedMs`, UPSERT incremental del acumulador horario e inserción de `playback_sessions` al cerrar (snapshot, source, inicio, fin y duración; no se insertan sesiones con duración 0); verificar con tests de varios volcados sin doble conteo y de cierre con resto pendiente.
- [x] 3.3 Implementar el cierre por inactividad HLS, el barrido de sesiones sin actividad, `closeAll()` y `stop()` con volcado final; verificar con tests de timeout de inactividad y de persistencia al parar.
- [x] 3.4 Arrancar y parar el ticker en `apps/api/src/index.ts` (`setInterval(...).unref()`) y volcar en `shutdown()` antes de cerrar SQLite; verificar que `stop()` persiste el pendiente (test unitario) y que `npm run build` compila.

## 4. Consultas y endpoints personales

- [x] 4.1 Implementar en `StatsService` las consultas de emisoras más escuchadas (top con snapshot más reciente por emisora) y escuchas recientes (orden descendente con límite); verificar con tests unitarios de orden, límite y usuario sin datos.
- [x] 4.2 Implementar la evolución temporal (granularidad `day`/`week`/`month` con relleno de ceros) y los hábitos por hora local y día de la semana (weekday ISO); verificar con tests de agregación, rangos y DST.
- [x] 4.3 Implementar el desglose por género y país desde las sesiones (etiquetas con `json_each`, una emisora suma en cada género, categoría `"desconocido"` si faltan metadatos); verificar con tests de multietiqueta, emisora sin metadatos y rango vacío.
- [x] 4.4 Crear `apps/api/src/routes/stats.ts` con los seis endpoints `GET /stats/me/{top,timeline,habits,genres,countries,recent}`, `requireAuth`, validación de `from`/`to`/`limit`/`granularity` con errores estándar, y su cableado en `context.ts`, `factory.ts` y `app.ts`; verificar con tests de ruta de contrato, defaults, parámetros inválidos y 401.
- [x] 4.5 Verificar el aislamiento entre usuarios: dos cuentas con escuchas distintas solo reciben sus propios datos en los seis endpoints, con test de ruta.

## 5. Instrumentación del proxy de playback

- [x] 5.1 Añadir el callback `onBytes` a `pipeOrigin` y pulsar en directo, listas y manifiesto HLS, registrando conexiones con `startListening`/`endListening` en los cierres existentes; verificar con tests de ruta que tras reproducir y cerrar, `ctx.stats.flush()` deja datos visibles en `/stats/me/recent` y `/stats/me/top`.
- [x] 5.2 Pulsar en los subrecursos `/playback/:stationId/hls` (sin contador de conexiones) y comprobar que `/playback/:stationId/status` no genera ninguna escucha; verificar con tests de ruta.
- [x] 5.3 Comprobar que no hay regresión en reproducción ni historial: `playback.test.ts` y `history.test.ts` siguen en verde con `npm --workspace @tolocharadio/api test`.

## 6. OpenAPI y documentación de la API

- [x] 6.1 Documentar los seis endpoints en `apps/api/src/openapi.ts` (bearerAuth, parámetros con defaults y esquemas de respuesta) y añadirlos a la tabla de `docs/api.md`; verificar ampliando `apps/api/test/openapi.test.ts` y con `npm --workspace @tolocharadio/api test`.

## 7. Verificación integral

- [x] 7.1 Ejecutar en la raíz `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`, y confirmar que todo pasa.
- [x] 7.2 Levantar `docker compose up --build -d` y hacer smoke autenticado: reproducir una emisora unos segundos, pausar, y comprobar que `/stats/me/recent`, `/stats/me/top` y `/stats/me/timeline` reflejan tiempo; que la pausa no acumula; y que el acumulado sobrevive a un reinicio del contenedor.
