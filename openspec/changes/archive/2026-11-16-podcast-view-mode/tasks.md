# Tasks

## 1. Componentes de listado de podcasts

- [x] 1.1 Crear `apps/web/src/components/podcasts/PodcastListItem.tsx`: fila densa con `PodcastCover` de tamaño fijo, título y autor truncados con `title`, insignia de episodios, insignia «Suscrito» cuando `podcast.isSubscribed` y acción opcional alineada a la derecha; portada y título enlazan a `/podcasts/:id`; verificar con `npm run typecheck` en `apps/web`
- [x] 1.2 Crear `apps/web/src/components/podcasts/PodcastList.tsx`: props `podcasts: PodcastSummary[]` y `renderAction?: (podcast: PodcastSummary) => ReactNode`; leer `useViewModeStore`; en modo `card` renderizar la rejilla actual `grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4` con `PodcastCard` y en modo `list` un `flex flex-col gap-2` con `PodcastListItem`; verificar con `npm run typecheck` en `apps/web`

## 2. Integración de los listados de podcasts

- [x] 2.1 Sustituir la rejilla inline de «Tus podcasts» en `apps/web/src/pages/podcasts/PodcastHome.tsx` por `PodcastList` manteniendo el límite de 8 suscripciones y el enlace «Ver todos»; verificar que en modo tarjeta se ve igual que antes y en modo lista se muestran filas
- [x] 2.2 Sustituir la rejilla inline de `apps/web/src/pages/podcasts/PodcastSubscriptions.tsx` por `PodcastList` pasando `renderAction` con el botón «Cancelar» existente (mismo `unsubscribeMutation`, `disabled` y estilos); verificar que la acción aparece y funciona en ambos modos

## 3. Backend: descarte persistente y conteo de cola

- [x] 3.1 Añadir `dismissedAt` (integer nullable) a `podcast_progress` en `apps/api/src/db/schema.ts`, generar la migración con `npm run db:generate` en `apps/api` y verificar que se aplica sin errores con `npm run db:migrate`
- [x] 3.2 Implementar `dismissFromContinue(userId, episodeId)` en `apps/api/src/services/podcasts/progress.ts`, limpiar `dismissedAt` en el `insert`/`onConflictDoUpdate` de `recordProgress` y excluir `isNull(podcastProgress.dismissedAt)` en la consulta de `home` de `catalog.ts`; añadir tests en `podcasts-progress.test.ts` y `podcasts-queue-favorites.test.ts` que cubran descarte, no creación sin progreso, reaparición con nuevo progreso y exclusión del home
- [x] 3.3 Exponer `POST /api/v1/podcasts/episodes/:episodeId/dismiss` y `GET /api/v1/podcasts/queue/count` en `apps/api/src/routes/podcasts.ts` usando `countForUser`; documentar ambos en `openapi.ts`, añadirlos a la lista esperada de `openapi.test.ts` y verificar con `npm test` en `apps/api`

## 4. Web: portada, descarte y badge de cola

- [x] 4.1 Añadir `dismissPodcastEpisode(episodeId)` y `fetchPodcastQueueCount()` a `apps/web/src/lib/api.ts`; verificar con `npm run typecheck` en `apps/web`
- [x] 4.2 Añadir a `EpisodeRow` una prop opcional `onDismiss` con botón accesible (icono `X`, título «Descartar de Continuar escuchando»); en `PodcastHome`, crear la mutación de descarte con toast en español e invalidación de `["podcast-home"]`, y pasarla solo a los episodios de «Continuar escuchando»; verificar typecheck y que el botón solo aparece en esa sección
- [x] 4.3 En `PodcastHome`, alternar las secciones «Continuar escuchando» y «Novedades» entre `grid gap-2 xl:grid-cols-2` (tarjeta) y `flex flex-col gap-2` (lista) leyendo `useViewModeStore`; eliminar el bloque «Cola de reproducción» y el contador textual `· N` del enlace «Cola»; verificar ambos modos y que la portada no muestra la tarjeta de cola
- [x] 4.4 En `AppShell`, consultar `["podcast-queue-count"]` solo con sesión, podcasts activos y sección de podcasts, y pintar un badge con el conteo junto al ítem «Cola» en la navegación de escritorio y en el menú móvil; invalidar `["podcast-queue-count"]` en las mutaciones de cola de `EpisodeRow`, `PodcastQueue` y `PodcastAutoAdvance`; verificar que el badge aparece, se oculta con 0 y se actualiza al añadir/quitar episodios

## 5. Calidad e integración

- [x] 5.1 Re-ejecutar `npm run verify:full` en la raíz tras el nuevo alcance y corregir typecheck, lint, tests o build si fallan
- [x] 5.2 Smoke manual con sesión: comprobar en `/podcasts` que «Tus podcasts», «Continuar escuchando» y «Novedades» respetan tarjeta/lista; descartar un episodio de «Continuar escuchando», recargar y confirmar que no reaparece; reproducirlo de nuevo y confirmar que vuelve; verificar que la tarjeta de cola ya no está y que el badge del menú «Cola» muestra el conteo y se actualiza; confirmar «Cancelar» en suscripciones, persistencia del modo y modo por defecto en tarjeta

## Workflow follow-up

- Archivar el change con el skill `openspec-archive-change` una vez revisado, asegurando que todo el código está commiteado antes de fusionar a `main`.
- Tras archivar y actualizar `main`, generar la release con `node scripts/bump.js minor` desde `main` y publicar `main` y el tag conforme a `AGENTS.md`.
