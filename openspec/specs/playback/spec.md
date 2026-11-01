# Playback Specification

## Purpose

Permite escuchar las emisoras en el navegador mediante un proxy de audio del backend que retransmite el stream de la emisora, evitando bloqueos por mixed-content y problemas de CORS. El reproductor del cliente mantiene la reproducción de forma persistente.

## Requirements

### Requirement: Proxy de streaming por la API
El sistema SHALL exponer un endpoint de streaming por el que el cliente reproduce el audio de una emisora: la API retransmite el stream desde la URL del origen hacia el cliente, sirviéndolo sobre HTTPS con los mismos tipos de contenido de audio.

#### Scenario: Reproducción vía proxy
- **WHEN** un cliente autenticado solicita el stream de una emisora válida mediante el endpoint de streaming
- **THEN** la API retransmite el flujo de audio desde la URL de la emisora al cliente con los tipos de contenido de audio adecuados

#### Scenario: Stream sobre HTTPS seguro
- **WHEN** la URL de origen de la emisora usa HTTP
- **THEN** el flujo llega al cliente a través de la API en HTTPS, sin bloqueos de mixed-content

#### Scenario: Emisora sin stream o sin acceso
- **WHEN** un cliente solicita el stream de una emisora sin URL válida o que no puede reproducirse
- **THEN** el sistema responde con un error de audio/no disponible (4xx/5xx según el caso) y mensaje claro

### Requirement: Resolución de listas de texto (M3U/PLS)
El sistema SHALL detectar si el path de la URL de una emisora termina en `.m3u` o `.pls` (ignorando query y mayúsculas) y resolver la lista server-side, entregando por el proxy autenticado la primera entrada HTTPS reproducible como un stream continuo. Para cualquier otra extensión o sin extensión, el proxy SHALL comportarse exactamente como hasta ahora (stream directo).

#### Scenario: Detección de formato de lista
- **WHEN** una emisora tiene una URL cuyo path termina en `.m3u` o `.pls`, ignorando la query y sin distinguir mayúsculas
- **THEN** el sistema la trata como lista de texto y no entrega el documento de la lista al cliente como si fuera audio

#### Scenario: Stream directo sin cambios
- **WHEN** una emisora tiene una URL sin extensión de lista (u otra extensión)
- **THEN** el sistema retransmite el stream directo con el comportamiento y los códigos de respuesta actuales

#### Scenario: Parseo de lista M3U
- **WHEN** la lista es M3U y contiene líneas vacías, comentarios (`#EXTM3U`, `#EXTINF`, …) y líneas de URL
- **THEN** el sistema ignora las líneas vacías y las que empiezan por `#`, y toma como entrada el primer token de cada línea útil

#### Scenario: Parseo de lista PLS
- **WHEN** la lista es PLS con claves `FileN`, `TitleN`, `LengthN`, `NumberOfEntries` y comentarios
- **THEN** el sistema considera entradas solo las claves `FileN`, ordenadas por `N` ascendente, ignorando el resto

#### Scenario: Resolución de URLs relativas
- **WHEN** una entrada de la lista es relativa
- **THEN** el sistema la resuelve contra la URL final de la lista tras seguir las redirecciones

#### Scenario: Orden, deduplicación y tope de candidatos
- **WHEN** la lista contiene entradas repetidas o más de cinco entradas HTTPS
- **THEN** el sistema deduplica de forma estable preservando el orden y evalúa como máximo cinco candidatos

#### Scenario: Fallback al siguiente candidato
- **WHEN** el primer candidato HTTPS no responde correctamente al solicitarlo
- **THEN** el sistema intenta el siguiente candidato de la lista, sin recursión sobre listas que apunten a listas y sin repetir candidatos

#### Scenario: Lista que apunta a otra lista
- **WHEN** una entrada de la lista apunta a su vez a un recurso de lista
- **THEN** el sistema la trata como un candidato más (sin volver a parsearla) y continúa con el siguiente candidato si falla

