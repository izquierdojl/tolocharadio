# Design

## Context

- `PodcastSearch.tsx` (ruta `/podcasts/descubrir`) lee el archivo con `file.text()`, extrae las URLs con `parseOpmlFeedUrls` y lanza una única mutación `bulkSubscribePodcasts(feedUrls)`; solo hay un toast al terminar. El botón se deshabilita con `bulkMutation.isPending`.
- `POST /api/v1/podcasts/subscriptions/bulk` acepta hasta `podcastOpmlMaxFeeds` (200 por defecto), procesa internamente con concurrencia 3, deduplica URLs contra las suscripciones existentes **en cada llamada** y devuelve `{ imported, skipped, failed, items, errors }`. Por tanto, dividir la lista en varias llamadas secuenciales es seguro: los feeds repetidos entre lotes se contabilizan como `skipped`.
- La configuración pública ya expone `limits.podcastOpmlMaxFeeds`, así que el cliente puede validar el total sin cambios de API. Ver `proposal.md` para la motivación.
- Los tests web son de lógica pura con Vitest (no hay Testing Library), así que la orquestación debe vivir en un helper testeable sin DOM.

## Goals / Non-Goals

**Goals:**
- Progreso real y cancelable reutilizando el endpoint actual, sin infraestructura de trabajos.
- Contadores exactos aunque se cancele: solo se cuenta lo que el servidor ya confirmó.
- Mantener el helper de importación independiente de React y de la red (inyección de la función de lote).

**Non-Goals:**
- Jobs persistentes, reanudación tras recargar o polling de estado en servidor.
- Reintentar feeds fallidos ni editar el OPML antes de importar.
- Mostrar el detalle por feed de los errores (solo el recuento).
- Cambios en la API, OpenAPI, base de datos, dependencias o desktop.

## Decisions

1. **Lotes secuenciales de 5 feeds desde el cliente.**
   Cada lote se envía a `POST /podcasts/subscriptions/bulk` y espera a que termine antes del siguiente. Da progreso real con granularidad razonable (40 pasos para 200 feeds), acota la latencia de cada petición y evita ráfagas. El servidor ya deduplica entre llamadas, así que no hay riesgo de duplicados.
   *Alternativas:* una sola petición con barra indeterminada (no hay avance real); job en servidor con polling (tabla/almacén de jobs, expiración y cancelación server-side: desproporcionado); lotes en paralelo (el progreso salta y se multiplica la carga).

2. **Helper puro `apps/web/src/lib/opmlImport.ts`.**
   - `OPML_IMPORT_BATCH_SIZE = 5` y `chunkFeedUrls(urls, size)`.
   - `aggregateBulkResults(results)` suma `imported`/`skipped`/`failed` y concatena `errors`.
   - `runOpmlImport({ feedUrls, importBatch, batchSize?, isCancelled?, onProgress? })` recorre los lotes en orden y devuelve `{ status: "done" | "cancelled" | "failed", processed, summary, error? }`. Comprueba `isCancelled()` **antes de cada lote** (no aborta el que está en curso) y llama a `onProgress` tras cada lote con `{ processed, total, imported, skipped, failed }`. Si `importBatch` lanza (red/HTTP), devuelve `status: "failed"` con el resumen parcial y el error.
   La función de lote se inyecta, de modo que los tests usan un stub y no hace falta red ni DOM.

3. **Cancelación por bandera, no por `AbortController`.**
   El botón **Cancelar** activa un `useRef<boolean>` que el runner consulta en el límite del lote. Dejar terminar el lote en curso mantiene los contadores exactos; abortar la petición no detendría el trabajo del servidor y el resumen mentiría. Mientras se espera al lote, el botón muestra «Cancelando…» y queda deshabilitado.

4. **Estado local en la pantalla, sin `useMutation` para el bucle.**
   `PodcastSearch.tsx` guarda `{ status: "idle" | "importing" | "done", processed, total, summary, cancelled, error }` en `useState` y ejecuta el runner en un handler `async`. Al liquidar la importación (completa, cancelada o fallida) invalida `["podcast-subscriptions"]` y `["podcast-home"]` si `imported > 0`; si se cancela, los lotes ya confirmados aparecen igualmente.
   *Alternativa:* `useMutation` con un callback de progreso en las variables; funciona, pero mezcla el ciclo de vida de la mutación con un bucle cancelable y complica el estado. `useMutation` se mantiene para las acciones de suscribir/resolver/exportar.

5. **Panel de progreso y resumen en la tarjeta «Añadir por URL RSS».**
   Durante la importación se muestran, bajo la fila de botones: barra determinada (`role="progressbar"`, `aria-valuemin=0`, `aria-valuemax={total}`, `aria-valuenow={processed}`), texto «X de N feeds» en una región `aria-live="polite"`, contadores de importados/ya suscritos/fallidos y botón **Cancelar**. Los estilos reutilizan la barra de progreso existente de estadísticas (`bg-pine-800` + relleno `bg-pine-600`). Al terminar, el mismo panel pasa a modo resumen con los contadores, la nota de cancelado o el error, y un botón **Cerrar** que vuelve a `idle`. Los botones «Importar OPML» y «Exportar OPML» se deshabilitan mientras `status === "importing"`.
   Se mantienen los toasts solo para errores previos al arranque (sin feeds válidos, límite excedido); el éxito se comunica con el resumen persistente para no duplicar avisos.

6. **Validación del límite en cliente con el valor de configuración.**
   `maxFeeds = configQuery.data?.limits?.podcastOpmlMaxFeeds ?? 200`. Si `feedUrls.length > maxFeeds`, se muestra un toast de error con el mismo texto que el servidor y no se llama a la API. El servidor sigue validando por si la configuración cambia o el cliente está desactualizado.

7. **Semántica de errores.**
   Los errores por feed vienen en una respuesta HTTP 200 y solo incrementan `failed`; la importación continúa. Un fallo de red o un HTTP no-2xx en un lote detiene el bucle, conserva lo procesado y muestra el mensaje del error en el resumen. No se reintenta automáticamente para no duplicar esperas.

8. **Tests del helper, verificación manual de la UI.**
   `opmlImport.test.ts` cubre: troceado par/impar/vacío, agregación de contadores y errores, orden secuencial y progreso, cancelación entre lotes (no se llama al lote siguiente), cancelación durante el último lote, fallo intermedio (no continúa y conserva parciales) y fallo del primer lote. La UI se valida manualmente porque el proyecto no tiene Testing Library.

## Risks / Trade-offs

- [Hasta 40 peticiones para 200 feeds; cada una recalcula las suscripciones existentes] → el volumen máximo es 200 y la consulta es local; aceptable. Si la latencia por lote resulta alta, subir `OPML_IMPORT_BATCH_SIZE` a 10 es un cambio de una constante.
- [La cancelación no es instantánea: espera al lote en curso] → se comunica con «Cancelando…» y el lote es de 5 feeds, acotado a unos segundos.
- [El usuario navega fuera durante la importación y se pierde el panel] → las peticiones ya enviadas se completan en servidor y las suscripciones aparecen al volver; no se promete reanudación (non-goal).
- [Configuración pública aún no cargada al pulsar importar] → se usa el valor por defecto de 200, idéntico al del servidor; el servidor valida igualmente.
- [Doble clic o selección de otro archivo durante la importación] → botón e `input[type=file]` deshabilitados y bandera de estado que ignora nuevas selecciones.

## Migration Plan

- Sin migración de datos ni de API. Se despliega solo el frontend; el endpoint bulk no cambia.
- Rollback: revertir el commit del frontend; la importación vuelve al comportamiento anterior de una única petición.
