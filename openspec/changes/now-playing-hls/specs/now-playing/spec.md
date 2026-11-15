# Spec Delta

## ADDED Requirements

### Requirement: Lectura de etiquetas ID3 en emisoras HLS
Para emisoras HLS el sistema SHALL obtener el título del último segmento de la playlist de medios, descargando solo su comienzo (unos 16 KB) y leyendo las etiquetas ID3v2 `TIT2` y `TPE1`. Si la maestra tiene variantes, SHALL usar la primera, como la reproducción. Las URLs SHALL ser HTTPS, el sondeo SHALL cortarse a unos 5 segundos y SHALL NOT alterar el audio servido al cliente.

#### Scenario: Segmento con título y artista
- **WHEN** el último segmento empieza con una etiqueta ID3 con `TPE1` "Madonna" y `TIT2` "Sorry"
- **THEN** el sistema devuelve "Madonna - Sorry"

#### Scenario: Título que ya incluye el artista
- **WHEN** el último segmento solo trae `TIT2` "Madonna - Sorry", o trae `TPE1` contenido ya en ese `TIT2`
- **THEN** el sistema devuelve "Madonna - Sorry" sin repetir el artista

#### Scenario: Segmento sin título
- **WHEN** el último segmento empieza con ID3 pero sin `TIT2`, o con `TIT2` vacío (p. ej. solo `PRIV` durante una locución)
- **THEN** el sistema responde `title: null`

#### Scenario: Segmento sin ID3
- **WHEN** el último segmento no empieza con una etiqueta ID3 (p. ej. MPEG-TS) o la playlist está cifrada o usa `#EXT-X-MAP`
- **THEN** el sistema responde `title: null` y trata la emisora como sin soporte de metadatos durante el periodo de caché negativa

#### Scenario: Codificaciones de texto ID3
- **WHEN** las etiquetas usan cualquiera de las codificaciones de texto de ID3v2.3/2.4 (ISO-8859-1, UTF-16 con BOM, UTF-16BE o UTF-8)
- **THEN** el sistema devuelve el texto decodificado correctamente, incluidas tildes y eñes

#### Scenario: Audio HLS intacto
- **WHEN** un cliente reproduce una emisora HLS y a la vez consulta su título actual
- **THEN** el audio que recibe el cliente no cambia respecto a la reproducción sin consulta

#### Scenario: Manifiesto o segmento inaccesible
- **WHEN** el manifiesto, la variante o el segmento no responden, superan el tiempo máximo o devuelven error
- **THEN** el sistema responde `title: null`

## MODIFIED Requirements

### Requirement: Cobertura de formatos de emisora
El sistema SHALL obtener el título de las emisoras de stream directo y de las de lista M3U/PLS, sondeando en este caso las entradas HTTPS de la lista en orden con las mismas reglas de seguridad que la reproducción. Para emisoras HLS (`.m3u8`) el sistema SHALL obtener el título de las etiquetas ID3 de sus segmentos según el requisito de lectura de etiquetas ID3 en emisoras HLS.

#### Scenario: Emisora de lista M3U/PLS
- **WHEN** se consulta el título de una emisora `.m3u` o `.pls` cuya primera entrada HTTPS que responde emite metadatos ICY
- **THEN** el sistema devuelve el título de esa entrada

#### Scenario: Emisora HLS
- **WHEN** se consulta el título de una emisora `.m3u8` cuyos segmentos llevan etiquetas ID3 con título
- **THEN** el sistema devuelve ese título filtrado, con la misma caché que el resto de emisoras

### Requirement: Filtrado de títulos no informativos
El sistema SHALL normalizar el texto recibido (recorte, espacios, caracteres de control y longitud máxima) y SHALL devolver `null` en lugar de un texto que no informe de lo que suena: vacío, solo el nombre de la emisora o su `icy-name`, avisos genéricos de emisión en directo, marcadores de publicidad, URLs o dominios, y códigos internos sin espacios.

#### Scenario: Título igual al nombre de la emisora
- **WHEN** el `StreamTitle` coincide con el nombre de la emisora o con su `icy-name`, o solo contiene palabras de ese nombre, sin distinguir mayúsculas ni tildes (p. ej. "Loca URBAN" en "Loca FM Urban")
- **THEN** el sistema responde `title: null`

#### Scenario: Aviso genérico de directo
- **WHEN** el `StreamTitle` solo combina el nombre de la emisora con expresiones como "en directo", "emisión en directo" o "live"
- **THEN** el sistema responde `title: null`

#### Scenario: Publicidad con URL o dominio
- **WHEN** el `StreamTitle` contiene una URL o un nombre de dominio (p. ej. "shopify.com - ...")
- **THEN** el sistema responde `title: null`

#### Scenario: Marcador de publicidad
- **WHEN** el título recibido es un marcador de cuña publicitaria como "Advertisement", "Advert", "Commercial", "Publicidad" o "Anuncio", sin distinguir mayúsculas
- **THEN** el sistema responde `title: null`

#### Scenario: Código interno
- **WHEN** el `StreamTitle` es un único token sin espacios con guiones bajos o de aspecto técnico (p. ej. "FHR_2026_NatalieRivera_NH")
- **THEN** el sistema responde `title: null`

#### Scenario: Título informativo
- **WHEN** el `StreamTitle` es un texto como "Maná - Clavado en un bar" o "con Antonio San José - FIKA CAFE"
- **THEN** el sistema devuelve el texto normalizado, decodificado correctamente aunque el origen use UTF-8 o Latin-1