### Requirement: Proxy transparente de HLS (.m3u8)
El sistema SHALL detectar si el path de la URL de una emisora termina en `.m3u8` (ignorando query y mayúsculas) y servir el HLS a través del proxy autenticado, de modo que el cliente no necesite resolver ninguna URI: el sistema SHALL reescribir manifiestos maestros y de medios (líneas de variante y segmento, y atributos `URI="..."` de `#EXT-X-MEDIA`, `#EXT-X-KEY`, `#EXT-X-MAP`, `#EXT-X-I-FRAME-STREAM-INF`, …) para que variantes, segmentos, mapas y claves se soliciten al propio proxy, y SHALL retransmitir esos subrecursos.

#### Scenario: Manifiesto con URIs relativas
- **WHEN** un cliente autenticado solicita una emisora `.m3u8` cuyo manifiesto usa URIs relativas
- **THEN** el sistema entrega el manifiesto con esas URIs reescritas a URLs del propio proxy y el cliente puede reproducir la emisora de forma continua

#### Scenario: Playlist maestra y de medios
- **WHEN** el manifiesto es una playlist maestra que referencia variantes `.m3u8` o es una playlist de medios que referencia segmentos
- **THEN** el sistema reescribe cada nivel y sirve tanto las variantes como los segmentos a través del proxy

#### Scenario: Manifiesto con URLs absolutas
- **WHEN** el manifiesto ya usa URLs absolutas
- **THEN** el sistema las reescribe igualmente para que se sirvan a través del proxy, sin romper la reproducción

#### Scenario: Subrecursos con Range
- **WHEN** el cliente solicita un segmento a través del proxy con cabecera `Range`
- **THEN** el sistema propaga la petición de rango al origen y retransmite la respuesta

### Requirement: Seguridad y límites en la resolución de listas
El sistema SHALL descartar cualquier URL resuelta que no use HTTPS (incluidos `http`, `rtsp`, `file` u otros esquemas) y SHALL garantizar que el token Bearer del cliente nunca se reenvíe a hosts de terceros. Las URLs de subrecursos HLS servidas al cliente SHALL estar firmadas de forma no falsificable por el servidor, de modo que no puedan usarse para acceder a URL arbitrarias (SSRF). El sistema SHALL aplicar un tiempo máximo de descarga de unos 10 segundos y un tamaño máximo de cuerpo de unos 1 MB para listas y manifiestos de texto, y SHALL limitar las redirecciones y la profundidad de listas anidadas para evitar bucles.

#### Scenario: Entradas no HTTPS descartadas
- **WHEN** una lista contiene entradas `http`, `rtsp` o `file`
- **THEN** el sistema las descarta y nunca las entrega al cliente

#### Scenario: Bearer no reenviado a terceros
- **WHEN** el sistema descarga una lista, un manifiesto o un subrecurso HLS de un host de terceros
- **THEN** la petición saliente no incluye la cabecera de autorización del cliente

#### Scenario: URL de subrecurso falsificada
- **WHEN** un cliente solicita un subrecurso HLS con una firma inválida o con una URL que no procede de un manifiesto servido por el sistema
- **THEN** el sistema rechaza la petición con un error tipado y no descarga la URL indicada

#### Scenario: Lista o manifiesto demasiado grande o lento
- **WHEN** la descarga de una lista o manifiesto supera el tiempo máximo o el tamaño máximo permitido
- **THEN** el sistema aborta la descarga y devuelve un error tipado

### Requirement: Errores tipados en la resolución de listas
El sistema SHALL devolver errores con el formato existente `{error:{code,message,status,details?}}` cuando una lista no pueda resolverse, y SHALL NOT responder `200` con bytes que no sean audio reproducible.

#### Scenario: Lista vacía
- **WHEN** la lista no contiene ninguna entrada
- **THEN** el sistema devuelve un error tipado `PLAYLIST_EMPTY`

