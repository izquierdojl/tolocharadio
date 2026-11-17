# Tasks

## 1. Backend: matcheo de texto normalizado

- [x] 1.1 Crear `apps/api/src/services/podcasts/textMatch.ts` con el helper de normalización (minúsculas + NFD sin marcas) y la función de coincidencia «contiene», y verificar con tests unitarios que «camion» matchea «El camión fantasma» y no distingue mayúsculas

## 2. Backend: filtro `q` en el listado de episodios de un podcast

- [x] 2.1 Añadir `q` a `listEpisodesForUser` (filtro por título normalizado antes del filtro de estado y la paginación) y al handler de `GET /api/v1/podcasts/:podcastId/episodes` en `routes/podcasts.ts`, y verificar con tests que `q=camion` devuelve solo los títulos coincidentes, se compone con `filter`, `hasMore` refleja el conjunto filtrado y sin `q` el comportamiento no cambia
- [x] 2.2 Documentar el parámetro `q` en `apps/api/src/openapi.ts` y verificar que la especificación OpenAPI valida (test/validación existente del documento)

## 3. Backend: búsqueda de episodios en todas las suscripciones

- [x] 3.1 Implementar `PodcastCatalog.searchEpisodesForUser(userId, q, { offset, limit })` con join a `podcast_subscriptions`, episodios activos, orden por `publishedAt` desc, progreso y favorito por episodio, y verificar con tests los escenarios de aislamiento entre usuarios, episodios eliminados y paginación `hasMore`
- [x] 3.2 Añadir el handler de `GET /api/v1/podcasts/episodes/search` con `q` obligatorio (400 si falta o está vacío), `limit` 1–100 y `offset` ≥ 0, y verificar con tests de ruta los escenarios de término ausente, sin resultados y resultados de varias suscripciones
- [x] 3.3 Documentar el endpoint en `apps/api/src/openapi.ts` y verificar que la especificación valida

## 4. Web: fundamento de cliente

- [x] 4.1 Añadir `apps/web/src/lib/textMatch.ts` (normalización y «contiene») con tests unitarios paralelos a los del helper de API, y verificar que coinciden en «camion» ↔ «Camión»
- [x] 4.2 Añadir a `apps/web/src/lib/api.ts` la función `searchPodcastEpisodes(term)` y el parámetro `q` en `fetchPodcastEpisodes`, con el tipo `PodcastEpisodeSearchItem` (episodio + resumen de podcast) en `types.ts`, y verificar con typecheck

## 5. Web: búsqueda en la ficha del podcast

- [x] 5.1 Añadir el input de búsqueda en `PodcastShow.tsx` con `q` en la queryKey y `setOffset(0)` al cambiar el término, y verificar con tests de componente que el filtro compone con el chip de estado, reinicia la paginación y limpiar restaura el listado

## 6. Web: búsqueda en suscripciones (toggle Podcasts | Episodios)

- [x] 6.1 Añadir en `PodcastSubscriptions.tsx` el input con toggle de ámbito: en **Podcasts** filtrar la lista por nombre en cliente respetando el orden elegido (sin peticiones) y mostrar vacío con mensaje cuando no hay coincidencias; verificar con tests de componente los escenarios del spec de filtro de suscripciones
- [x] 6.2 Implementar el ámbito **Episodios** con `useQuery` de `searchPodcastEpisodes` activado solo con término enviado: resultados con `EpisodeRow` (podcast incluido), apertura de `EpisodeDetailDialog`, enlace a la ficha del podcast, mensaje de sin resultados y restauración al limpiar; verificar con tests de componente los escenarios del spec
- [x] 6.3 Revisar accesibilidad del input y el toggle (etiquetas, `aria-pressed` del ámbito, foco) siguiendo el patrón del selector de orden existente, y verificar navegación por teclado manualmente o con test

## 7. Web: filtros locales en favoritos y cola

- [x] 7.1 Añadir el filtro de texto en `PodcastFavorites.tsx` y verificar con tests que acota por título, mantiene acciones y restaura al limpiar
- [x] 7.2 Añadir el filtro de texto en `PodcastQueue.tsx` y verificar con tests que acota por título sin peticiones y sin alterar el orden persistido de la cola

## 8. Integración

- [x] 8.1 Ejecutar `npm run verify:full` completo en la raíz y confirmar que typecheck, lint, tests y build de todos los workspaces pasan
- [x] 8.2 Reconstruir el contenedor (`docker compose up --build -d`) y hacer smoke manual: buscar suscripciones, buscar episodios en todas las suscripciones, buscar dentro de una ficha, filtrar favoritos y cola
- [x] 8.3 Validar el change con `openspec validate buscar-podcasts --strict` y confirmar que no quedan tareas pendientes
