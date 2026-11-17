# Tasks

## 1. Token de descarga y emisión

- [x] 1.1 Generalizar `apps/api/src/services/podcasts/playbackToken.ts` para firmar y validar tokens con propósito `playback` o `download`, usando contextos HMAC distintos y manteniendo las funciones actuales de reproducción; verificar con `npm run test -w @tolocharadio/api -- podcasts-playback-token` y un test nuevo que compruebe que un token de reproducción no vale para descarga y viceversa.
- [x] 1.2 Añadir la ruta autenticada `POST /api/v1/podcasts/episodes/:episodeId/download` en `apps/api/src/routes/podcasts.ts`, con validación del episodio, emisión de `{ url, expiresAt }` y `Cache-Control: no-store`; verificar con tests de `200`, `401` sin token y `404 EPISODE_NOT_FOUND` en `apps/api/test/podcasts-download.test.ts` y `npm run test -w @tolocharadio/api`.

## 2. Proxy, nombre de archivo y descarga

- [x] 2.1 Crear el helper de nombre de archivo de descarga en `apps/api/src/services/podcasts/downloadFilename.ts` con base `tolocharadio_<título del episodio>`, saneado de rutas, comillas, caracteres de control y nombres reservados, límite de longitud, extensión por `Content-Disposition`/URL/`Content-Type` y reserva `.mp3`; verificar con `apps/api/test/podcasts-download-filename.test.ts` los casos de título con acentos, nombre numérico del origen ignorado, `../../etc/passwd`, `audio/mp4` sin extensión y ausencia total de título/metadatos.
- [x] 2.2 Extraer un proxy compartido para stream y descarga en `apps/api/src/routes/podcasts.ts`, de modo que `GET /api/v1/podcasts/episodes/:episodeId/download` valide la firma sin Bearer, fuerce proxy aunque `PODCAST_STREAM_MODE=redirect`, añada `Content-Disposition: attachment`, `Cache-Control: private, no-store` y reenvíe `Range`; verificar con `apps/api/test/podcasts-download.test.ts` los casos `200`, `206`, `416`, `503 DOWNLOAD_UNAVAILABLE`, firma alterada y modo redirect.
- [x] 2.3 Comprobar que el refactor no cambia el stream existente: `npm run test -w @tolocharadio/api -- podcasts-stream` y `npm run test -w @tolocharadio/api -- podcasts-playback-token` deben pasar.
- [x] 2.4 Actualizar `docs/arquitectura.md` con el flujo de descarga (token propio, proxy forzado, cabeceras, nombre de archivo y relación con el stream) y verificar que las rutas y decisiones descritas coinciden con el código.

## 3. Configuración pública y OpenAPI

- [x] 3.1 Cambiar `features.podcastDownloads` en `apps/api/src/routes/config.ts` a `config.podcastsEnabled`; verificar con tests de `GET /api/v1/config` con podcasts activos y deshabilitados en `apps/api/test/config.test.ts` y `npm run test -w @tolocharadio/api -- config`.
- [x] 3.2 Documentar `POST /download` y `GET /download` en `apps/api/src/openapi.ts` con parámetros, respuestas `200`/`206`/`400`/`401`/`403`/`404`/`416`/`503`, cabecera `Content-Disposition` y ausencia de exposición de la URL original; verificar con `npm run test -w @tolocharadio/api -- openapi`.
- [x] 3.3 Añadir las dos rutas a la tabla de `docs/api.md` y describir el TTL, el proxy forzado y el nombre de archivo; verificar leyendo el documento contra la implementación y ejecutando `npm run test -w @tolocharadio/api -- openapi`.

## 4. Cliente API y descarga web

- [x] 4.1 Añadir el tipo de respuesta y la función `requestPodcastDownload(episodeId)` en `apps/web/src/lib/api.ts`, apuntando a `POST /podcasts/episodes/:episodeId/download`; verificar con `npm run typecheck -w @tolocharadio/web`.
- [x] 4.2 Crear `apps/web/src/components/podcasts/EpisodeDownloadButton.tsx` y su hook de descarga: estado pendiente, petición del token, creación de un `<a>` oculto y clic (sin `window.open`), aviso de inicio/error con `sonner`, y variantes icono/etiqueta; verificar con `npm run test -w @tolocharadio/web` el markup de las variantes y del estado pendiente, y con prueba manual que el archivo se entrega al gestor de descargas.

## 5. Ficha de episodio en modal

