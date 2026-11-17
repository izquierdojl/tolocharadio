# Proposal

## Why

La importación de OPML funciona, pero al pulsar «Importar OPML» la interfaz no da ninguna señal de avance: la petición puede tardar bastante (se resuelven y descargan decenas o cientos de feeds en el servidor) y el usuario solo ve el botón bloqueado hasta que aparece un toast al final. No sabe si el proceso sigue vivo, cuánto falta ni cómo va, y no puede interrumpirlo si se equivocó de archivo.

## What Changes

- La importación de OPML desde `/podcasts/descubrir` pasa a enviarse en **lotes secuenciales** al endpoint bulk existente, en lugar de una única petición con todos los feeds. Así el cliente conoce el avance real.
- Mientras dura la importación se muestra un **panel de progreso** con:
  - barra de progreso determinada (`role="progressbar"`, valor accesible),
  - texto «X de N feeds» con el total del archivo,
  - contadores acumulados de importados, ya suscritos y fallidos,
  - botón **Cancelar**.
- **Cancelar** deja terminar el lote en curso (para no falsear los contadores), no envía más lotes y muestra un resumen parcial indicando que se canceló. Lo ya importado permanece.
- Al terminar (completa, cancelada o con error de red/HTTP en un lote) se muestra un **resumen persistente** en la propia pantalla con importados, duplicados y fallidos, y un botón para cerrarlo. Los errores por feed incluidos en la respuesta de la API no interrumpen la importación.
- Si un lote falla a nivel de red/HTTP, la importación se detiene, se conserva lo procesado y se muestra el error con el resumen.
- Se valida en cliente que el archivo no supere `limits.podcastOpmlMaxFeeds` (200 por defecto) antes de empezar, evitando peticiones inútiles. El servidor sigue imponiendo el mismo límite.
- Se deshabilita el botón de importar y la selección de archivo mientras hay una importación en curso.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `podcast-library`: la vista web de descubrimiento muestra progreso real, resumen y cancelación al importar un OPML (nuevo requisito aditivo sobre las vistas web de Podcasts).

## Impact

- Web: `apps/web/src/pages/podcasts/PodcastSearch.tsx` (panel de progreso, cancelación y resumen), nuevo helper puro `apps/web/src/lib/opmlImport.ts` y su test; reutiliza `parseOpmlFeedUrls` y `bulkSubscribePodcasts` existentes.
- API: sin cambios. Se sigue usando `POST /api/v1/podcasts/subscriptions/bulk`, que ya deduplica entre peticiones y devuelve el resumen por lote.
- Sin cambios de esquema de base de datos, dependencias, OpenAPI, Docker ni desktop.
- Compatibilidad: la API y el formato OPML no cambian; otros clientes no se ven afectados.
- Carril: cambio pequeño (solo web + tests) → puede ir directo a `main`; release `minor` tras archivar.
