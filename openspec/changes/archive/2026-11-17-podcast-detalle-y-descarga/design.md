# Design

## Context

Ver `proposal.md` para la motivación. El estado actual que condiciona el diseño:

- Los episodios se pintan en `EpisodeRow` (inicio, ficha de podcast y favoritos) y en `QueuePanel` (cola). El título es texto plano y la descripción se recorta a dos líneas. El reproductor persistente (`PlayerBar`) muestra el episodio actual sin abrir nada.
- Los listados ya devuelven la descripción completa saneada (hasta 8.000 caracteres), fecha, duración, temporada, número, explícito, progreso y favorito. No hace falta un endpoint de episodio individual para una ficha en modal.
- El DTO de episodio no expone `audioUrl` (`catalog.ts`). El audio se sirve con `GET /podcasts/episodes/:id/stream` y un token HMAC de 6 h (`playbackToken.ts`); `PODCAST_STREAM_MODE` decide entre proxy y redirect.
- `GET /config` ya incluye `features.podcastDownloads`, hoy fijo a `false` y sin uso en la web.
- El escritorio Tauri carga la web remota en un webview; wry trae un handler de descargas por defecto que guarda en la carpeta de descargas del sistema.

## Goals / Non-Goals

**Goals:**

- Ficha de episodio en modal global, accesible desde cualquier lista y desde el reproductor, con descripción completa y acciones.
- Descarga del archivo original desde cada fila y desde la ficha, con una API firmada y proxy.
- Nombre de archivo seguro y predecible, soporte de rangos y errores controlados.
- Mantener intactos reproducción, cola, estadísticas y radio.

**Non-Goals:**

- Biblioteca offline, gestión de archivos descargados o reproducción sin conexión.
- Ruta dedicada o enlaces directos a la ficha del episodio.
- Progreso de descarga dentro de la app: lo gestiona el navegador o el escritorio.
- Cambios en el motor de reproducción, en la base de datos o en las emisoras de radio.
- Interruptor independiente de descargas distinto de `PODCASTS_ENABLED` (se puede añadir después).

## Decisions

### 1. Ficha en modal global, no en ruta dedicada

Se elige un diálogo global montado en `AppShell`. Los datos ya están cargados en las listas, se conserva el scroll y la ficha funciona igual desde inicio, ficha de podcast, favoritos, cola y reproductor.

Alternativas descartadas:

- **Ruta `/podcasts/:podcastId/episodios/:episodeId`**: permite enlaces directos, pero exige un endpoint de episodio individual, una carga extra y perder el contexto de la lista. Se puede añadir después reutilizando el mismo componente.
- **Desplegable en la fila**: incómodo para descripciones largas y para agrupar acciones.

Estado en un store de Zustand (`episode` + `podcast`). El diálogo se monta una sola vez en `AppShell`, por encima del reproductor y de las vistas.

### 2. Disparadores y accesibilidad

- El título de la fila pasa a ser un `<button>` que abre la ficha.
- La tarjeta completa abre la ficha al pulsar zonas no interactivas, ignorando `button`, `a`, `input`, `select` y `textarea`. El clic de tarjeta es una mejora para puntero; el título sigue siendo el disparador accesible.
- En la cola, el título de la fila abre la ficha y el control de descarga no inicia el arrastre. El asa de arrastre sigue siendo el único elemento con listeners de dnd-kit.
- El título del episodio en `PlayerBar` pasa a ser un botón que abre la ficha.
- El diálogo usa `role="dialog"`, `aria-modal`, título accesible, foco inicial en cerrar, cierre con Escape y clic en el fondo, y devuelve el foco al disparador.

### 3. Datos de la ficha

Se reutiliza el objeto `PodcastEpisode` y `PodcastSummary` ya cargados. No se añade endpoint de episodio. La ficha muestra:

- Portada, podcast con enlace, título, fecha, duración, temporada/episodio, badge de explícito.
- Progreso: posición guardada, porcentaje y estado completado.
- Descripción completa, sin `line-clamp`, con scroll dentro del diálogo.

