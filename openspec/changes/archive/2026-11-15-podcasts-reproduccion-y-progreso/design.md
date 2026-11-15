# Design

## Context

Ver `proposal.md` para la motivación. En la arquitectura actual:
- El access token JWT y la cookie `tolocha-access` caducan a los 15 minutos (`apps/api/src/routes/auth.ts`).
- `apps/api/src/routes/playback.ts` envía `Range: (req.headers.range as string) || ""` y convierte cualquier estado no 2xx (incluido `416`) en `503`.
- `apps/web/src/lib/playbackEngine.ts` trata `ended` como caída del stream en vivo (`this.recover()`) y al reconectar sobreescribe `audio.src`, perdiendo `currentTime`.

## Goals / Non-Goals

**Goals:**
- Permitir reproducir y hacer *seek* en episodios de varias horas sin caducidad de sesión ni cabeceras custom en `<audio>` o `ExoPlayer`.
- Registrar posición de reanudación, sesiones de escucha y cubos horarios de forma idempotente desde el primer día.
- Extender `PlaybackEngine`, `usePlayerStore` y `PlayerBar` con soporte `ondemand` sin degradar la fiabilidad de la radio en vivo.

**Non-Goals:**
- Reescritura HLS para podcasts y descargas offline (fuera del MVP; casi todos los podcasts usan MP3/M4A/AAC/OGG progresivo).
- UI de cola, favoritos y páginas de exploración de podcasts (se abordan en el Change 3).
- Endpoints de consulta y gráficos de estadísticas (se abordan en el Change 4, aunque este change ya alimenta las tablas).

## Decisions

### D1. Token de reproducción firmado sin estado (`playbackToken.ts`)
- **Decisión**: firmar con HMAC-SHA256 usando una clave derivada de `jwtAccessSecret` con contexto `"tolocharadio/podcast-playback/v1"` (mismo patrón criptográfico y `timingSafeEqual` que `apps/api/src/lib/hls.ts`), sobre `${userId}\n${episodeId}\n${exp}`. TTL por defecto: `6h` (`PODCAST_PLAYBACK_TOKEN_TTL=6h`).
- **Por qué**: evita alargar el access token general de la API, funciona de forma idéntica en `<audio>` web y en `Media3/ExoPlayer` de Android, y no requiere estado en base de datos.

### D2. Endpoint de stream dedicado con soporte de rangos reales
- **Decisión**: crear `GET` y `HEAD /api/v1/podcasts/episodes/:episodeId/stream` separado de `/playback/:stationId`. Solo incluye la cabecera `Range` hacia el origen si el cliente la envió; propaga `200`, `206` y `416` tal cual junto con `Content-Range`, `Accept-Ranges`, `Content-Length` y `Content-Type`. No invoca `ctx.stats.pulse` ni `ctx.history.record` (que son exclusivos de radio).
- **Modo configurable**: `PODCAST_STREAM_MODE=proxy` por defecto (privacidad de IP y sin problemas de CORS/mixed-content); `redirect` (`302`) disponible como opción para ahorrar ancho de banda.

### D3. Contabilidad híbrida e idempotente en `PUT/POST /progress`
- **Decisión**: el cliente genera un `sessionId` (UUID) al arrancar la reproducción de un episodio y envía `listenedMs` **acumulativo de esa sesión** (tiempo de contenido consumido: avance real de `currentTime` mientras suena, sin contar saltos *seek* hacia delante) más un contador monótono `sequence`.
- En una transacción SQLite corta:
  1. Se hace *upsert* en `podcast_listen_sessions` por `(user_id, client_session_id)`. Si `sequence <= last_sequence`, se ignora el delta.
  2. Se calcula `delta = clamp(listenedMs, anterior, maxSessionMs) - anterior`.
  3. Se actualiza `podcast_progress(user_id, episode_id)` con `position_sec`, `duration_sec` y `completed_at`.
  4. Si `delta > 0`, se suma en `user_podcast_stats_hourly(user_id, episode_id, bucket)` usando `zonedBucket(occurredAt, statsTimezone)`.

### D4. Generalización de `PlaybackEngine` y `usePlayerStore`
- **Decisión**: introducir un tipo discriminado `PlayableItem`:
  - `{ kind: "radio", station: Station }`
  - `{ kind: "podcast", episode: PodcastEpisode, podcast: PodcastSummary, initialPositionSec?: number }`
- En `PlaybackEngine`:
  - Cuando `kind === "podcast"`, `onEnded` no llama a `recover()`, sino que notifica `onEpisodeEnded()` para que el store marque completado (y en el Change 3 avance la cola).
  - Si ocurre un error de red transitorio durante un podcast y `recover()` reconecta (renovando el token de playback si hubiera expirado), el motor recuerda el último `currentTime` y `playbackRate` y los restaura al dispararse `loadedmetadata`.

## Risks / Trade-offs

- **[Pérdida del último tramo al cerrar la pestaña]** → Se envía progreso cada 12 s, en `pause`, en `seeked`, en `ended` y al escuchar `visibilitychange`/`pagehide` mediante `fetch(..., { keepalive: true })` contra el alias `POST /progress`.
- **[Regresión en reproducción de radio]** → Los tests existentes de `playbackEngine.test.ts` y `playback.test.ts` se mantienen intactos para el modo `radio`, añadiendo una suite paralela para el modo `podcast`.

## Migration Plan

1. Migración Drizzle añadiendo `podcast_progress`, `podcast_listen_sessions` y `user_podcast_stats_hourly`.
2. Despliegue retrocompatible: mientras `PODCASTS_ENABLED=false` o se reproduzca una emisora, `PlayerBar` se comporta exactamente igual que hoy.
