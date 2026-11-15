# Podcast Catalog Specification

## Purpose

Gestión del catálogo global de podcasts y episodios en TolochaRadio: descubrimiento mediante directorio externo o URL directa, ingesta y refresco seguro de feeds RSS/Atom con protección SSRF, suscripciones por usuario e importación/exportación OPML.


## Requirements


### Requirement: Bloqueo cuando la funcionalidad de podcasts está deshabilitada
Cuando `PODCASTS_ENABLED` esté desactivado en la configuración del servidor, cualquier petición a las rutas `/api/v1/podcasts/*` SHALL ser rechazada con estado HTTP `403` y código de error `PODCASTS_DISABLED`.

#### Scenario: Petición a ruta de podcasts con la función desactivada
- **WHEN** un cliente llama a cualquier endpoint bajo `/api/v1/podcasts/*` estando `PODCASTS_ENABLED=false`
- **THEN** el servidor responde con estado `403` y código `PODCASTS_DISABLED`

### Requirement: Protección SSRF en ingesta y resolución de feeds
El sistema SHALL validar toda URL externa antes de realizar peticiones de red y en cada salto de redirección (máximo 5 redirecciones). Solo SHALL permitir esquemas `http:` y `https:` en puertos `80` o `443`, y SHALL bloquear resoluciones DNS hacia direcciones loopback, rangos privados, link-local y endpoints de metadatos cloud.

#### Scenario: Intento de resolver un feed en red privada o loopback
- **WHEN** un usuario solicita resolver o suscribirse a una URL cuyo host resuelve a `127.0.0.1`, `10.0.0.1`, `169.254.169.254` o `::1`
- **THEN** el sistema aborta la conexión y devuelve un error de validación o URL no permitida sin realizar la petición

#### Scenario: Redirección hacia una IP privada
- **WHEN** un feed público responde con una redirección `302` hacia una dirección IP privada o loopback
- **THEN** el sistema bloquea el salto de redirección y rechaza la ingesta

### Requirement: Búsqueda en directorio externo configurable
El endpoint autenticado `GET /api/v1/podcasts/search?q=` SHALL buscar podcasts en el proveedor configurado (`itunes` por defecto o `podcastindex` cuando esté configurado) desde el servidor y cachear las respuestas en memoria. Si `PODCAST_DISCOVERY_PROVIDER=none`, el endpoint SHALL responder indicando que el descubrimiento externo está deshabilitado.

#### Scenario: Búsqueda con proveedor activo
- **WHEN** un usuario autenticado busca un término en `GET /api/v1/podcasts/search?q=historia` con proveedor `itunes`
- **THEN** el servidor consulta al proveedor, cachea el resultado y devuelve la lista normalizada con título, autor, portada, `feedUrl` y categorías

#### Scenario: Búsqueda con proveedor desactivado
- **WHEN** un usuario llama a `GET /api/v1/podcasts/search?q=historia` con `PODCAST_DISCOVERY_PROVIDER=none`
- **THEN** el servidor responde con error controlado indicando que la búsqueda por directorio no está habilitada

### Requirement: Resolución e ingesta de feeds RSS y Atom
El sistema SHALL descargar y parsear feeds RSS 2.0 (con namespace iTunes) y Atom hasta el tamaño máximo `PODCAST_FEED_MAX_BYTES` (5 MB por defecto), extrayendo los metadatos del programa y los episodios con enclosure de audio. Los episodios sin `guid` SHALL recibir un identificador determinista derivado de `audio_url` y fecha de publicación. Las URLs de imagen SHALL validarse para admitir únicamente `http:` o `https:`.

#### Scenario: Previsualización de un feed válido
- **WHEN** un usuario autenticado envía `POST /api/v1/podcasts/resolve` con una `feedUrl` válida
- **THEN** el servidor descarga y valida el feed, persiste o actualiza el podcast y sus episodios en el catálogo global y devuelve la ficha del podcast con sus episodios recientes

#### Scenario: Feed que supera el límite de tamaño o no es XML válido
- **WHEN** el servidor intenta descargar un feed cuyo cuerpo supera `PODCAST_FEED_MAX_BYTES` o no es un feed RSS/Atom válido
- **THEN** cancela la lectura y responde con un error descriptivo sin corromper el catálogo

