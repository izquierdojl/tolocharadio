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
El endpoint autenticado `GET /api/v1/podcasts/home` SHALL devolver en una sola respuesta los episodios en progreso pendientes de terminar (`continueListening`), los últimos episodios publicados en las suscripciones del usuario (`latestEpisodes`), las suscripciones activas (`subscriptions`) y el resumen de la cola (`queue`).

#### Scenario: Usuario con suscripciones y episodios a medias
- **WHEN** un usuario autenticado solicita `GET /api/v1/podcasts/home`
- **THEN** recibe las listas de continuar escuchando, novedades de sus suscripciones y estado de su cola ordenadas por recencia

### Requirement: Vistas web de Podcasts y renderizado seguro de portadas
La interfaz web SHALL ofrecer a los usuarios autenticados las vistas `/podcasts`, `/podcasts/descubrir`, `/podcasts/suscripciones`, `/podcasts/:podcastId`, `/podcasts/cola` y `/podcasts/favoritos`. Las portadas de podcasts y episodios SHALL renderizarse mediante `<img>` con `referrerPolicy="no-referrer"`, `loading="lazy"` y fallback al icono de podcast.

#### Scenario: Explorar ficha de podcast y filtrar episodios
- **WHEN** un usuario autenticado abre `/podcasts/:podcastId` y cambia el filtro a episodios en progreso o no escuchados
- **THEN** la lista se actualiza paginadamente mostrando acciones para reproducir, añadir a la cola y marcar favorito