Si en el futuro se quieren enlaces directos, se añadirá `GET /podcasts/episodes/:episodeId` y una ruta que reutilice el mismo contenido.

### 4. API de descarga con propósito propio

Se añaden dos operaciones:

- `POST /api/v1/podcasts/episodes/:episodeId/download` (autenticado): emite `{ url, expiresAt }` y `Cache-Control: no-store`.
- `GET /api/v1/podcasts/episodes/:episodeId/download?u&exp&sig`: sirve el archivo sin exigir Bearer ni cookie.

La firma HMAC se generaliza en `playbackToken.ts` con un propósito (`playback` o `download`) y contextos distintos. Un token de reproducción no vale para descargar y viceversa.

Alternativas descartadas:

- **Reutilizar el token de reproducción con `?download=1`**: menos código, pero mezcla dos operaciones con reglas distintas (proxy forzado, cabeceras, posible cuota futura) y hace más difícil documentar y testear la descarga.
- **Descargar en el cliente con `fetch` + blob**: requiere cargar el archivo en memoria y no funciona bien con audios grandes.
- **Enlace autenticado con Bearer**: una navegación de descarga no puede enviar la cabecera `Authorization`; el token firmado es el mecanismo ya usado para el stream.

### 5. Descarga siempre por proxy

Aunque `PODCAST_STREAM_MODE=redirect`, la descarga no redirige al origen. Un `302` a otro dominio no garantiza `Content-Disposition: attachment` ni un nombre de archivo controlado, y algunos navegadores abren el audio en lugar de descargarlo. El proxy permite además el mismo control de errores y de rangos que el stream.

Consecuencia: la descarga consume ancho de banda del servidor. Es una acción explícita del usuario y el número de descargas esperado es bajo. Si en el futuro molesta, se añadirá un flag independiente y la web ya ocultará los botones cuando `features.podcastDownloads` sea `false`.

### 6. Nombre de archivo

La base es siempre `tolocharadio_` seguida del título del episodio, saneado. El nombre del origen no se usa como base porque algunos feeds sirven nombres numéricos o genéricos; solo aporta la extensión.

La extensión se toma del `Content-Disposition` del origen, del nombre del archivo final o del `Content-Type` (`.mp3`, `.m4a`, `.aac`, `.ogg`, `.opus`, `.flac`, `.wav`), en ese orden, y como reserva `.mp3`. Si el título ya incluye una extensión de audio, se elimina para no duplicarla. Si no hay título, se usa `tolocharadio_episodio-<id>`.

Saneado: se eliminan separadores de ruta, comillas, barras invertidas, caracteres de control y nombres reservados de Windows; se colapsan espacios; se limita a 120 caracteres. Se envía un `filename` ASCII de reserva y `filename*` UTF-8 conforme a RFC 5987.

### 7. Rangos y errores

El handler de descarga comparte con el stream la validación del token, el fetch con protección SSRF, la copia de cabeceras y el aborto al cerrar el cliente. Se reenvía `Range` y se propagan `206` y `416`. En la descarga se añade `Content-Disposition` y se fuerza `Cache-Control: private, no-store`.

Errores:

- Token mal formado → `400 DOWNLOAD_TOKEN_INVALID`.
- Token expirado → `401 DOWNLOAD_TOKEN_EXPIRED`.
- Firma inválida o de otro propósito → `403 DOWNLOAD_TOKEN_FORBIDDEN`.
- Episodio inexistente → `404 EPISODE_NOT_FOUND`.
- Origen no disponible → `503 DOWNLOAD_UNAVAILABLE`.
- Rango no satisfacible → `416` con `Content-Range`.

### 8. Flujo de descarga en el cliente

