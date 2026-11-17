# Podcast Playback Specification

## Purpose

Reproducción bajo demanda de episodios de podcast en TolochaRadio: emisión de tokens de reproducción firmados de larga duración, streaming HTTP con soporte de rangos (`206`/`416`), persistencia idempotente del progreso y sesiones de escucha, y controles de reproducción bajo demanda en el cliente.


## Requirements


### Requirement: Emisión de token de reproducción firmado para episodios
El endpoint autenticado `POST /api/v1/podcasts/episodes/:episodeId/playback` SHALL emitir una URL firmada con HMAC-SHA256 vinculada a `userId`, `episodeId` y timestamp de expiración (`exp`, con TTL por defecto de 6 horas), devolviendo `{ url, expiresAt }` con cabecera `Cache-Control: no-store`.

#### Scenario: Solicitud de token de reproducción válido
- **WHEN** un usuario autenticado solicita `POST /api/v1/podcasts/episodes/42/playback` para un episodio existente
- **THEN** el servidor responde `200 OK` con `{ url: "/api/v1/podcasts/episodes/42/stream?exp=...&sig=...", expiresAt }` y `Cache-Control: no-store`

#### Scenario: Episodio inexistente
- **WHEN** un usuario solicita un token de reproducción para un `episodeId` que no existe
- **THEN** el servidor responde `404` con código `EPISODE_NOT_FOUND`

### Requirement: Streaming de episodios autenticado por firma y con soporte Range
El endpoint `GET /api/v1/podcasts/episodes/:episodeId/stream` (y `HEAD`) SHALL validar la firma HMAC y la expiración `exp` de la query string sin requerir access token ni cookie de sesión. Cuando `PODCAST_STREAM_MODE=proxy` (por defecto), SHALL reenviar la cabecera `Range` cuando exista, devolver `206 Partial Content` con `Content-Range` y `Accept-Ranges`, y propagar `416 Range Not Satisfiable` si el rango solicitado no es válido.

#### Scenario: Petición Range válida con firma vigente
- **WHEN** un reproductor solicita `GET /api/v1/podcasts/episodes/42/stream?exp=...&sig=...` con cabecera `Range: bytes=1024-` y firma vigente
- **THEN** el servidor reenvía el rango al origen y responde `206 Partial Content` con las cabeceras de rango y el flujo de bytes correspondiente

#### Scenario: Firma inválida o expirada
- **WHEN** un cliente solicita el stream con una firma alterada, de otro episodio o con `exp` vencido
- **THEN** el servidor rechaza la petición con estado `401` o `403` sin abrir conexión hacia el servidor de origen

#### Scenario: Rango fuera de límites en el origen
- **WHEN** el cliente solicita un rango `Range` que el servidor de origen rechaza con `416`
- **THEN** el proxy responde `416` al cliente en lugar de convertirlo en `503`

### Requirement: Registro idempotente de progreso y sesiones de escucha
Los endpoints autenticados `PUT` y `POST /api/v1/podcasts/episodes/:episodeId/progress` SHALL recibir `{ sessionId, sequence, positionSec, durationSec, listenedMs, completed, occurredAt, source }`, ignorar envíos con `sequence` menor al último procesado para esa sesión, actualizar la posición del episodio en `podcast_progress` y sumar únicamente el incremento positivo (`delta = max(0, listenedMs - anterior)`) al cubo horario en `user_podcast_stats_hourly`.

#### Scenario: Reintento idempotente del mismo progreso
- **WHEN** el cliente envía dos veces el mismo payload con idéntico `sessionId`, `sequence` y `listenedMs`
- **THEN** el servidor no duplica el tiempo en `user_podcast_stats_hourly` y conserva el estado de la sesión

#### Scenario: Marcado automático de episodio completado
- **WHEN** el cliente reporta `completed: true` o una posición `positionSec >= 0.95 * durationSec` habiendo acumulado al menos el 80 % de la duración escuchada
- **THEN** el servidor marca el episodio como completado registrando `completed_at`

### Requirement: Reproductor unificado con modo bajo demanda
El reproductor del cliente web SHALL utilizar un único elemento `<audio>` y volumen global compartido entre emisoras en vivo (`radio`) y episodios (`podcast`). Al reproducir un episodio, SHALL mostrar el distintivo **PODCAST**, barra de progreso con tiempos actual y total, controles de salto (`-15 s` / `+30 s`), selector de velocidad (`1x`, `1.25x`, `1.5x`, `2x`), integración con `Media Session API` y reanudación desde la última posición guardada cuando esté entre `5 s` y `duración - 30 s`.

