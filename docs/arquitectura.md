# Arquitectura

> [← Volver al README](../README.md)

## Requisitos

- Node.js >= 22 (se usa `.nvmrc`)
- npm >= 10
- (Opcional) Docker >= 24 para el despliegue en contenedor

## Vista general

Monorepo npm con workspaces:

```
apps/
├── api/    API REST Express 5 (TypeScript, zod, drizzle-orm + better-sqlite3, jose, bcryptjs)
└── web/    Interfaz React 19 (Vite, Tailwind 4, React Router, TanStack Query, Zustand)
```

La API sirve también el frontend compilado (`STATIC_DIR`). En desarrollo, Vite hace proxy de `/api` a la API.

## Componentes clave

- **Almacenamiento**: SQLite vía Drizzle (`users`, `refresh_tokens`, `password_reset_tokens`, `favorites`, `history`, `podcasts`, `podcast_episodes`, `podcast_subscriptions`, `podcast_progress`, `podcast_queue_*`, `podcast_favorites`, `podcast_listen_sessions`, `user_podcast_stats_hourly`).
- **Sesiones**: access token JWT (15 min) en memoria + cookie httpOnly `tolocha-refresh` rotatoria; refuerzo con cookie httpOnly `tolocha-access` para que el `<audio>` del reproductor pueda autenticarse.
- **Catálogo**: cliente con caché en memoria, `User-Agent`/`appname` `TolochaRadio`, degradación con servidor caído (caché si existe, 503 si no).

## Reproducción

El cliente mantiene un único `<audio>` gestionado por `PlaybackEngine` (`apps/web/src/lib/playbackEngine.ts`) y el store de Zustand; así la reproducción sobrevive a la navegación. El motor vigila el progreso, reconecta con espera creciente (0, 1, 2, 4, 8 y 15 s), refresca la sesión antes de reconectar y expone estados de conexión, reconexión y error.

El endpoint `GET /api/v1/playback/{stationId}/live` entrega siempre audio continuo:

- **Stream directo**: proxy transparente del origen.
- **Lista M3U/PLS**: resolución server-side y proxy del primer candidato reproducible.
- **HLS concatenable** (AAC-ADTS o MP3): el servidor resuelve el master, elige la variante y encadena los segmentos; renueva la sesión de origen cuando caduca (`404`/`410`) y alinea por `EXT-X-PROGRAM-DATE-TIME`. Si el contenedor no es concatenable (fMP4, MPEG-TS, cifrado) responde `415 HLS_UNSUPPORTED_CONTAINER`.
- **Atajo progresivo**: si la URL HLS es de StreamTheWorld (`/livestream-redirect/<MOUNT>.m3u8`), se prueba primero su variante `.aac`, que evita el HLS por completo.

Las rutas anteriores (`/playback/{id}`, `/playback/{id}/hls` y `/playback/{id}/status`) se mantienen intactas para clientes externos (por ejemplo la app Android).

## Podcasts

- **Ingesta**: `apps/api/src/services/podcasts/feedParser.ts` parsea RSS 2.0 + iTunes y Atom; `feedFetcher.ts` descarga con ETag/`304`, límite de 5 MB y validación SSRF en cada redirección (`lib/upstream.ts`). Los feeds y episodios se guardan en SQLite y se refrescan con backoff creciente (15 min, 1 h, 6 h, 24 h).
- **Descubrimiento**: proveedor configurable (`PODCAST_DISCOVERY_PROVIDER`: `itunes`, `podcastindex` o `none`). El alta manual por RSS y OPML funciona siempre.
- **Reproducción**: `POST /podcasts/episodes/{id}/playback` emite una URL firmada con HMAC-SHA256 (`userId + episodeId + exp`, TTL 6 h) y `GET /podcasts/episodes/{id}/stream` sirve audio progresivo con `Range` (`206`/`416`), en modo `proxy` o `redirect` (`PODCAST_STREAM_MODE`).
- **Progreso**: `podcast_progress` guarda posición y duración por episodio; los pulsos son idempotentes por `sequence` y se agregan en `user_podcast_stats_hourly` para las estadísticas.
- **Cola y favoritos**: `podcast_queue_state` mantiene una `revision` por usuario y `podcast_queue_items` el orden; `POST /podcasts/queue` añade o mueve un episodio (`next`/`end`) sin duplicarlo; `PUT /podcasts/queue/order` exige `baseRevision` y responde `409 QUEUE_CONFLICT` si está obsoleta; `DELETE /podcasts/queue` vacía la cola y conserva opcionalmente `keepEpisodeId`. El “en reproducción” es estado local del cliente: la cola del servidor no se modifica al reproducir y el episodio activo se oculta de la lista mientras suena. `podcast_favorites` guarda episodios favoritos.
- **Interfaz**: `AppShell` muestra el selector `Radio | Podcasts`; las portadas se renderizan con `referrerPolicy="no-referrer"` y `loading="lazy"`; cada fila de episodio ofrece reproducir/pausar y encolar a continuación o al final; la página de cola separa la tira “En reproducción” de los pendientes y permite vaciarla; el avance de cola se engancha a `onEpisodeEnded` del reproductor.

## Referencia rápida

| Tema | Documento |
| --- | --- |
| Instalación y arranque | [docs/instalacion.md](instalacion.md) |
| Despliegue con Docker | [docs/despliegue.md](despliegue.md) |
| API REST | [docs/api.md](api.md) |
| Desarrollo y release | [docs/desarrollo.md](desarrollo.md) |
| Licencia | [docs/licencia.md](licencia.md) |