1. El usuario pulsa el control; el botón se deshabilita y muestra un spinner.
2. Se llama a `POST /podcasts/episodes/:id/download` con el token de acceso.
3. Con la URL firmada se crea un `<a>` oculto y se hace clic; no se usa `window.open` para evitar bloqueadores de ventanas.
4. No se fija el atributo `download`: el nombre lo decide `Content-Disposition`, que funciona igual en navegador y en Tauri.
5. Se muestra el aviso «Descarga iniciada»; el progreso lo pinta el gestor de descargas del sistema.
6. Si falla la petición o el origen, se muestra el error y el botón vuelve a su estado normal.

El token se pide en cada clic para que nunca se use uno caducado.

### 9. Favorito y estado de reproducción compartidos

La ficha reutiliza `useEpisodeFavorite` y la lógica de reproducción de las filas. Para no duplicar el bloque de play/pausa/reintento, se extrae un hook `useEpisodePlayback(episode, podcast)` usado por `EpisodeRow`, `QueuePanel` y la ficha. Los cambios de favorito desde la ficha actualizan las cachés de React Query de las listas (`podcast-home`, `podcast-episodes`, `podcast-favorites`, `podcast-queue`) para que el estado no quede obsoleto al cerrar.

### 10. Configuración pública

`GET /config` pasa a devolver `features.podcastDownloads: config.podcastsEnabled`. No se añade variable de entorno nueva. La web lee ese valor de la caché de configuración y oculta los controles si es `false`.

### 11. Escritorio Tauri

El webview guarda las descargas con el handler por defecto de wry. Se verificará en Linux y, si el entorno lo permite, en Windows/macOS. Si el guardado no funciona, se añadirá un `on_download` en `apps/desktop/src-tauri/src/lib.rs` para fijar la carpeta de descargas o se abrirá la URL firmada en el navegador del sistema.

## Risks / Trade-offs

- **Ancho de banda del proxy** → descarga iniciada por el usuario, sin prefetch; si crece, flag independiente y botones ocultos por configuración.
- **Bloqueo de descarga tras una petición asíncrona en Safari** → probar el clic de ancla; si falla, usar un `<iframe>` oculto con la URL firmada como fallback.
- **Descargas en Tauri** → verificar el handler por defecto; fallback con `on_download` o navegador del sistema.
- **Nombres de archivo poco fiables en el origen** → la base es el título del episodio con prefijo `tolocharadio_`; el origen solo aporta la extensión y nunca se usa para construir rutas del servidor.
- **Audios grandes** → se transmiten en streaming, sin buffer completo; se aborta la petición al cerrar el cliente.
- **Token compartido dentro de su TTL** → misma exposición que el token de reproducción; va ligado a usuario y episodio, no requiere Bearer y caduca en 6 h. Si se quiere endurecer, se puede bajar el TTL.
- **Cabeceras de rango incoherentes en el origen** → se copian las del origen y se cubren con tests de `206` y `416`.
- **La ficha tapa el reproductor** → incluye sus propios controles de reproducción y no altera el estado del reproductor.
- **Estado de favorito obsoleto en listas** → invalidación/actualización de cachés al cambiar desde la ficha.

## Migration Plan

1. Desplegar la API con los endpoints de descarga y `features.podcastDownloads: true` cuando podcasts esté activo.
2. Desplegar la web con la ficha y los botones. Una web antigua ignora los endpoints nuevos.
3. No hay migración de base de datos ni cambios de datos.
4. Rollback: redeploy de la web anterior o de la API anterior. Si hay que cortar la descarga sin tocar la web, se puede desplegar una API que devuelva `podcastDownloads: false` o deshabilitar podcasts por completo; no se pierde ningún dato.
5. Verificar con `npm run verify:full`, `docker compose up --build -d` y smoke manual de reproducción, cola, favoritos y descarga.

## Open Questions

- ¿Hace falta un interruptor independiente de descargas (`PODCAST_DOWNLOADS_ENABLED`) para servidores con poco ancho de banda? Se deja para una fase posterior; la API y la web ya leen `features.podcastDownloads`, así que añadirlo no cambiaría el contrato actual.
- ¿Se quieren enlaces directos a la ficha del episodio? Se deja para una fase posterior; el componente de ficha se podrá reutilizar en una ruta dedicada.