#### Scenario: Lista solo con entradas no HTTPS
- **WHEN** la lista contenía entradas pero todas fueron descartadas por no ser HTTPS
- **THEN** el sistema devuelve un error tipado `PLAYLIST_INSECURE_ONLY`

#### Scenario: Lista no reconocible
- **WHEN** el cuerpo descargado no tiene una gramática M3U o PLS reconocible
- **THEN** el sistema devuelve un error tipado `PLAYLIST_MALFORMED`

#### Scenario: Lista o manifiesto inaccesible
- **WHEN** no se puede descargar la lista o el manifiesto por un fallo de red
- **THEN** el sistema devuelve un error tipado `PLAYLIST_UNREACHABLE`

#### Scenario: Ningún candidato responde
- **WHEN** todos los candidatos HTTPS de la lista fallan al conectar
- **THEN** el sistema devuelve un error tipado de stream no disponible

### Requirement: Historial de reproducción de emisoras de lista
El sistema SHALL registrar el historial server-side cuando un usuario autenticado reproduce una emisora de lista a través del proxy, con el mismo comportamiento que un stream directo. Las peticiones de subrecursos HLS (variantes, segmentos, mapas o claves) SHALL NOT registrar historial.

#### Scenario: Reproducción de lista registra historial
- **WHEN** un usuario autenticado consume por el proxy una emisora `.m3u`, `.pls` o `.m3u8` que se resuelve correctamente
- **THEN** el sistema registra la reproducción en el historial del usuario igual que para un stream directo

#### Scenario: Subrecursos HLS sin historial
- **WHEN** el cliente solicita variantes o segmentos de un HLS a través del proxy
- **THEN** el sistema no añade nuevas entradas al historial del usuario

### Requirement: Descubrimiento de reproducción
El cliente SHALL poder comprobar si una emisora es reproducible antes de iniciar la escucha, consultando el estado de disponibilidad de su stream. Para emisoras de lista, el sistema SHALL resolver la lista o el manifiesto y comprobar si existe al menos una entrada HTTPS reproducible, informando del motivo cuando no sea así.

#### Scenario: Verificación de disponibilidad
- **WHEN** el cliente consulta la disponibilidad de stream de una emisora
- **THEN** el sistema devuelve si la emisora es reproducible y, si no lo es, el motivo

#### Scenario: Disponibilidad de emisora de lista resoluble
- **WHEN** el cliente consulta la disponibilidad de una emisora `.m3u`, `.pls` o `.m3u8` que tiene al menos una entrada HTTPS reproducible o un manifiesto accesible
- **THEN** el sistema responde `playable: true`

#### Scenario: Disponibilidad de emisora de lista no resoluble
- **WHEN** el cliente consulta la disponibilidad de una emisora de lista vacía, solo con entradas no HTTPS, no reconocible o inaccesible
- **THEN** el sistema responde `playable: false` con un motivo coherente con el error de resolución

### Requirement: Reproducción persistente en el cliente
El reproductor del frontend SHALL mantener la emisora sonando y su estado (emisora actual, reproduciendo/pausado, volumen) aunque el usuario navegue entre vistas de la aplicación. Cuando el token de acceso haya expirado, el reproductor SHALL refrescarlo automáticamente antes de iniciar una nueva reproducción.

#### Scenario: La música continúa al navegar
- **WHEN** un usuario está reproduciendo una emisora y navega a otra sección
- **THEN** la emisora sigue sonando y el reproductor muestra la misma emisora y estado

#### Scenario: Control de reproducción
- **WHEN** un usuario usa los controles del reproductor flotante
- **THEN** el sistema inicia, pausa o cambia el volumen/emisora de forma inmediata

#### Scenario: Cambio de emisora con token expirado
- **WHEN** un usuario cambia de emisora y el token de acceso ha expirado
- **THEN** el reproductor refresca el token automáticamente y reproduce la nueva emisora sin interrupción perceptible para el usuario

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
