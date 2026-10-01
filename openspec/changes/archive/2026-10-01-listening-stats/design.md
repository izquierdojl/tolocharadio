# Design

## Context

Ver `proposal.md` — Why. Estado actual relevante para el enfoque:

- **Todo el audio pasa por el proxy autenticado** (`apps/api/src/routes/playback.ts`): `GET /playback/:stationId` para directo, `.m3u`/`.pls` (ganador de la lista) y manifiesto `.m3u8`; `GET /playback/:stationId/hls` para subrecursos (variantes, segmentos, mapas, claves). `pipeOrigin()` centraliza la retransmisión de bytes de audio (directo, candidato de lista y segmentos HLS) sobre `Readable.pipe(res)`, con backpressure natural. `GET /playback/:stationId/status` es un precheck de disponibilidad.
- **Identidad y metadatos disponibles**: `requireAuth` deja `req.authUser` en todas las rutas; `ctx.stations.getStation()` devuelve el `Station` normalizado con `tags[]`, `country`, `countryCode`, `favicon` (`services/normalize.ts`), y las emisoras personalizadas también se resuelven por esa vía.
- **Persistencia**: SQLite + Drizzle con migraciones en `apps/api/drizzle` aplicadas al arrancar (`db/migrate.ts`); servicios instanciados en `factory.ts` y expuestos en `AppContext`; ciclo de vida en `index.ts` (listen + `shutdown()`).
- **Tests**: vitest + supertest, DB `:memory:` con migraciones reales (`test/helpers.ts`), `vi.stubGlobal("fetch")` para simular orígenes.
- **Historial existente**: `history` guarda solo la última reproducción por usuario+emisora y sin duración; no se toca ni se reutiliza para estadísticas.

## Goals / Non-Goals

**Goals:**

- Medir tiempo de escucha con precisión razonable (pausas y atascos no inflan) sin modificar clientes ni añadir latencia perceptible al streaming.
- Acumulados durables y consultables por franja local, con coste de escritura pequeño y periódico.
- Contrato de consulta personal, aditivo y documentado en OpenAPI.
- Cálculo de días/horas correcto en `Europe/Madrid`, incluidos los cambios de hora.

**Non-Goals:**

- UI y gráficos (change posterior); agregados globales, oyentes únicos o datos de terceros.
- Borrado de estadísticas por el usuario y poda de tablas (decisiones futuras).
- Exactitud multi-instancia (varias réplicas compartiendo el mismo usuario).
- Instrumentación de clientes (web o apps externas).

## Decisions

### D1. Punto único de instrumentación: el flujo de bytes

El pulso se marca donde fluyen bytes de audio, no donde se abre la conexión:

- `pipeOrigin()` gana un callback `onBytes` que se invoca por cada chunk leído del origen y antes de escribirlo al cliente. Cubre directo, ganador de lista y segmentos HLS sin duplicar lógica.
- Los manifiestos HLS y los subrecursos que no son audio no generan pulso por sí mismos; el siguiente segmento lo hará en pocos segundos. `/playback/:stationId/status` nunca lo genera.
- Un pulso es una actualización O(1) en memoria (timestamp en un `Map`), síncrona y sin `await`: no altera el throughput del pipe.

Con backpressure, si el cliente pausa y deja de consumir, `pipe` deja de leer del origen y dejan de llegar `onBytes`; al reanudar, el flujo y los pulsos vuelven. No hace falta conocer el estado del `<audio>` del cliente.

**Alternativa descartada**: que el cliente envíe latidos por API (requeriría cambiar clientes, justo lo que se quiere evitar) o contar tiempo de conexión abierta (contaría pausas en directo).

### D2. Sesión en memoria y contabilidad por intervalos entre pulsos

Clave de sesión: `userId + stationId` (fusiona pestañas/dispositivos del mismo usuario y emisora). Estado:

```
session {
  key, userId, station, source, startedAt,
  lastPulseAt,       // instante del ultimo chunk
  accountedUpTo,     // hasta que instante ya se convirtio en duracion
  accountedMs,       // duracion acumulada total (para la sesion cruda)
  pending,           // Map<bucket, ms> pendiente de escribir en SQLite
  connections        // conexiones directas/listas abiertas (HLS: 0)
}

pulso (chunk o peticion de segmento):
  session.lastPulseAt = now

tick de volcado (cada STATS_FLUSH_INTERVAL, defecto 30 s):
  gap = min(lastPulseAt - accountedUpTo, STATS_PULSE_CAP, defecto 15 s)
  accountedMs += gap ; pending[bucket(lastPulseAt)] += gap
  accountedUpTo = lastPulseAt
  UPSERT incremental de pending por bucket y vaciarlo

cierre de conexion directo/lista (connections llega a 0):
  gap = min(now - accountedUpTo, CAP)   // ultimo tramo real de flujo
  accountar, persistir resto, cerrar sesion (insertar playback_sessions)

timeout de inactividad HLS (sin pulsos durante STATS_HLS_IDLE, defecto 60 s):
  persistir pendiente y cerrar; NO se acredita el hueco de inactividad
```

