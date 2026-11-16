## ADDED Requirements

### Requirement: Fecha del episodio pendiente más reciente en el listado de suscripciones
Cada elemento devuelto por `GET /api/v1/podcasts/subscriptions` SHALL incluir `latestPendingEpisodeAt`: la fecha de publicación (milisegundos) del episodio más reciente de ese podcast que esté activo (no eliminado del feed), tenga fecha de publicación y **no esté completado por el usuario autenticado**; los episodios empezados a medias cuentan como pendientes. Si el podcast no tiene ningún episodio pendiente, el valor SHALL ser `null`. El cálculo SHALL ser específico del usuario y NO SHALL alterar el orden por defecto del listado ni el contenido de los demás campos.

#### Scenario: Podcast con episodios pendientes
- **WHEN** un usuario suscrito a un podcast con tres episodios, de los que ha completado el más reciente, solicita `GET /api/v1/podcasts/subscriptions`
- **THEN** `latestPendingEpisodeAt` de ese podcast es la fecha de publicación del segundo episodio más reciente

#### Scenario: Episodio empezado a medias cuenta como pendiente
- **WHEN** el episodio más reciente de un podcast tiene progreso sin completar
- **THEN** `latestPendingEpisodeAt` es la fecha de publicación de ese episodio

#### Scenario: Todos los episodios completados
- **WHEN** el usuario ha completado todos los episodios activos de un podcast
- **THEN** `latestPendingEpisodeAt` de ese podcast es `null`

#### Scenario: Episodios eliminados o sin fecha
- **WHEN** el episodio más reciente de un podcast ha sido eliminado del feed o no tiene fecha de publicación
- **THEN** no se tiene en cuenta para `latestPendingEpisodeAt`

#### Scenario: Aislamiento entre usuarios
- **WHEN** dos usuarios suscritos al mismo podcast han completado episodios distintos
- **THEN** cada uno recibe su propio `latestPendingEpisodeAt`
