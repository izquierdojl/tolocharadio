# Spec Delta

## ADDED Requirements

### Requirement: Flujo continuo de reproducción
El sistema SHALL exponer `GET /api/v1/playback/:stationId/live`, que entrega el audio de la emisora como un flujo continuo con un tipo de contenido de audio, tanto si el origen es un stream directo como una lista M3U/PLS o un HLS concatenable. NO SHALL entregar manifiestos ni documentos de lista al cliente, y SHALL usar la misma autenticación que el resto de rutas de reproducción.

#### Scenario: Emisora de stream directo
- **WHEN** un cliente autenticado solicita `/live` de una emisora con stream directo disponible
- **THEN** el sistema retransmite el audio como flujo continuo con tipo de contenido de audio

#### Scenario: Emisora de lista M3U o PLS
- **WHEN** un cliente solicita `/live` de una emisora cuya URL es una lista
- **THEN** el sistema resuelve la lista y entrega el primer candidato reproducible como flujo continuo, sin enviar el documento de la lista

#### Scenario: Emisora HLS concatenable
- **WHEN** un cliente solicita `/live` de una emisora HLS con segmentos AAC-ADTS o MP3
- **THEN** el sistema entrega los segmentos concatenados como un flujo continuo y nunca entrega el manifiesto

#### Scenario: Emisora sin audio disponible
- **WHEN** no se puede obtener audio de la emisora
- **THEN** el sistema responde con un error tipado y no con un `200` sin audio

### Requirement: Renovación de la sesión de origen en HLS
Cuando la sesión de un HLS caduque durante la escucha, el sistema SHALL resolver de nuevo la cadena de la emisora y continuar entregando audio mientras el cliente siga conectado, sin terminar la respuesta por el primer error recuperable. SHALL alinear el audio por el instante de programa del manifiesto cuando esté disponible para no repetir ni omitir segmentos.

#### Scenario: Sesión de origen caducada
- **WHEN** la playlist o un segmento de un HLS en curso responde `410` o `404` por sesión caducada
- **THEN** el sistema vuelve a resolver la cadena de la emisora y continúa el flujo con la nueva sesión

#### Scenario: Continuidad del audio
- **WHEN** se renueva la sesión y el manifiesto incluye `EXT-X-PROGRAM-DATE-TIME`
- **THEN** el sistema continúa desde el segmento que sigue al último entregado, sin repetir ni saltar audio

#### Scenario: Renovación imposible
- **WHEN** no se consigue una sesión nueva tras varios intentos
- **THEN** el sistema cierra el flujo y el cliente aplica su reconexión, sin dejar la respuesta abierta en silencio

### Requirement: Rechazo de HLS no concatenable
El sistema SHALL comprobar el contenedor de los segmentos antes de entregar audio y SHALL responder `415` con un error tipado `HLS_UNSUPPORTED_CONTAINER` cuando no sea concatenable (fMP4, MPEG-TS) o esté cifrado con AES, sin enviar bytes de audio ni manifiestos.

#### Scenario: Segmentos fMP4 o MPEG-TS
- **WHEN** un cliente solicita `/live` de un HLS cuyos segmentos son fMP4 o MPEG-TS
- **THEN** el sistema responde `415 HLS_UNSUPPORTED_CONTAINER` con mensaje claro

#### Scenario: Segmentos cifrados
- **WHEN** el manifiesto declara `EXT-X-KEY` de cifrado
- **THEN** el sistema responde `415` sin descargar ni entregar los segmentos

#### Scenario: Segmentos concatenables
- **WHEN** los segmentos son AAC-ADTS o MP3 en claro
- **THEN** el sistema los entrega como flujo continuo

### Requirement: Compatibilidad de las rutas de reproducción existentes
Las rutas `GET /playback/:stationId`, `GET /playback/:stationId/hls` y `GET /playback/:stationId/status` SHALL mantener su comportamiento, autenticación, formas de respuesta y tipos de contenido actuales, incluida la entrega del manifiesto HLS en la ruta principal.

#### Scenario: Manifiesto HLS en la ruta principal
- **WHEN** un cliente solicita `/playback/:id` de una emisora HLS
- **THEN** el sistema sigue entregando el manifiesto reescrito como hasta ahora

#### Scenario: Comprobación de disponibilidad
- **WHEN** un cliente consulta `/playback/:id/status`
- **THEN** la respuesta conserva los campos y códigos de error actuales

#### Scenario: Cliente existente sin cambios
- **WHEN** un cliente externo sigue usando las rutas anteriores sin conocer `/live`
- **THEN** su reproducción no se ve afectada

### Requirement: Reconexión automática del reproductor
El reproductor SHALL detectar que un stream que estaba sonando se ha interrumpido (fin, estancamiento prolongado o error de red) y SHALL reintentar la reproducción con espera creciente, refrescando la sesión antes de cada intento. Tras agotar los reintentos SHALL mostrar un error con opción de reintentar y NO SHALL permanecer indefinidamente en estado de buffering.

#### Scenario: Corte del stream
- **WHEN** el stream en reproducción se corta o el elemento de audio pasa a estado de error de red
- **THEN** el reproductor vuelve a conectar automáticamente sin intervención del usuario

#### Scenario: Stream finalizado
- **WHEN** el origen cierra la conexión y el audio termina
- **THEN** el reproductor lo interpreta como interrupción y vuelve a conectar

#### Scenario: Estancamiento
- **WHEN** el audio deja de avanzar durante el tiempo de vigilancia configurado
- **THEN** el reproductor reinicia la conexión en lugar de esperar indefinidamente

#### Scenario: Token caducado durante la escucha
- **WHEN** la reconexión requiere una sesión nueva y el token de acceso ha caducado
- **THEN** el reproductor lo refresca antes de volver a conectar

#### Scenario: Reintentos agotados
- **WHEN** se agotan los reintentos configurados
- **THEN** el reproductor muestra un estado de error con acción de reintentar y deja de reintentar solo

#### Scenario: Cambio rápido de emisora
- **WHEN** el usuario cambia de emisora mientras hay una conexión en curso
- **THEN** solo la última selección puede llegar a reproducirse
