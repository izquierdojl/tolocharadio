## MODIFIED Requirements

### Requirement: Portada agregada de podcasts (`/podcasts/home`)

El endpoint autenticado `GET /api/v1/podcasts/home` SHALL devolver en una sola respuesta los episodios en progreso pendientes de terminar (`continueListening`, excluyendo los descartados), los últimos episodios publicados en las suscripciones del usuario (`latestEpisodes`), las suscripciones activas (`subscriptions`) y el resumen de la cola (`queue`).

#### Scenario: Usuario con suscripciones y episodios a medias
- **WHEN** un usuario autenticado solicita `GET /api/v1/podcasts/home`
- **THEN** recibe las listas de continuar escuchando, novedades de sus suscripciones y estado de su cola ordenadas por recencia

#### Scenario: Episodio descartado excluido de continuar escuchando
- **WHEN** un usuario autenticado descarta un episodio y después solicita `GET /api/v1/podcasts/home`
- **THEN** el episodio descartado no aparece en `continueListening`, pero sí puede aparecer en `latestEpisodes` si pertenece a una suscripción

## ADDED Requirements

### Requirement: Descarte persistente de episodios de continuar escuchando

El endpoint autenticado `POST /api/v1/podcasts/episodes/:episodeId/dismiss` SHALL marcar el progreso existente del episodio como descartado (`dismissed_at`) sin alterar posición, duración ni completado. La operación SHALL ser idempotente y no creará progreso si no existe. Un nuevo registro de progreso SHALL limpiar el descarte para que el episodio pueda reaparecer en `continueListening`.

#### Scenario: Descartar un episodio con progreso
- **WHEN** un usuario autenticado envía `POST /api/v1/podcasts/episodes/42/dismiss` para un episodio con progreso
- **THEN** el servidor responde `200` con `{ dismissed: true }` y el episodio deja de aparecer en `continueListening` en todas las sesiones de ese usuario

#### Scenario: Descartar un episodio sin progreso
- **WHEN** un usuario autenticado descarta un episodio que no tiene progreso registrado
- **THEN** el servidor responde `200` con `{ dismissed: false }` y no crea ninguna fila de progreso

#### Scenario: Nuevo progreso tras el descarte
- **WHEN** un usuario descarta un episodio y después registra nuevo progreso en él con otro `sequence`
- **THEN** el descarte se limpia y el episodio vuelve a aparecer en `continueListening`

#### Scenario: Aislamiento entre usuarios
- **WHEN** un usuario descarta un episodio
- **THEN** el descarte no afecta a la lista de continuar escuchando de ningún otro usuario

#### Scenario: Episodio inexistente
- **WHEN** un usuario intenta descartar un `episodeId` que no existe
- **THEN** el servidor responde `404` con código `EPISODE_NOT_FOUND`

### Requirement: Conteo ligero de la cola

El endpoint autenticado `GET /api/v1/podcasts/queue/count` SHALL devolver `{ count, limit }` con el número de episodios en la cola del usuario y el límite configurado, sin cargar los episodios ni sus metadatos.

#### Scenario: Conteo con episodios en cola
- **WHEN** un usuario autenticado con tres episodios en cola solicita `GET /api/v1/podcasts/queue/count`
- **THEN** el servidor responde `200` con `{ count: 3, limit: 200 }` (o el límite configurado)

#### Scenario: Conteo con la cola vacía
- **WHEN** un usuario autenticado sin episodios en cola solicita `GET /api/v1/podcasts/queue/count`
- **THEN** el servidor responde `200` con `{ count: 0, limit: 200 }` (o el límite configurado)

#### Scenario: Aislamiento del conteo por usuario
- **WHEN** dos usuarios tienen colas distintas y cada uno solicita el conteo
- **THEN** cada respuesta refleja únicamente los episodios de su propia cola
