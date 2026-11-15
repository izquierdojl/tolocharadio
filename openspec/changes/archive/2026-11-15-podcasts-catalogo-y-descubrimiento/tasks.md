# Tasks

## 1. Configuración, `/config` extendido y protección SSRF

- [x] 1.1 Añadir `fast-xml-parser` a `apps/api/package.json` y las variables de entorno de podcasts (`PODCASTS_ENABLED`, `PODCAST_DISCOVERY_PROVIDER`, `PODCAST_FEED_MAX_BYTES`, `PODCAST_REFRESH_INTERVAL_MS`, `PODCAST_PLAYBACK_TOKEN_TTL`, `PODCASTINDEX_API_KEY`, `PODCASTINDEX_API_SECRET`) en `apps/api/src/config/env.ts` y `.env.example`, verificando con `npm run typecheck -w @tolocharadio/api`.
- [x] 1.2 Extender `GET /api/v1/config` (`apps/api/src/routes/config.ts`), `apps/api/src/openapi.ts` y `PublicConfig` en `apps/web/src/lib/types.ts` con `version`, `apiVersion`, `features`, `limits` y `auth`, y verificar que los tests en `apps/api/test/config.test.ts` y `apps/api/test/openapi.test.ts` pasan.
- [x] 1.3 Implementar la guardia SSRF (validación de esquemas, puertos y bloqueo de resolución DNS a IPs privadas, loopback, link-local y metadatos cloud en cada salto de redirección) en `apps/api/src/lib/upstream.ts`, y verificarla con tests unitarios en `apps/api/test/upstream.test.ts`.

## 2. Esquema de base de datos, parser RSS/Atom y fetcher

- [x] 2.1 Definir las tablas `podcasts`, `podcast_episodes` y `podcast_subscriptions` con sus índices en `apps/api/src/db/schema.ts`, generar la migración en `apps/api/drizzle/` y verificar que las migraciones se aplican en memoria en los tests de API.
- [x] 2.2 Implementar `apps/api/src/services/podcasts/feedParser.ts` (soporte RSS 2.0 + namespace iTunes y Atom, normalización de fechas/duraciones/URLs/imágenes `http(s)` y `guid` determinista de respaldo) y verificarlo con fixtures en `apps/api/test/podcasts-parser.test.ts`.
- [x] 2.3 Implementar `apps/api/src/services/podcasts/feedFetcher.ts` con soporte condicional `ETag`/`Last-Modified` (`304`), límite de bytes `PODCAST_FEED_MAX_BYTES` y guardia SSRF, verificando el comportamiento con tests en `apps/api/test/podcasts-fetcher.test.ts`.

## 3. Catálogo, suscripciones, OPML, descubrimiento y scheduler

- [x] 3.1 Implementar `apps/api/src/services/podcasts/catalog.ts` y `subscriptions.ts` (ingesta transaccional por lotes, poda de más de 500 episodios preservando los referenciados, alta/baja/listado de suscripciones con límite 200 e importación/exportación OPML) y verificarlo con tests de servicio.
- [x] 3.2 Implementar `apps/api/src/services/podcasts/discovery.ts` (`itunes`, `podcastindex`, `none`) con caché en `CacheService`, y `refreshScheduler.ts` (*single-flight*, concurrencia limitada y backoff exponencial), verificándolos con tests unitarios.
- [x] 3.3 Exponer las rutas en `apps/api/src/routes/podcasts.ts` (`/podcasts/search`, `/podcasts/resolve`, `/podcasts/subscriptions`, `/podcasts/subscriptions/bulk`, `/podcasts/subscriptions/opml`, `/podcasts/:podcastId`, `/podcasts/:podcastId/episodes` y guarda `403 PODCASTS_DISABLED`), documentarlas en `apps/api/src/openapi.ts` y `docs/api.md`, y verificar con tests de integración en `apps/api/test/podcasts-catalog.test.ts` y `apps/api/test/openapi.test.ts`.

## 4. Verificación integral

- [x] 4.1 Ejecutar `npm run verify:full` y comprobar que typecheck, lint, tests de todos los workspaces y build finalizan en verde.
