## ADDED Requirements

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

## MODIFIED Requirements

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
