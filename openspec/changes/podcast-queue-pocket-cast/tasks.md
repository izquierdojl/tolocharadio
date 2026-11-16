# Tasks

## 1. API de cola

- [x] 1.1 Ampliar `PodcastQueueService.add` en `apps/api/src/services/podcasts/queue.ts` para mover un episodio ya encolado a la posición pedida (`next` → primer puesto, `end` → último), sin duplicar, dentro de la transacción y subiendo `revision` solo si hay movimiento; verificar con tests en `apps/api/test/podcasts-queue-favorites.test.ts` (mover a continuación, mover al final y no-op cuando ya está en la posición pedida) y `npm run test -w @tolocharadio/api`.
- [x] 1.2 Implementar `PodcastQueueService.clear(userId, keepEpisodeId?)` y la ruta autenticada `DELETE /api/v1/podcasts/queue` con query opcional `keepEpisodeId` validado como entero positivo; verificar con tests de vaciado total, conservación de un miembro, `keepEpisodeId` no miembro, cola vacía, incremento de revisión y aislamiento entre usuarios.
- [x] 1.3 Documentar la nueva ruta y el parámetro `keepEpisodeId` en `apps/api/src/openapi.ts` y `docs/api.md`; verificar con `npm run test -w @tolocharadio/api` (incluye `openapi.test.ts`) y revisar que el ejemplo del documento coincide con la ruta real.

## 2. Cliente API y helpers puros

- [x] 2.1 Añadir `clearPodcastQueue(keepEpisodeId?)` en `apps/web/src/lib/api.ts`; verificar con `npm run typecheck -w @tolocharadio/web`.
- [x] 2.2 Añadir en `apps/web/src/lib/podcastQueue.ts` los helpers `isQueueEpisodeActive(status)` (conectando, reproduciendo o reconectando) y `mergeQueueOrder(allItems, visibleOrder, hiddenEpisodeId)`, con tests en `apps/web/src/lib/podcastQueue.test.ts` para el estado activo, oculto al principio, oculto en medio, oculto al final y oculto ausente; verificar con `npm run test -w @tolocharadio/web`.

## 3. Acciones de reproducción y encolado en listas

- [x] 3.1 En `apps/web/src/components/podcasts/EpisodeRow.tsx`, hacer visible el botón reproducir/pausar en todas las anchuras, reanudar el progreso (`playEpisode` sin `startPositionSec`) y alternar pausa/reanudación (o reintentar si el estado es `failed`) cuando el episodio es el actual; aplicar el mismo criterio al overlay de portada y verificar con `npm run typecheck -w @tolocharadio/web` y prueba manual en inicio, ficha y favoritos.
- [x] 3.2 Crear el menú “A la cola” con las acciones “A continuación” y “Al final”, conectarlo a `addEpisodeToQueue` con `position` `next`/`end`, mostrar toast e invalidar `podcast-queue`, `podcast-queue-count` y `podcast-home`; verificar accesibilidad (`role="menu"`, Escape, clic fuera) y las dos acciones con typecheck/build y prueba manual, incluido el error `QUEUE_LIMIT_REACHED`.
- [x] 3.3 Ajustar `apps/web/src/components/podcasts/QueuePanel.tsx` para que el botón de reproducir de cada fila reanude o alterne el episodio actual sin reiniciarlo y refleje correctamente pausa/reanudación; verificar con typecheck y prueba manual en `/podcasts/cola`.

## 4. Página de cola y vaciado

- [x] 4.1 Crear la tira “En reproducción” en `apps/web/src/components/podcasts/` y componerla en `PodcastQueue.tsx` solo mientras el episodio esté activo, con portada, título enlazado, podcast, progreso y pausa/reanudar; verificar los estados vacíos y la tira con `renderToStaticMarkup` y prueba manual.
- [x] 4.2 Integrar el filtrado del episodio activo en `QueuePanel.tsx` y la reconstrucción del orden con `mergeQueueOrder` al arrastrar, renumerando la lista visible y manteniendo el hueco del episodio oculto; verificar con los tests del helper y prueba manual de arrastre con un episodio sonando.
- [x] 4.3 Añadir el botón “Vaciar cola” con diálogo de confirmación accesible, mutación `clearPodcastQueue` pasando `keepEpisodeId` cuando el episodio cargado está en la cola, estado pendiente, toast y actualización de caché; verificar con typecheck/build y prueba manual de vaciado con reproducción activa y en pausa.
- [x] 4.4 Actualizar `docs/uso.md` y `docs/arquitectura.md` con el modelo de cola (episodio activo separado, retorno al pausar/detener, acciones por fila y vaciado); verificar que los pasos descritos coinciden con la interfaz real.

## 5. Integración y verificación

- [x] 5.1 Ejecutar `npm run verify:full` y corregir cualquier fallo de typecheck, lint, tests o build.
- [x] 5.2 Reconstruir y levantar Docker con `docker compose up --build -d` y ejecutar el smoke de los flujos: reproducir desde lista, encolar a continuación y al final, cambiar de episodio, pausar, vaciar y comprobar que la radio sigue sin cambios.
- [x] 5.3 Comprobar `git status` y confirmar que todo el trabajo del change (código, tests, docs y artefactos OpenSpec) está commiteado antes de archivar.

## Workflow follow-up

- Archivar el change según `openspec-archive-change` después de cumplir los requisitos de revisión del proyecto.
- Con `main` actualizado y el CI en verde, ejecutar `node scripts/bump.js minor` desde `main`, publicar `main` y el tag `vX.Y.Z` según `AGENTS.md`.