#### Scenario: Cambio de radio en vivo a episodio de podcast
- **WHEN** el usuario está escuchando una emisora de radio e inicia la reproducción de un episodio de podcast
- **THEN** la emisión de radio se detiene y el mismo reproductor inicia el episodio mostrando los controles bajo demanda

#### Scenario: Reanudación de episodio en progreso y fin natural
- **WHEN** el usuario reproduce un episodio con progreso guardado en el minuto 12:00 y posteriormente la reproducción llega al evento `ended`
- **THEN** el reproductor inicia en 12:00, y al llegar a `ended` reporta el episodio como completado sin entrar en bucle de reconexión

### Requirement: Reproducción desde listas y desde la cola
Al iniciar la reproducción de un episodio desde una lista o desde la cola de podcasts, el reproductor SHALL reanudar desde la última posición guardada aplicando las mismas reglas que la reproducción directa (ignorar posiciones menores de 5 s o a menos de 30 s del final). Si el episodio ya es el actual, la acción SHALL alternar pausa/reanudación sin reiniciarlo. Un episodio completado SHALL empezar desde el principio.

#### Scenario: Reanudar desde una lista
- **WHEN** un usuario reproduce desde una lista un episodio con progreso guardado en el minuto 12:00
- **THEN** el reproductor inicia el episodio en 12:00

#### Scenario: Alternar el episodio actual
- **WHEN** un usuario activa reproducir o pausar sobre el episodio que ya está cargado
- **THEN** el reproductor alterna el estado sin reiniciar la posición

#### Scenario: Episodio completado
- **WHEN** un usuario reproduce desde una lista o la cola un episodio marcado como completado
- **THEN** el reproductor empieza desde el segundo 0

#### Scenario: Posición no reanudable
- **WHEN** el progreso guardado está por debajo de 5 s o a menos de 30 s del final
- **THEN** el reproductor empieza desde el segundo 0, igual que en la reproducción directa

### Requirement: Orden y agrupación del transporte en podcasts
En modo podcast, el reproductor SHALL mostrar los controles de transporte en una fila propia centrada sobre la barra de progreso, con el botón de retroceder 15 segundos inmediatamente a la izquierda del botón de reproducir/pausar y el de avanzar 30 segundos inmediatamente a su derecha.

#### Scenario: Grupo de transporte centrado
- **WHEN** un usuario reproduce un episodio de podcast en cualquier anchura de pantalla
- **THEN** el reproductor muestra una fila de transporte centrada con retroceder a la izquierda del play y avanzar a su derecha, y la barra de progreso con tiempos y el selector de velocidad quedan debajo

#### Scenario: Orden de tabulación coherente
- **WHEN** un usuario recorre los controles del reproductor de podcast con el teclado
- **THEN** el foco pasa por retroceder, después reproducir/pausar y después avanzar, en el mismo orden en que se ven

#### Scenario: Radio en vivo sin saltos
- **WHEN** un usuario reproduce una emisora de radio en vivo
- **THEN** el reproductor mantiene el botón de reproducir/pausar en la fila superior junto a la información de la emisora y no muestra controles de salto

### Requirement: Tamaño táctil de los controles de transporte
Los tres controles del transporte de podcasts SHALL ofrecer una superficie táctil de al menos 44 por 44 píxeles, con el botón de reproducir/pausar como el mayor del grupo, y los botones de salto SHALL mostrar un icono de rotación y su tiempo de salto (`15 s` retroceder, `30 s` avanzar).

#### Scenario: Objetivos táctiles ampliados
- **WHEN** un usuario ve el transporte de un episodio en pantalla táctil
- **THEN** cada uno de los tres controles ocupa al menos 44 px de alto y de ancho, y el play es mayor que los saltos

#### Scenario: Saltos identificables
- **WHEN** un usuario ve los botones de salto del reproductor de podcast
- **THEN** cada uno muestra un icono de rotación y el tiempo que salta, y expone el nombre accesible "Retroceder 15 segundos" o "Avanzar 30 segundos"

#### Scenario: Sin desbordamiento en móvil
- **WHEN** un usuario ve el reproductor de podcast en una pantalla menor de 640 px
- **THEN** el grupo de transporte cabe centrado sin solaparse con el botón de detener y la barra no cubre la última fila del contenido de la página
