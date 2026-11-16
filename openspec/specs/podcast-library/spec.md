# Podcast Library Specification

## Purpose

Gestión de la biblioteca personal de podcasts del usuario en TolochaRadio: cola de reproducción sincronizada entre dispositivos con control optimista de concurrencia, episodios favoritos, panel de inicio agregado y pantallas web de exploración y reproducción de podcasts.


## Requirements


### Requirement: Cola de reproducción sincronizada con revisión optimista
El sistema SHALL mantener en el servidor una cola ordenada de episodios por usuario (máximo `podcastQueueMax = 200`, sin duplicados) con un número de versión entero (`revision`). Los usuarios autenticados SHALL poder consultar la cola (`GET /api/v1/podcasts/queue`), añadir un episodio al final o como siguiente (`POST /api/v1/podcasts/queue`), quitar un episodio (`DELETE /api/v1/podcasts/queue/:episodeId`) y reordenar la cola (`PUT /api/v1/podcasts/queue/order`) enviando `baseRevision`.

#### Scenario: Añadir y reordenar la cola con revisión vigente
- **WHEN** un usuario añade episodios a su cola y envía `PUT /api/v1/podcasts/queue/order` con un `baseRevision` que coincide con la revisión actual del servidor
- **THEN** el servidor persiste el nuevo orden, incrementa `revision` y devuelve la cola actualizada

#### Scenario: Conflicto de concurrencia al reordenar desde dos dispositivos
- **WHEN** un cliente envía `PUT /api/v1/podcasts/queue/order` con un `baseRevision` obsoleto porque otro dispositivo modificó antes la cola
- **THEN** el servidor rechaza el cambio con estado `409 Conflict` para que el cliente refresque la cola vigente

### Requirement: Avance automático y limpieza de la cola al terminar un episodio
Cuando un episodio en reproducción llega a su final natural (`ended`), el reproductor SHALL marcarlo como completado, eliminarlo automáticamente de la cola del usuario y reproducir el siguiente episodio pendiente en la cola, o detenerse si la cola queda vacía.

#### Scenario: Fin de episodio con más elementos en la cola
- **WHEN** el episodio actual termina y existen más episodios en la cola
- **THEN** el episodio terminado se retira de la cola y comienza automáticamente la reproducción del siguiente episodio

### Requirement: Gestión de episodios favoritos
Los usuarios autenticados SHALL poder guardar episodios como favoritos (`POST /api/v1/podcasts/favorites`), listarlos (`GET /api/v1/podcasts/favorites`) y quitarlos (`DELETE /api/v1/podcasts/favorites/:episodeId`), de forma independiente a las emisoras favoritas de radio y a las suscripciones de programas.

#### Scenario: Marcar y consultar un episodio favorito
- **WHEN** un usuario autenticado añade un episodio a favoritos y consulta `GET /api/v1/podcasts/favorites`
- **THEN** el episodio aparece en la lista de favoritos de podcasts con los datos de su programa y progreso actual, sin alterar las emisoras favoritas de radio

### Requirement: Portada agregada de podcasts (`/podcasts/home`)

El endpoint autenticado `GET /api/v1/podcasts/home` SHALL devolver en una sola respuesta los episodios en progreso pendientes de terminar (`continueListening`, excluyendo los descartados), los últimos episodios publicados en las suscripciones del usuario (`latestEpisodes`), las suscripciones activas (`subscriptions`) y el resumen de la cola (`queue`).

#### Scenario: Usuario con suscripciones y episodios a medias
- **WHEN** un usuario autenticado solicita `GET /api/v1/podcasts/home`
- **THEN** recibe las listas de continuar escuchando, novedades de sus suscripciones y estado de su cola ordenadas por recencia

#### Scenario: Episodio descartado excluido de continuar escuchando
- **WHEN** un usuario autenticado descarta un episodio y después solicita `GET /api/v1/podcasts/home`
- **THEN** el episodio descartado no aparece en `continueListening`, pero sí puede aparecer en `latestEpisodes` si pertenece a una suscripción

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

### Requirement: Vistas web de Podcasts y renderizado seguro de portadas
La interfaz web SHALL ofrecer a los usuarios autenticados las vistas `/podcasts`, `/podcasts/descubrir`, `/podcasts/suscripciones`, `/podcasts/:podcastId`, `/podcasts/cola` y `/podcasts/favoritos`. Las portadas de podcasts y episodios SHALL renderizarse mediante `<img>` con `referrerPolicy="no-referrer"`, `loading="lazy"` y fallback al icono de podcast.

#### Scenario: Explorar ficha de podcast y filtrar episodios
- **WHEN** un usuario autenticado abre `/podcasts/:podcastId` y cambia el filtro a episodios en progreso o no escuchados
- **THEN** la lista se actualiza paginadamente mostrando acciones para reproducir, añadir a la cola y marcar favorito
