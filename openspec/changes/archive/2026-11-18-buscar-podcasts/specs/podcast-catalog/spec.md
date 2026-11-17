# Spec Delta

## ADDED Requirements

### Requirement: Búsqueda de episodios en todas las suscripciones
El endpoint autenticado `GET /api/v1/podcasts/episodes/search?q=` SHALL devolver, entre los podcasts a los que el usuario está suscrito, los episodios activos cuyo título contenga el término sin distinguir mayúsculas ni acentos, ordenados por fecha de publicación descendente y paginados (`offset`, `limit`, `hasMore`). Si falta `q` o está vacío tras recortar, SHALL responder con error de validación.

#### Scenario: Contenido de cada resultado
- **WHEN** un episodio con progreso empezado y marcado como favorito aparece en los resultados de búsqueda
- **THEN** la respuesta incluye sus datos, el resumen del podcast al que pertenece, su progreso y su estado de favorito

#### Scenario: Búsqueda con resultados de varias suscripciones
- **WHEN** un usuario suscrito a dos podcasts busca `GET /api/v1/podcasts/episodes/search?q=historia`
- **THEN** recibe episodios de ambas suscripciones cuyo título contiene «historia», ordenados del más reciente al más antiguo, y cada resultado incluye el resumen de su podcast

#### Scenario: Coincidencia sin mayúsculas ni acentos
- **WHEN** un usuario busca «camion» y existe un episodio titulado «El camión fantasma»
- **THEN** ese episodio aparece entre los resultados

#### Scenario: Término obligatorio
- **WHEN** un cliente llama a `GET /api/v1/podcasts/episodes/search` sin `q` o con `q` en blanco
- **THEN** el servidor responde con estado `400` y código de error de validación

#### Scenario: Sin resultados
- **WHEN** el término no coincide con ningún episodio de las suscripciones del usuario
- **THEN** el servidor responde `200` con la lista de elementos vacía

#### Scenario: Paginación de resultados
- **WHEN** una búsqueda devuelve más episodios que el `limit` solicitado
- **THEN** la respuesta contiene solo la página solicitada y `hasMore: true`, y una petición con `offset` mayor devuelve la página siguiente

#### Scenario: Aislamiento entre usuarios
- **WHEN** dos usuarios con suscripciones distintas buscan el mismo término
- **THEN** cada uno recibe únicamente episodios de sus propias suscripciones, con su propio progreso y estado de favorito

#### Scenario: Episodios eliminados del feed excluidos
- **WHEN** un episodio que coincidiría con el término fue marcado como eliminado del feed
- **THEN** no aparece en los resultados de búsqueda

## MODIFIED Requirements

### Requirement: Consulta de ficha de podcast y listado paginado de episodios
El sistema SHALL ofrecer el detalle de un podcast (`GET /api/v1/podcasts/:podcastId`) y sus episodios paginados (`GET /api/v1/podcasts/:podcastId/episodes`) con soporte de ordenación (`recent`, `title`, `duration`), filtro de estado (`unplayed`, `in_progress`, `completed`), filtro de texto por título (`q`, coincidencia parcial sin distinguir mayúsculas ni acentos) y paginación (`offset`, `limit`, `hasMore`). No SHALL exponer la URL original del enclosure para reproducción directa, sino referencias al stream de la API.

#### Scenario: Listado paginado y ordenado de episodios
- **WHEN** un usuario autenticado solicita `GET /api/v1/podcasts/:podcastId/episodes?sort=recent&offset=0&limit=20`
- **THEN** recibe los episodios activos del podcast ordenados por fecha de publicación descendente junto con `{ offset, limit, hasMore }`

#### Scenario: Filtrar episodios por título
- **WHEN** un usuario solicita `GET /api/v1/podcasts/:podcastId/episodes?q=camion`
- **THEN** recibe únicamente los episodios activos cuyo título contiene «camion» sin distinguir mayúsculas ni acentos (por ejemplo, «El camión fantasma») y `{ offset, limit, hasMore }` refleja el conjunto filtrado

#### Scenario: Filtro de título combinado con el filtro de estado
- **WHEN** un usuario solicita `GET /api/v1/podcasts/:podcastId/episodes?q=camion&filter=unplayed`
- **THEN** recibe solo los episodios sin empezar cuyo título coincide con el término, con la paginación del conjunto resultante
