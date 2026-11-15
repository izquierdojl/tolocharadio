# Proposal

## Why

La reproducción de podcasts bajo demanda tiene requisitos técnicos distintos de la radio en vivo: los episodios duran más que el token de acceso de 15 minutos, requieren peticiones `Range` (`206`/`416`) para avanzar o retroceder (*seek*), necesitan guardar y reanudar la posición de escucha y no deben reconectar en bucle al llegar al evento `ended`. Este change introduce el motor de reproducción bajo demanda en backend y frontend junto con la persistencia idempotente de progreso y sesiones de escucha.

## What Changes

- **Token de reproducción firmado (HMAC-SHA256)**: endpoint `POST /api/v1/podcasts/episodes/:episodeId/playback` que emite una URL de streaming firmada con ámbito `userId + episodeId + exp` y TTL configurable (`6h` por defecto), apta para `<audio>` web y `Media3/ExoPlayer` en Android sin depender del access token de 15 minutos.
- **Streaming de episodios con soporte `Range`**: endpoint `GET /api/v1/podcasts/episodes/:episodeId/stream` (y `HEAD`) autenticado mediante la firma del token de reproducción, con soporte de `206 Partial Content`, propagación de `416 Range Not Satisfiable` y modo configurable `PODCAST_STREAM_MODE=proxy|redirect`.
- **Progreso y sesiones de escucha idempotentes**: tablas `podcast_progress`, `podcast_listen_sessions` y `user_podcast_stats_hourly`, y endpoints `GET/PUT/POST /api/v1/podcasts/episodes/:episodeId/progress` que actualizan la posición del episodio, marcan completado (al llegar al final o `>= 95 %` de posición con `>= 80 %` escuchado) y acumulan deltas de tiempo de contenido en cubos horarios.
- **Generalización del motor de reproducción en `apps/web`**:
  - `PlaybackEngine` y `usePlayerStore` pasan a soportar un modelo discriminado `NowPlaying` (`radio` | `podcast`) compartiendo un único elemento `<audio>` y el volumen global.
  - En modo `podcast`, el motor expone `currentTime`, `duration`, `seek`, `skip(±15s / ±30s)` y `playbackRate` (`1x`–`2x`), preserva la posición ante microcortes, reporta progreso periódicamente (cada 10–15 s, en pausa, seek, cierre de pestaña y fin) y trata `ended` como fin natural del episodio en lugar de fallo de stream.
  - `PlayerBar` incorpora badge **EN DIRECTO** vs **PODCAST**, barra de progreso interactiva, tiempos, saltos, selector de velocidad e integración con `Media Session API`.

## Capabilities

### New Capabilities
- `podcast-playback`: emisión y validación de tokens de reproducción firmados para episodios, streaming HTTP con soporte de rangos (`206`/`416`), registro idempotente de progreso y sesiones de escucha, y controles de reproducción bajo demanda en el reproductor persistente (`seek`, saltos, velocidad, reanudación y Media Session).

### Modified Capabilities

## Impact

- **Backend (`apps/api`)**:
  - Nuevas tablas `podcast_progress`, `podcast_listen_sessions` y `user_podcast_stats_hourly` en `src/db/schema.ts` y migración Drizzle.
  - Nuevos servicios `src/services/podcasts/playbackToken.ts` y `src/services/podcasts/progress.ts`.
  - Nuevas rutas de playback, stream y progreso en `src/routes/podcasts.ts` y esquemas en `src/openapi.ts`.
- **Frontend (`apps/web`)**:
  - Evolución de `src/lib/playbackEngine.ts`, `src/stores/player.ts` y `src/components/PlayerBar.tsx` (más controles específicos en `src/components/podcasts/EpisodePlayerControls.tsx`).
