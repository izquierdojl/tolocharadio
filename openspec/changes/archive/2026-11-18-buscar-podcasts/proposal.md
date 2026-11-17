# Proposal

## Why

Con decenas o hasta 200 suscripciones (el límite actual), encontrar un podcast concreto en `/podcasts/suscripciones` exige recorrer la lista a mano; y en la ficha de un podcast con cientos de episodios, localizar uno por título obliga a paginar sin fin. No existe hoy ninguna vía de buscar en los episodios ya suscritos: solo el buscador del directorio externo, que no consulta lo que el usuario ya sigue.

## What Changes

- Filtro de texto en `/podcasts/suscripciones`: un input de búsqueda con toggle de ámbito **Podcasts | Episodios**.
  - Ámbito **Podcasts**: acota la lista de suscripciones por nombre (en cliente, respetando el selector de orden).
  - Ámbito **Episodios**: busca episodios por título en **todas** las suscripciones del usuario (nuevo endpoint `GET /api/v1/podcasts/episodes/search`), mostrando el podcast de cada resultado, con progreso y favorito, y abriendo la ficha de episodio en el modal global existente.
- Búsqueda de episodios dentro de la ficha del podcast (`/podcasts/:podcastId`): nuevo parámetro `q` en `GET /api/v1/podcasts/:podcastId/episodes` que filtra por título, conviviendo con los filtros de estado, el orden y la paginación existentes.
- Filtros locales (en cliente, sin cambios de API) en `/podcasts/favoritos` y `/podcasts/cola`.
- Sin cambios en la sección de radio ni en el buscador del directorio externo (`/podcasts/descubrir`).

## Capabilities

### New Capabilities

(ninguna: todo encaja en capacidades existentes)

### Modified Capabilities

- `podcast-catalog`: nuevo endpoint autenticado `GET /api/v1/podcasts/episodes/search?q=` que devuelve episodios por título de todas las suscripciones del usuario, y nuevo parámetro `q` (filtro por título) en `GET /api/v1/podcasts/:podcastId/episodes`.
- `podcast-library`: las vistas web de suscripciones, ficha de podcast, favoritos y cola incorporan búsqueda/filtrado de texto con el comportamiento descrito arriba.

## Impact

- **API** (`apps/api/src/routes/podcasts.ts`, `apps/api/src/services/podcasts/catalog.ts`): dos adiciones al catálogo; `listEpisodesForUser` ya carga los episodios en memoria, el filtro por título es incremental. Actualizar `openapi.ts`.
- **Web** (`apps/web/src/pages/podcasts/`): `PodcastSubscriptions` (input + toggle + resultados de episodios), `PodcastShow` (input de búsqueda), `PodcastFavorites` y `PodcastQueue` (filtros locales). Reutiliza `EpisodeRow`/`EpisodeDetailDialog` existentes para los resultados.
- **Sin cambios de esquema** (better-sqlite3, `LIKE` sobre título; sin FTS ni migraciones). Sin cambios en Docker, PWA ni escritorio.