- El tope `STATS_PULSE_CAP` acota el sobreconteo de un atasco: entre dos pulsos nunca se acredita más que el tope. Con chunks/segmentos de pocos segundos, la distorsión es de segundos.
- El mapa `pending` por bucket evita el doble conteo entre volcados parciales y cierre, y atribuye cada tramo a su hora local real aunque un volcado se retrase.
- Sesiones con duración acreditada 0 no se insertan en `playback_sessions` (no hubo escucha real).
- El `Map` está acotado por conexiones activas; un barrido del tick cierra sesiones viejas sin conexiones ni pulsos (defensa ante fugas).

**Alternativas descartadas**: actualizar SQLite en cada chunk (coste inútil), sesión por conexión (duplicaría pestañas y complica el cierre), cronómetro con `setTimeout` por sesión (frágil ante reinicios y pausas).

### D3. Esquema de datos

Dos tablas nuevas (migración aditiva, sin backfill):

```
playback_sessions                        user_station_stats_hourly
+--------------------------------+       +--------------------------------------+
| id INTEGER PK autoincrement    |       | user_id    }                         |
| user_id FK users ON DELETE     |       | station_id } PK compuesta            |
|   CASCADE                      |       | bucket     }  'YYYY-MM-DDTHH' local  |
| station_id TEXT                |       | total_ms INTEGER NOT NULL            |
| snapshot TEXT (Station JSON)   |       +--------------------------------------+
| source TEXT (direct|playlist|hls)      index (user_id, bucket)
| started_at INTEGER (epoch ms)  |
| ended_at INTEGER (epoch ms)    |       (el snapshot no se duplica aqui;
| duration_ms INTEGER            |        top/genero/pais lo leen de sesiones)
+--------------------------------+
index (user_id, started_at)
```

- **Snapshot en la sesión** (como hace `history`): una escucha es autocontenida y sirve para `#1`, `#4` y `#5` sin depender de que la emisora siga existiendo en Radio Browser.
- **El acumulador horario** da atribución exacta a cada hora local y permite `#2` y `#3` aunque en el futuro se pode la tabla de sesiones (hoy no se poda).
- **Sesiones se insertan al cerrar** (no al abrir): una fila siempre es completa (`ended_at`, `duration_ms`); un reinicio no deja filas abiertas huérfanas. El acumulador ya tiene el tiempo volcado, así que un cierre abrupto pierde a lo sumo el intervalo en curso.
- `user_id` con FK a `users` y `ON DELETE CASCADE`: borrar la cuenta borra sus estadísticas.

### D4. Ciclo de volcado y apagado

- `StatsService` se instancia en `factory.ts` y se expone en `AppContext`. El ticker (`setInterval(...).unref()`) lo arranca y para `index.ts` (`stats.start()` tras crear el contexto; `stats.stop()` en `shutdown()` antes de cerrar SQLite, con volcado final).
- En tests, `createContext` no arranca el ticker: las rutas pulsan en memoria y los tests llaman a `ctx.stats.flush()` de forma determinista antes de consultar; también pueden forzar cierres con `ctx.stats.closeAll()`.
- Los UPSERT del volcado son incrementales (`total_ms = total_ms + ?`) y `better-sqlite3` es síncrono, así que no hay carrera entre volcado y consulta.

### D5. Zona horaria y buckets

- `STATS_TIMEZONE` (IANA, por defecto `Europe/Madrid`), validada al cargar la config con `Intl.DateTimeFormat` (si no es válida, error de config como el resto).
- El bucket del acumulador es texto local `YYYY-MM-DDTHH` calculado con `Intl` al volcar. Los rangos se filtran lexicográficamente (`substr(bucket,1,10) BETWEEN from AND to`), sin aritmética de zonas.
- Para agregados que leen sesiones (`#4`, `#5`) y para la evolución con granularidad semanal/mensual, un helper convierte fecha local ↔ epoch con `Intl` (soporta días de 23/25 h por DST). Tests con fechas de cambio de hora.
- Convención de semana: lunes = 0 … domingo = 6 (ISO), documentada en OpenAPI.

### D6. Contrato de consulta (`/api/v1/stats/me/*`)

Todos requieren JWT (`requireAuth`) y filtran por `user.id`. Parámetros `from`/`to` son fechas locales `YYYY-MM-DD` inclusivas; `limit` acotado; parámetros inválidos → error estándar (`400 INVALID_PARAMS`).

