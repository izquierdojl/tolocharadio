# Proposal

## Why

TolochaRadio actualmente solo soporta radio en vivo y carece de un catálogo de podcasts y episodios bajo demanda. Este primer change establece los cimientos del backend para podcasts: el modelo de datos global y de suscripciones por usuario, la ingesta segura de feeds RSS/Atom con protección SSRF, el descubrimiento configurable (`itunes`, `podcastindex`, `none`), la importación/exportación OPML y la exposición de capacidades y límites en `/api/v1/config` para clientes web, escritorio y Android.

## What Changes

- **Extensión de `/api/v1/config`**: añade `version`, `apiVersion`, `features` (`radio`, `podcasts`, `podcastDiscovery`, `podcastOpml`, `podcastQueue`, `podcastFavorites`, `podcastStats`, `podcastDownloads`), `limits` (`podcastQueueMax`, `podcastSubscriptionsMax`, `podcastFeedMaxBytes`, `podcastEpisodesPageSize`, `podcastOpmlMaxFeeds`) y `auth` (`accessTokenTtlSec`, `playbackTokenTtlSec`).
- **Guardia SSRF en `upstream.ts`**: validación de URLs (`http`/`https`, puertos permitidos) y bloqueo de resolución DNS hacia rangos privados, loopback, link-local y metadatos cloud en cada salto de redirección.
- **Esquema SQLite/Drizzle de catálogo y suscripciones**: tablas `podcasts`, `podcast_episodes` y `podcast_subscriptions` con deduplicación global por `feed_url` y `(podcast_id, guid)`.
- **Ingesta, parser y scheduler de feeds**: parser RSS 2.0 (+ namespace iTunes) y Atom mediante `fast-xml-parser`, fetcher con soporte `ETag`/`Last-Modified` (`304 Not Modified`), límite de 5 MB por feed, retención de hasta 500 episodios no referenciados y refresco periódico con *single-flight* y backoff exponencial.
- **Endpoints de catálogo, descubrimiento, suscripciones y OPML**:
  - `GET /api/v1/podcasts/search?q=...`
  - `POST /api/v1/podcasts/resolve`
  - `GET /api/v1/podcasts/subscriptions`, `POST /api/v1/podcasts/subscriptions`, `POST /api/v1/podcasts/subscriptions/bulk`, `DELETE /api/v1/podcasts/subscriptions/:podcastId`
  - `GET /api/v1/podcasts/subscriptions/opml`
  - `GET /api/v1/podcasts/:podcastId` y `GET /api/v1/podcasts/:podcastId/episodes`
- **Gobierno por feature flag**: cuando `PODCASTS_ENABLED=false` (valor por defecto en esta fase de cimientos sin UI), las rutas `/api/v1/podcasts/*` responden `403 PODCASTS_DISABLED`.

## Capabilities

### New Capabilities
- `podcast-catalog`: descubrimiento de podcasts (`itunes`, `podcastindex`, `none`), resolución e ingesta segura de feeds RSS/Atom con protección SSRF, refresco periódico, gestión de suscripciones por usuario, importación/exportación OPML y consulta paginada de shows y episodios.

### Modified Capabilities
- `public-api`: el endpoint público `GET /api/v1/config` se amplía con capacidades (`features`), límites operativos (`limits`), tiempos de vida de autenticación (`auth`) y versión de la API/aplicación.

## Impact

- **Backend (`apps/api`)**:
  - Nuevas variables de entorno en `src/config/env.ts` (`PODCASTS_ENABLED`, `PODCAST_DISCOVERY_PROVIDER`, `PODCAST_FEED_MAX_BYTES`, `PODCAST_REFRESH_INTERVAL_MS`, `PODCAST_PLAYBACK_TOKEN_TTL`, `PODCASTINDEX_API_KEY`, `PODCASTINDEX_API_SECRET`).
  - Nueva dependencia de producción `fast-xml-parser` en `apps/api/package.json`.
  - Nuevas tablas y migración Drizzle en `src/db/schema.ts` y `drizzle/`.
  - Protección SSRF en `src/lib/upstream.ts`.
  - Nuevos servicios en `src/services/podcasts/` (`feedParser.ts`, `feedFetcher.ts`, `catalog.ts`, `subscriptions.ts`, `discovery.ts`, `refreshScheduler.ts`) y rutas en `src/routes/podcasts.ts`.
  - Documentación OpenAPI actualizada en `src/openapi.ts`.
- **Frontend (`apps/web`)**:
  - Actualización del tipo `PublicConfig` en `src/lib/types.ts` (cambios aditivos compatibles).
