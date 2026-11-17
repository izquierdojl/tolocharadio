# Tasks

## 1. Helper de importación por lotes

- [x] 1.1 Crear `apps/web/src/lib/opmlImport.ts` con los tipos del resumen agregado (`imported`, `skipped`, `failed`, `errors`), `OPML_IMPORT_BATCH_SIZE = 5`, `chunkFeedUrls(urls, size)` y `aggregateBulkResults(results)` que sume contadores y concatene errores sin mutar las entradas; verificar con `npm run typecheck -w apps/web`.
- [x] 1.2 Implementar en el mismo módulo `runOpmlImport({ feedUrls, importBatch, batchSize?, isCancelled?, onProgress? })`: lotes secuenciales, comprobación de cancelación antes de cada lote, `onProgress` tras cada lote y retorno `{ status: "done" | "cancelled" | "failed", processed, summary, error? }` conservando los resultados parciales; verificar con los tests de 1.3.
- [x] 1.3 Añadir `apps/web/src/lib/opmlImport.test.ts` cubriendo troceado par/impar/vacío, agregación de contadores y errores, orden de llamadas y progreso, cancelación entre lotes y durante el último, fallo intermedio (no continúa) y fallo del primer lote; verificar con `npm run test -w apps/web`.

## 2. Pantalla de descubrimiento: progreso, cancelación y resumen

- [x] 2.1 En `apps/web/src/pages/podcasts/PodcastSearch.tsx` sustituir la mutación bulk única por estado local (`idle`/`importing`/`done`) y el runner de 1.2 usando `bulkSubscribePodcasts` como `importBatch`, con bandera de cancelación en `useRef`; validar el total contra `limits.podcastOpmlMaxFeeds ?? 200` antes de arrancar y bloquear nuevas selecciones de archivo; verificar con `npm run typecheck -w apps/web` y `npm run lint -w apps/web`.
- [x] 2.2 Mostrar durante la importación la barra determinada con `role="progressbar"`, `aria-valuemin`/`aria-valuemax`/`aria-valuenow`, el texto «X de N feeds» en región `aria-live="polite"`, los contadores acumulados de importados/ya suscritos/fallidos y el botón **Cancelar** («Cancelando…» tras pulsarlo); verificar manualmente en el navegador que la barra avanza por lotes sin retroceder y que Cancelar deja terminar el lote en curso.
- [x] 2.3 Convertir el panel en resumen al liquidar (contadores, nota de cancelación o mensaje de error) con botón **Cerrar**, e invalidar `["podcast-subscriptions"]` y `["podcast-home"]` si se importó al menos un podcast; verificar manualmente importación completa, con feeds fallidos, cancelada y con error de red simulando offline en DevTools.
- [x] 2.4 Mantener los toasts solo para errores previos al arranque (OPML sin feeds válidos y archivo por encima del límite) y deshabilitar los botones de importar/exportar mientras `status === "importing"`; verificar manualmente ambos errores y que no se lanza ninguna petición (pestaña Red).

## 3. Verificación integral

- [x] 3.1 Ejecutar `npm run verify:full` y comprobar que typecheck, lint, tests y build pasan.
- [x] 3.2 Reconstruir con `docker compose up --build -d` y hacer smoke en `/podcasts/descubrir` con un OPML generado de ~12 feeds: la barra progresa, Cancelar detiene los lotes restantes y las suscripciones importadas aparecen en `/podcasts/suscripciones`.

## Workflow follow-up

- Comitear TODO (código del helper, pantalla, tests y openspec) antes de archivar; verificar con `git status` que no quedan cambios sin commitear.
- Archivar el change y, ya en `main`, ejecutar `node scripts/bump.js minor`; empujar `main`, esperar CI verde y después `git push origin --tags`.
