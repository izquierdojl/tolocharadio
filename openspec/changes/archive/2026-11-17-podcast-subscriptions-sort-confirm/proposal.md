# Proposal

## Why

La pantalla de suscripciones (`/podcasts/suscripciones`) solo muestra los podcasts por fecha de suscripción y no permite localizar rápido uno concreto ni ver cuáles tienen novedades por escuchar. Además, el botón «Cancelar» da de baja la suscripción al instante, sin confirmación, por lo que un toque accidental (sobre todo en móvil) la elimina sin aviso.

## What Changes

- Selector de orden en la pantalla de suscripciones con cuatro opciones:
  - **Episodios recientes** (valor por defecto): ordena por la fecha de publicación del episodio *pendiente de reproducir* más reciente de cada podcast; los podcasts sin episodios pendientes quedan al final.
  - **Nombre (A → Z)** y **Nombre (Z → A)**, sin distinguir mayúsculas ni acentos.
  - **Últimas suscritas**: el orden actual, por fecha de suscripción.
- La elección de orden se recuerda en el dispositivo (como ya ocurre con la vista tarjeta/lista).
- «Pendiente de reproducir» = episodio activo (no eliminado del feed) que el usuario **no ha completado**; incluye los empezados a medias.
- `GET /api/v1/podcasts/subscriptions` añade a cada elemento el campo `latestPendingEpisodeAt` (milisegundos, `null` si no hay pendientes) para poder ordenar sin cargar los episodios en el cliente. Cambio aditivo y compatible.
- Diálogo de confirmación (`ConfirmDialog`, destructivo) al cancelar una suscripción desde la lista de suscripciones, con el título del podcast. Sin confirmar no se llama a la API.
- Por coherencia, la misma confirmación se aplica al botón «Suscrito» de la ficha del podcast cuando va a dar de baja (suscribirse sigue siendo inmediato).

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `podcast-catalog`: el listado de suscripciones expone `latestPendingEpisodeAt` por podcast (nuevo requisito aditivo).
- `podcast-library`: la pantalla web de suscripciones permite ordenar (nombre A-Z/Z-A, episodios recientes pendientes, recientes) recordando la preferencia, y exige confirmación antes de cancelar una suscripción (nuevos requisitos aditivos).

## Impact

- API: `apps/api/src/services/podcasts/subscriptions.ts` (consulta de pendientes por podcast), `apps/api/src/services/podcasts/catalog.ts` (`PodcastSummary`), `apps/api/src/openapi.ts` (esquema `PodcastSummary`) y tests en `apps/api/test/`.
- Web: `apps/web/src/pages/podcasts/PodcastSubscriptions.tsx`, `PodcastShow.tsx`, `lib/types.ts`, un helper/store de orden con persistencia en `localStorage` y su test.
- Sin cambios de esquema de base de datos, dependencias, Docker ni desktop.
- Compatibilidad: campo nuevo opcional en la respuesta; los clientes existentes lo ignoran.
- Carril: cambio pequeño-medio, sin esquema ni dependencias → puede ir por el carril corto (directo a `main`) según `AGENTS.md`; release `minor` tras archivar.
