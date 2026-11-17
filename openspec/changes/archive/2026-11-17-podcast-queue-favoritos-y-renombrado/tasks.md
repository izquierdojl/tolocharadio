# Tasks

## 1. Control de favorito reutilizable

- [x] 1.1 Crear `apps/web/src/components/podcasts/EpisodeFavoriteButton.tsx` con estado local, mutación `addPodcastFavorite`/`removePodcastFavorite`, toast, `aria-pressed`, deshabilitado mientras está pendiente, callback `onChange` e invalidación de `podcast-home`, `podcast-favorites`, `podcast-queue`, `podcast-queue-count` y `podcast-episodes`; verificar con `npm run typecheck -w @tolocharadio/web`.
- [x] 1.2 Añadir `apps/web/src/components/podcasts/EpisodeFavoriteButton.test.tsx` con markup estático para los estados favorito/no favorito, textos accesibles, `aria-pressed`, `fill-current` y deshabilitado pendiente; verificar con `npm run test -w @tolocharadio/web`.
- [x] 1.3 Sustituir el botón inline de `apps/web/src/components/podcasts/EpisodeRow.tsx` por el componente compartido conservando estilos y comportamiento; verificar con typecheck y prueba manual de marcar/quitar favorito desde inicio, ficha de podcast y episodios favoritos.

## 2. Favorito en la cola de reproducción

- [x] 2.1 Integrar `EpisodeFavoriteButton` en `SortableQueueItem` (`apps/web/src/components/podcasts/QueuePanel.tsx`) y añadir `onFavoriteChange` para actualizar la copia local de `items` sin alterar el orden; verificar con `npm run typecheck -w @tolocharadio/web` y prueba manual de marcar/quitar favorito con y sin episodio activo.
- [x] 2.2 Ampliar `apps/api/test/podcasts-queue-favorites.test.ts` para comprobar que `GET /api/v1/podcasts/queue` devuelve `isFavorite: true` tras marcar un episodio y `false` tras quitarlo; verificar con `npm run test -w @tolocharadio/api`.

## 3. Textos y renombrado

- [x] 3.1 Cambiar en `apps/web/src/pages/podcasts/PodcastQueue.tsx` el título a «Cola de reproducción» y el subtítulo a «Episodios a continuación», eliminando el párrafo descriptivo anterior; verificar con typecheck y prueba manual en `/podcasts/cola`.
- [x] 3.2 Actualizar el mensaje `QUEUE_LIMIT_REACHED` en `apps/api/src/services/podcasts/queue.ts` a «La cola de reproducción permite un máximo de … episodios» y añadir la aserción del texto en `apps/api/test/podcasts-queue-favorites.test.ts`; verificar con `npm run test -w @tolocharadio/api`.
- [x] 3.3 Actualizar `docs/uso.md`, `docs/api.md`, `docs/arquitectura.md` y el comentario de `apps/desktop/src-tauri/src/media.rs` con el término «cola de reproducción» y la nueva acción de favorito en la cola; verificar con `grep -rn "cola de podcasts"` (sin resultados fuera de `openspec/changes/archive/`) y revisar que los textos describen la interfaz real.

## 4. Integración y verificación

- [x] 4.1 Ejecutar `npm run verify:full` y corregir cualquier fallo de typecheck, lint, tests o build.
- [x] 4.2 Reconstruir y levantar Docker con `docker compose up --build -d` y ejecutar el smoke: abrir `/podcasts/cola`, comprobar la cabecera, marcar y quitar favoritos, verificar que el orden y la revisión no cambian y que el mensaje de límite usa «cola de reproducción».
- [x] 4.3 Comprobar con `git status` que todo el trabajo del change (código, tests, docs y artefactos OpenSpec) está commiteado antes de archivar.

## Workflow follow-up

- Archivar el change según `openspec-archive-change` después de cumplir los requisitos de revisión del proyecto.
- Con `main` actualizado y el CI en verde, ejecutar `node scripts/bump.js minor` desde `main`, publicar `main` y el tag `vX.Y.Z` según `AGENTS.md`.
