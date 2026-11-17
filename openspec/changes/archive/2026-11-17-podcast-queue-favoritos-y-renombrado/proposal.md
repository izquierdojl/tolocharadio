# Proposal

## Why

La cola de reproducción de podcasts ya muestra los episodios pendientes, pero para guardar uno como favorito hay que salir a otra vista, y la página se presenta como «Cola de podcasts» con un subtítulo genérico. Se quiere poder marcar o quitar favoritos directamente desde la cola y alinear la terminología visible con «cola de reproducción».

## What Changes

- **Favorito desde la cola**: cada fila de pendientes de `/podcasts/cola` incorpora un botón de corazón que marca o quita el episodio como favorito usando los endpoints existentes, con confirmación por toast, estado pendiente y actualización de las vistas afectadas.
- **Extracción del control de favorito**: el botón de favorito de `EpisodeRow` y el de la cola comparten un mismo componente reutilizable, para que icono, estados accesibles y estilos no diverjan.
- **Renombrado de la página**: el título pasa de «Cola de podcasts» a «Cola de reproducción» y el subtítulo actual se sustituye por «Episodios a continuación».
- **Renombrado en API y documentación**: el mensaje de límite de la cola y las menciones en documentación pasan a decir «cola de reproducción». No cambian rutas, esquemas ni comportamiento de la API.
- **Estado del episodio activo sin cambios**: el episodio que está sonando sigue oculto de la lista de pendientes y se controla desde el reproductor persistente; el favorito se marca en las filas visibles de la cola.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `podcast-library`: la vista de cola ofrece marcar y quitar episodios favoritos desde cada fila pendiente, refleja el estado del favorito y usa los textos «Cola de reproducción» y «Episodios a continuación».

## Impact

- **Web**: `apps/web/src/pages/podcasts/PodcastQueue.tsx` (título y subtítulo), `apps/web/src/components/podcasts/QueuePanel.tsx` (botón de favorito por fila y sincronización del estado local), `apps/web/src/components/podcasts/EpisodeRow.tsx` (reutilización del control), nuevo `apps/web/src/components/podcasts/EpisodeFavoriteButton.tsx` con su test, y el hook de mutación/invalidación compartido.
- **API**: `apps/api/src/services/podcasts/queue.ts` (texto del error `QUEUE_LIMIT_REACHED`); sin endpoints, tablas ni migraciones nuevas. La respuesta de `GET /podcasts/queue` ya incluye `isFavorite`.
- **Documentación**: `docs/uso.md`, `docs/api.md` y `docs/arquitectura.md`; comentario de `apps/desktop/src-tauri/src/media.rs`.
- **Sin impacto en radio ni en el cliente de escritorio más allá del comentario.**
