# Proposal

## Why

Las tarjetas de episodio solo muestran dos líneas de descripción y no existe una ficha donde leer las notas completas ni consultar temporada, duración o progreso antes de decidir. Tampoco hay forma de guardar el audio original de un episodio para escucharlo fuera de la aplicación. El catálogo y los listados ya traen todos los datos necesarios, así que falta una capa de presentación y un endpoint de descarga seguro que reutilice el proxy existente.

## What Changes

- **Ficha de episodio en modal global**: se abre al pulsar el título o la tarjeta del episodio en las listas y al pulsar el título del episodio en el reproductor persistente. Muestra portada, podcast, título, fecha, duración, temporada/episodio, explícito, progreso y la descripción completa. Acciones: reproducir/pausar/reintentar, encolar, favorito, descargar y cerrar.
- **Descarga del archivo original**: botón en cada fila de episodio (inicio, ficha de podcast, favoritos y cola) y en la ficha. La descarga pasa siempre por la API y guarda el archivo original con el nombre `tolocharadio_<título del episodio>` saneado; no hay biblioteca offline ni reproducción sin conexión.
- **API de descarga firmada**: `POST /api/v1/podcasts/episodes/:episodeId/download` emite una URL firmada y `GET /api/v1/podcasts/episodes/:episodeId/download` sirve el archivo original con `Content-Disposition: attachment`, soporte de `Range` y errores controlados.
- **Proxy también en modo redirect**: la descarga no redirige al origen, porque un redirect no garantiza que el navegador guarde el archivo con el nombre correcto.
- **Capacidad pública**: `features.podcastDownloads` pasa a `true` cuando los podcasts están habilitados; la web oculta los botones si el servidor la desactiva en el futuro.
- **Sin cambios en radio, base de datos ni reproducción offline.**

## Capabilities

### New Capabilities

- `podcast-downloads`: emisión y validación de tokens de descarga, proxy del enclosure original, cabeceras de descarga, nombre de archivo seguro, soporte de rangos y disponibilidad en `/config`.

### Modified Capabilities

- `podcast-library`: ficha de episodio en modal, disparadores desde título/tarjeta/reproductor, contenido completo, acciones de reproducción/cola/favorito y botones de descarga en filas y ficha.

## Impact

- **API**: `apps/api/src/routes/podcasts.ts`, `apps/api/src/services/podcasts/playbackToken.ts` (token con propósito de descarga), `apps/api/src/routes/config.ts`, `apps/api/src/openapi.ts` y tests de descarga/config.
- **Web**: `EpisodeRow.tsx`, `QueuePanel.tsx`, `PlayerBar.tsx`, nuevo `EpisodeDetailDialog.tsx`, store de ficha, hook de descarga, `AppShell.tsx`, `lib/api.ts` y `lib/types.ts`.
- **Docs**: `docs/api.md`, `docs/uso.md` y `docs/arquitectura.md`.
- **Sin migración de base de datos, sin cambios en emisoras de radio y sin almacenamiento offline.**