- [x] 5.1 Crear el store `apps/web/src/stores/episodeDetail.ts` con `episode`, `podcast`, `open` y `close`, y montar `EpisodeDetailDialog` una sola vez en `apps/web/src/components/AppShell.tsx`; verificar con `npm run typecheck -w @tolocharadio/web` que la ficha se renderiza por encima del reproductor y de las vistas.
- [x] 5.2 Implementar `apps/web/src/components/podcasts/EpisodeDetailDialog.tsx` con portada, enlace al podcast, título, fecha, duración, temporada/episodio, explícito, progreso y descripción completa con scroll; cubrir los estados sin datos opcionales y la vista móvil; verificar con `npm run test -w @tolocharadio/web` el markup de los estados y con prueba manual la ficha en escritorio y móvil.
- [x] 5.3 Conectar los disparadores: título y tarjeta de `EpisodeRow`, título de `QueuePanel` y título del episodio en `PlayerBar`, ignorando los controles interactivos dentro de la tarjeta; implementar `role="dialog"`, `aria-modal`, foco inicial en cerrar, cierre con Escape/fondo/botón y retorno del foco al disparador; verificar con teclado (Tab + Enter, Escape) y con prueba manual de que reproducir, encolar, favorito y descarga no abren la ficha.
- [x] 5.4 Extraer `useEpisodePlayback(episode, podcast)` para compartir reproducir/pausar/reintentar entre `EpisodeRow`, `QueuePanel` y la ficha, y sincronizar el favorito de la ficha con las cachés de React Query (`podcast-home`, `podcast-episodes`, `podcast-favorites`, `podcast-queue`) y con el estado local de `QueuePanel`; verificar con `npm run test -w @tolocharadio/web`, `npm run typecheck -w @tolocharadio/web` y prueba manual de marcar/quitar favorito desde la ficha y comprobar la fila de la cola sin perder el orden.
- [x] 5.5 Añadir a `docs/uso.md` la sección de detalle de episodio (disparadores, contenido y acciones) y verificar que los pasos descritos coinciden con la interfaz real.

## 6. Botones de descarga en filas y ficha

- [x] 6.1 Añadir `EpisodeDownloadButton` a la fila de `EpisodeRow` con icono, estado pendiente y nombre accesible que incluya el título; verificar en inicio, ficha de podcast y favoritos que la descarga no cambia la reproducción, la cola ni el favorito, y ejecutar `npm run typecheck -w @tolocharadio/web`.
- [x] 6.2 Añadir el control de descarga a `QueuePanel` sin interferir con el asa de arrastre ni con el orden; verificar con prueba manual de descargar y arrastrar en `/podcasts/cola` y con `npm run test -w @tolocharadio/web`.
- [x] 6.3 Añadir el botón de descarga con etiqueta visible a la ficha del episodio, con el mismo estado pendiente y avisos que las filas; verificar con prueba manual desde la ficha abierta desde una fila y desde el reproductor.
- [x] 6.4 Ocultar los controles de descarga cuando `features.podcastDownloads` sea `false`, leyendo la configuración cacheada; verificar con un test de markup/estado que la variante deshabilitada no renderiza el botón y con una prueba manual forzando el valor en la respuesta de `/config`.
- [x] 6.5 Añadir a `docs/uso.md` las instrucciones de descarga (icono en filas, botón en ficha, guardado en el dispositivo y ausencia de reproducción offline) y verificar que coinciden con la interfaz.

## 7. Integración y verificación

- [x] 7.1 Ejecutar `npm run verify:full` y corregir cualquier fallo de typecheck, lint, tests o build.
- [x] 7.2 Reconstruir y levantar Docker con `docker compose up --build -d` y ejecutar el smoke: abrir la ficha desde inicio, ficha de podcast, favoritos, cola y reproductor; descargar desde una fila y desde la ficha; comprobar el nombre y el contenido del archivo; verificar que reproducción, cola, favoritos y radio siguen funcionando.
- [x] 7.3 Probar la descarga en navegador de escritorio y móvil (Chrome/Firefox y Safari si están disponibles) y en la app Tauri; si Safari bloquea la descarga tras la petición asíncrona, añadir el fallback con `<iframe>` oculto y repetir la prueba; si Tauri no guarda el archivo, añadir el handler `on_download` o abrir la URL firmada en el navegador del sistema y repetir la prueba.

## Workflow follow-up

- Confirmar con `git status` que todo el trabajo del change (código, tests, docs y artefactos OpenSpec) está commiteado en la rama feature antes de archivar.
- Archivar el change según `openspec-archive-change`, sincronizar las specs y commitear el archivado en la misma rama.
- Fusionar la rama a `main` con PR y comprobar que los checks `quality` y `docker` están en verde.
- Desde `main` actualizado, ejecutar `node scripts/bump.js minor`, publicar `main`, esperar a que el CI del commit de release esté en verde y publicar el tag `vX.Y.Z` según `AGENTS.md`.
- Comprobar la imagen publicada y, si procede, los instaladores de escritorio.
