# Design

## Context

La sección podcasts ya carga todas las suscripciones en una sola respuesta (`GET /podcasts/subscriptions`, máx. 200) y la web las ordena en cliente (`sortSubscriptions`). El listado de episodios de un podcast (`listEpisodesForUser`, `apps/api/src/services/podcasts/catalog.ts`) ya carga en memoria todos los episodios activos del feed y aplica filtros de estado en JS antes de paginar. El modal global de ficha de episodio (`EpisodeDetailDialog`) y las filas `EpisodeRow` ya reciben podcast + episodio y traen reproducir/encolar/favorito. Ver `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**

- Búsqueda de episodios por título en las suscripciones del usuario, con un solo endpoint nuevo y un parámetro nuevo.
- Filtros de texto en las cuatro pantallas de la web (suscripciones, ficha, favoritos, cola) reutilizando componentes existentes.

**Non-Goals:**

- Búsqueda global en cabecera, búsqueda en radio, cambios en el directorio externo o búsqueda por descripción.
- FTS5, índices de texto completo o migraciones de esquema.

## Decisions

### D1: coincidencia sin acentos mediante normalización compartida, no SQL `LIKE`

SQLite `LIKE` solo ignora mayúsculas/minúsculas en ASCII, así que `%camion%` no matchea «Camión». En vez de pelear con ICU o FTS5, se normaliza en JS el título y el término (minúsculas + `String.normalize("NFD")` sin marcas diacríticas) con un helper compartido (`apps/api/src/services/podcasts/textMatch.ts`). Es el mismo tratamiento «sin mayúsculas ni acentos» que ya exige la ordenación de suscripciones, y con la escala de esta app (200 suscripciones × ≤500 episodios por feed tras la poda) el filtrado en memoria es más que suficiente. Alternativa descartada: `LIKE` puro, rompería los escenarios de acentos.

### D2: `episodes/search` como método de catálogo que reutiliza el patrón existente

`PodcastCatalog.searchEpisodesForUser(userId, q, { offset, limit })`: un `select` de episodios activos con join a `podcast_subscriptions` del usuario, orden por `publishedAt` desc, filtrado por título normalizado y paginación con `hasMore`, devolviendo `toEpisodeItem(...)` + resumen `toSummary(...)` del podcast. Los mapas de progreso y favoritos se cargan igual que en `listEpisodesForUser`. Alternativa descartada: filtrar primero por `LIKE` en SQL como prefiltro grueso — elimina resultados válidos con acentos y añade dos caminos de matcheo; se prefiere un solo criterio.

El endpoint `GET /api/v1/podcasts/episodes/search?q=` se registra en `routes/podcasts.ts` junto al resto de rutas de episodios, con validación de `q` no vacío (mismo patrón que `/podcasts/search`), `limit` (1–100) y `offset` ≥ 0. No colisiona con `/podcasts/episodes/:episodeId/*` porque esas rutas tienen segmentos adicionales.

### D3: `q` en el listado por podcast reusa el flujo de `listEpisodesForUser`

El parámetro `q` se valida como cadena opcional y se aplica al título normalizado **antes** del filtro de estado y la paginación, de modo que `filter` y `q` se componen y `hasMore` refleja el conjunto ya filtrado. Sin `q`, el comportamiento es byte a byte el actual. La ruta ya valida `sort`/`filter`; se añade `q` en la misma pasada.

### D4: en la web, filtro en cliente para lo ya cargado y `useQuery` para lo nuevo

- `/podcasts/suscripciones`: estado local `term` + `scope ("podcasts" | "episodios")`. Ámbito **Podcasts**: `useMemo` sobre la lista ya ordenada con el mismo helper de normalización (portado a `apps/web/src/lib/textMatch.ts`), sin peticiones. Ámbito **Episodios**: `useQuery(["podcast-episode-search", term])` activo solo con término enviado (submit explícito, Enter o botón); los resultados reemplazan las tarjetas y se renderizan con `EpisodeRow` (los resultados ya traen su podcast), con apertura de `EpisodeDetailDialog` y enlace a la ficha del podcast. Limpiar restaura la lista.
- `/podcasts/:podcastId`: el término entra en la `queryKey` del `useQuery` de episodios y `setOffset(0)` al cambiarlo.
- `/podcasts/favoritos` y `/podcasts/cola`: filtro local en `useMemo` por título normalizado, sin peticiones ni efectos sobre el orden del servidor.

Alternativa descartada para favoritos/cola: `q` remoto — innecesario: la cola son ≤200 filas y los favoritos ya se cargan completos.

### D5: OpenAPI y tipos actualizados en el mismo change

`openapi.ts` documenta el endpoint nuevo y el parámetro `q`; `apps/web/src/lib/api.ts` añade `searchPodcastEpisodes(term)` y extiende `fetchPodcastEpisodes` con `q`; tipos nuevos (`PodcastEpisodeSearchItem = PodcastEpisodeItem & { podcast: ... }`).

## Risks / Trade-offs

- [Riesgo] Memoria/latencia si el catálogo crece mucho (episodios de todas las suscripciones en memoria por búsqueda) → [Mitigación] límites de suscripciones (200) y poda de episodios (≤500/feed); mejor-sqlite3 local. Si algún día molesta, se introduce FTS5 con columna normalizada **sin cambiar el contrato** de la API (el matcheo es un detalle interno).
- [Riesgo] La normalización NFD puede sorprender con caracteres especiales (ligaduras, otras escrituras) → [Mitigación] helper único y testeado con casos españoles; coincidencia «contiene», no exacta.
- [Riesgo] Confusión del toggle de ámbito en suscripciones → [Mitigación] el ámbito queda visible junto al input y los resultados de episodios se ven distintos de las tarjetas de suscripción.

## Migration Plan

Cambio puramente aditivo: sin migraciones de base de datos ni cambios en Docker. Despliegue normal; rollback = revert del commit. Los clientes antiguos siguen funcionando porque los endpoints existentes solo ganan un parámetro opcional.

## Open Questions

- (ninguna bloqueante: detalles visuales del input y el toggle se resuelven en implementación siguiendo el estilo existente)