### Requirement: Gestión de suscripciones por usuario
Los usuarios autenticados SHALL poder listar sus suscripciones (`GET /api/v1/podcasts/subscriptions`), suscribirse a un podcast por `feedUrl` o `podcastId` (`POST /api/v1/podcasts/subscriptions`) hasta el límite `podcastSubscriptionsMax` (200 por defecto) y cancelar su suscripción (`DELETE /api/v1/podcasts/subscriptions/:podcastId`). El catálogo de podcasts y episodios SHALL compartirse globalmente entre usuarios sin duplicar feeds.

#### Scenario: Suscripción a un podcast
- **WHEN** un usuario autenticado envía `POST /api/v1/podcasts/subscriptions` con una `feedUrl` válida y no ha alcanzado el límite de suscripciones
- **THEN** el podcast queda asociado a su cuenta y aparece en `GET /api/v1/podcasts/subscriptions`

#### Scenario: Dos usuarios suscritos al mismo feed
- **WHEN** un segundo usuario se suscribe a un `feedUrl` que ya existe en el catálogo
- **THEN** el sistema reutiliza el registro global de `podcasts` y crea únicamente la fila de relación en `podcast_subscriptions`

#### Scenario: Límite de suscripciones alcanzado
- **WHEN** un usuario con 200 suscripciones intenta añadir una nueva
- **THEN** el servidor rechaza la operación con error de límite alcanzado

### Requirement: Importación y exportación OPML
El sistema SHALL permitir importar suscripciones en lote mediante `POST /api/v1/podcasts/subscriptions/bulk` (hasta `podcastOpmlMaxFeeds` feeds, 200 por defecto) devolviendo el resumen de altas, duplicados y errores, y SHALL permitir exportar las suscripciones actuales del usuario en formato XML OPML 2.0 mediante `GET /api/v1/podcasts/subscriptions/opml`.

#### Scenario: Importación en lote de feeds desde OPML
- **WHEN** un usuario autenticado envía una lista de URLs de feeds a `POST /api/v1/podcasts/subscriptions/bulk`
- **THEN** el servidor procesa las suscripciones válidas, ignora las ya existentes y devuelve el recuento de importadas y fallidas

#### Scenario: Exportación de suscripciones en OPML
- **WHEN** un usuario autenticado solicita `GET /api/v1/podcasts/subscriptions/opml`
- **THEN** recibe un documento XML OPML con todas sus suscripciones activas

### Requirement: Consulta de ficha de podcast y listado paginado de episodios
El sistema SHALL ofrecer el detalle de un podcast (`GET /api/v1/podcasts/:podcastId`) y sus episodios paginados (`GET /api/v1/podcasts/:podcastId/episodes`) con soporte de ordenación (`recent`, `title`, `duration`), filtro de estado (`unplayed`, `in_progress`, `completed`) y paginación (`offset`, `limit`, `hasMore`). No SHALL exponer la URL original del enclosure para reproducción directa, sino referencias al stream de la API.

#### Scenario: Listado paginado y ordenado de episodios
- **WHEN** un usuario autenticado solicita `GET /api/v1/podcasts/:podcastId/episodes?sort=recent&offset=0&limit=20`
- **THEN** recibe los episodios activos del podcast ordenados por fecha de publicación descendente junto con `{ offset, limit, hasMore }`

### Requirement: Refresco periódico y poda segura de episodios
El servidor SHALL refrescar periódicamente los feeds con suscriptores activos usando cabeceras condicionales (`ETag` y `Last-Modified`), concurrencia acotada, *single-flight* por feed y backoff exponencial ante fallos. Al podar feeds con más de 500 episodios, el sistema NO SHALL eliminar episodios referenciados por progreso, favoritos, cola o estadísticas, marcando `removed_at` cuando desaparezcan del feed.

#### Scenario: Feed sin cambios responde 304
- **WHEN** el planificador refresca un feed que devuelve `304 Not Modified` ante el `ETag` guardado
- **THEN** actualiza `last_fetched_at` sin reprocesar los episodios

#### Scenario: Episodio desaparecido del feed pero con datos de usuario
- **WHEN** un episodio antiguo ya no viene en el XML del feed pero está referenciado por un usuario
- **THEN** el episodio se conserva en base de datos y no se borra físicamente