| Endpoint | Respuesta | Defaults |
|---|---|---|
| `GET /stats/me/top?from&to&limit` | `{ items: [{ station, totalMs }] }` orden desc | todo el histórico, `limit=10` (máx 50) |
| `GET /stats/me/timeline?from&to&granularity` | `{ granularity, items: [{ bucket, totalMs }] }` con días sin actividad a 0 | últimos 30 días, `day`; `week`/`month` |
| `GET /stats/me/habits?from&to` | `{ items: [{ weekday, hour, totalMs }] }` (disperso) | todo el histórico |
| `GET /stats/me/genres?from&to&limit` | `{ items: [{ genre, totalMs }] }` (multietiqueta suma en cada género) | todo el histórico, `limit=10` |
| `GET /stats/me/countries?from&to` | `{ items: [{ country, countryCode, totalMs }] }` | todo el histórico |
| `GET /stats/me/recent?limit` | `{ items: [{ station, startedAt, durationMs }] }` orden desc | `limit=50` (máx 200) |

- `#1`, `#2` y `#3` agregan el acumulador horario; `#4` y `#5` leen sesiones (necesitan el snapshot). Diferencias de segundos entre vistas son posibles ante un cierre abrupto; se documenta y es aceptable.
- `top`/`genres` resuelven nombre/favicon del snapshot más reciente por emisora del usuario.
- Etiquetas/campos ausentes se agrupan en `"desconocido"`.
- Reutiliza el formato de respuesta existente (`{ items }` como `history`), sin paginación nueva.

### D7. Configuración

Nuevas variables en `config/env.ts` con default seguro (sin obligar a tocar `.env`):

- `STATS_TIMEZONE` = `Europe/Madrid`
- `STATS_FLUSH_INTERVAL_MS` = `30000`
- `STATS_PULSE_CAP_MS` = `15000`
- `STATS_HLS_IDLE_MS` = `60000`

Se documentan en `docs/`/`.env.example` si el repo los usa; los tests pueden sobreescribirlas como el resto (`testConfig`).

### D8. Instrumentación en `playback.ts`

- `pipeOrigin(res, origin, onError, onBytes)`; los tres caminos que emiten audio (directo, candidato de lista y segmentos HLS) pasan `onBytes = () => ctx.stats.pulse(user.id, station, source)`.
- `startListening`/`endListening` (contador de conexiones) solo en directo y listas. El manifiesto HLS y los segmentos HLS solo pulsan (sin contador): la sesión se cierra por inactividad, y un manifiesto abandonado sin segmentos no genera escucha (duración acreditada 0).
- El `source` lo fija cada camino (`direct`, `playlist`, `hls`), sin lógica nueva de detección.
- El registro de historial (`ctx.history.record`) no se toca.

### D9. OpenAPI

Los seis endpoints se documentan en `apps/api/src/openapi.ts` con `bearerAuth`, parámetros y esquemas de respuesta, manteniendo el contrato aditivo y el test `openapi.test.ts`.

## Risks / Trade-offs

- [Sobreconteo acotado por atascos] → tope `STATS_PULSE_CAP` (15 s) entre pulsos; con chunks/segmentos de segundos, error despreciable.
- [Subconteo del último tramo HLS al pausar] → el tramo final solo se acredita si hay siguiente pulso o cierre de conexión; sesgo de segundos.
- [Reinicio de la API] → se pierde a lo sumo el intervalo de volcado en curso (≤30 s por sesión); el acumulador persistido hasta el último tick se conserva.
- [Varias réplicas] → la fusión de conexiones simultáneas es por instancia; en self-hosted (una instancia) no aplica. El acumulador es aditivo y no se corrompe.
- [Reloj/zona horaria] → helpers con `Intl` y tests de DST; el bucket local evita comparaciones de zonas en SQL.
- [Crecimiento de tablas] → dato personal y pequeño; sin poda por decisión de alcance. Si crece, el acumulador ya permite podar sesiones sin perder agregados.
- [Impacto en streaming] → pulso síncrono O(1) en memoria; sin awaits ni I/O en el camino del pipe; el volcado corre en un ticker aparte.

## Migration Plan

1. `npm --workspace @tolocharadio/api run db:generate` tras editar `schema.ts` → migración nueva en `apps/api/drizzle/`.
2. El arranque aplica migraciones (`applyMigrations`); la migración es aditiva y no bloquea.
3. Despliegue con `docker compose up --build -d`; sin backfill: las estadísticas empiezan vacías desde el primer uso.
4. Rollback: revertir la imagen; las tablas nuevas quedan inertes (o `DROP TABLE` manual si se quiere limpiar). No hay cambios destructivos.

## Open Questions

- ¿Conviene un interruptor `STATS_ENABLED` (como `REGISTRATION_ENABLED`) para desplegar sin captura? No se incluye en este change; si se pide, es un añadido pequeño y aditivo sobre el mismo esquema.
- ¿Debe el usuario poder borrar sus estadísticas? Hoy queda fuera de alcance; encaja como endpoint futuro (`DELETE /stats/me`) sin tocar el esquema.
