# Spec Delta

## Purpose

Descarga segura del archivo de audio original de un episodio de podcast a través de la API, con tokens firmados, proxy del enclosure, soporte de rangos y nombres de archivo seguros.

## ADDED Requirements

### Requirement: Emisión de token de descarga firmado
El endpoint autenticado `POST /api/v1/podcasts/episodes/:episodeId/download` SHALL emitir una URL firmada con HMAC-SHA256, vinculada al usuario, al episodio y a una expiración, y responder `{ url, expiresAt }` con `Cache-Control: no-store`. La firma SHALL usar un propósito de descarga distinto al de reproducción.

#### Scenario: Solicitud válida de descarga
- **WHEN** un usuario autenticado solicita `POST /api/v1/podcasts/episodes/42/download` para un episodio existente
- **THEN** el servidor responde `200 OK` con una URL `/api/v1/podcasts/episodes/42/download?u=...&exp=...&sig=...`, `expiresAt` y `Cache-Control: no-store`

#### Scenario: Episodio inexistente
- **WHEN** un usuario autenticado solicita la descarga de un `episodeId` que no existe
- **THEN** el servidor responde `404` con código `EPISODE_NOT_FOUND`

#### Scenario: Token de reproducción usado como descarga
- **WHEN** un cliente usa en el endpoint de descarga una firma emitida para el endpoint de reproducción
- **THEN** el servidor rechaza la petición con `403 DOWNLOAD_TOKEN_FORBIDDEN` sin abrir conexión al origen

### Requirement: Descarga proxy del archivo original
El endpoint `GET /api/v1/podcasts/episodes/:episodeId/download` SHALL validar la firma y la expiración sin exigir access token ni cookie, y SHALL servir el contenido original del enclosure a través del proxy de la API. La respuesta SHALL incluir `Content-Disposition: attachment` y conservar el tipo de contenido y el tamaño del origen cuando estén disponibles.

#### Scenario: Descarga completa
- **WHEN** un cliente solicita la URL firmada de descarga de un episodio disponible
- **THEN** el servidor responde `200` con los bytes originales, el `Content-Type` del origen y `Content-Disposition: attachment` con un nombre de archivo

#### Scenario: Descarga parcial con Range
- **WHEN** el cliente envía `Range: bytes=0-1023` a la URL de descarga
- **THEN** el servidor reenvía el rango al origen y responde `206 Partial Content` con `Content-Range`, `Accept-Ranges` y `Content-Disposition`

#### Scenario: Rango no satisfacible
- **WHEN** el origen rechaza el rango solicitado con `416`
- **THEN** el servidor propaga `416` con `Content-Range` en lugar de convertirlo en `503`

#### Scenario: Firma inválida o expirada
- **WHEN** la URL de descarga tiene una firma alterada, pertenece a otro episodio o su `exp` ya venció
- **THEN** el servidor responde `400`, `401` o `403` según el caso sin abrir conexión al origen

#### Scenario: Origen no disponible
- **WHEN** el servidor de origen responde con error o no se puede conectar
- **THEN** el servidor responde `503` con código `DOWNLOAD_UNAVAILABLE`

### Requirement: Descarga siempre mediante proxy
Aunque `PODCAST_STREAM_MODE=redirect`, el endpoint de descarga SHALL obtener el archivo a través del proxy de la API y NO SHALL redirigir al enclosure original.

#### Scenario: Modo redirect
- **WHEN** el servidor está configurado con `PODCAST_STREAM_MODE=redirect` y un usuario descarga un episodio
- **THEN** la respuesta es el archivo servido por la API con `Content-Disposition: attachment`, no un `302` al origen

### Requirement: Nombre de archivo seguro
El servidor SHALL construir el nombre de archivo de la descarga como `tolocharadio_` seguido del título del episodio, saneado y limitado a 120 caracteres. La extensión SHALL tomarse del `Content-Disposition` del origen, del nombre del archivo final o del `Content-Type`, en ese orden, y la respuesta SHALL incluir `filename` ASCII y `filename*` UTF-8.

#### Scenario: Título del episodio con acentos
- **WHEN** el episodio se titula «Crónica del bosque» y el origen sugiere un nombre numérico
- **THEN** la descarga se llama `tolocharadio_Crónica del bosque.mp3` con codificación UTF-8 válida

#### Scenario: Nombre numérico del origen ignorado
- **WHEN** el origen sugiere `987654321.mp3` y el episodio se titula «Mi episodio»
- **THEN** la descarga se llama `tolocharadio_Mi episodio.mp3`, no `987654321.mp3`

#### Scenario: Título malicioso
- **WHEN** el título del episodio contiene `../../etc/passwd`
- **THEN** el servidor sirve un nombre sin separadores de ruta ni componentes de navegación, con prefijo `tolocharadio_`

#### Scenario: Sin extensión en el origen
- **WHEN** el origen no ofrece extensión y responde `Content-Type: audio/mp4`
- **THEN** el servidor añade la extensión `.m4a` al nombre `tolocharadio_<título>`

#### Scenario: Sin título ni metadatos
- **WHEN** el episodio no tiene título y el origen no ofrece nombre ni extensión utilizables
- **THEN** el servidor usa `tolocharadio_episodio-<id>.mp3`

### Requirement: Disponibilidad pública de las descargas
La respuesta pública `GET /api/v1/config` SHALL exponer `features.podcastDownloads` como `true` cuando `PODCASTS_ENABLED` esté activo y como `false` cuando los podcasts estén deshabilitados.

#### Scenario: Podcasts y descargas disponibles
- **WHEN** un cliente consulta `GET /api/v1/config` con `PODCASTS_ENABLED=true`
- **THEN** recibe `features.podcastDownloads: true`

#### Scenario: Podcasts deshabilitados
- **WHEN** un cliente consulta `GET /api/v1/config` con `PODCASTS_ENABLED=false`
- **THEN** recibe `features.podcastDownloads: false`

### Requirement: No exposición de la URL original
El endpoint de emisión de descarga NO SHALL devolver ni incluir en JSON la URL original del enclosure. La única referencia externa SHALL ser la URL firmada de la API.

#### Scenario: Respuesta de emisión de token
- **WHEN** un usuario solicita `POST /api/v1/podcasts/episodes/42/download`
- **THEN** la respuesta contiene únicamente `url` y `expiresAt`, y no la URL del enclosure original
