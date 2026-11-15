# Design

## Context

- `NowPlayingService` (`apps/api/src/services/nowPlaying.ts`) resuelve por formato: directo → `probeIcy`, M3U/PLS → candidatos con `probeIcy`, HLS → `null` sin red. Tiene caché por URL (`Cache<IcyProbeResult>`, 25 s y 10 min para `unsupported`), deduplicación de sondas y aplica `normalizeNowPlaying` al leer.
- Ya hay piezas HLS reutilizables y probadas:
  - `fetchHlsManifest` (texto acotado a 1 MB, 10 s y validación de cuerpo HLS);
  - `parseMasterPlaylist`, `parseMediaPlaylist` y `lastSegment` (`lib/mediaPlaylist.ts`), que solo resuelven URLs **HTTPS** y marcan `encrypted` y `hasMap`;
  - `fetchFollowingRedirects` y `readBytesCapped`.
- El puente de reproducción (`hlsBridge.resolveMedia`) elige la **primera** variante de la maestra y rechaza las playlists cifradas o con `#EXT-X-MAP`. El sondeo debe seguir el mismo criterio para leer la misma rendición que se escucha.
- Mediciones (2026-11-15):
  - Cadena100 HLS (`flumotion`, segmentos `.aac` de ~6 s): los 25 segmentos observados empezaban por `ID3` con `TIT2 = "Artista - Tema"` y `PRIV`. Solo en una pausa sin canción hubo segmentos con `PRIV` y sin `TIT2`.
  - Onda Cero (Triton): `TIT2 = "Advertisement"` durante las cuñas; fuera de ellas, solo `PRIV`/`TENC`.
  - RNE/RTVE: segmentos MPEG-TS sin ID3 al principio.

## Goals / Non-Goals

**Goals:**
- Título para las HLS con ID3 al inicio del segmento, con el mismo contrato del endpoint (`{ id, title }`) y sin tocar el cliente.
- Coste acotado: dos manifiestos de texto y ≤ 16 KB de segmento por sondeo y emisora.

**Non-Goals:**
- Metadatos temporizados dentro de MPEG-TS (PES de ID3 con `stream_type 0x15`) o en `emsg` de fMP4.
- Títulos en `#EXTINF:<dur>,<título>`: en la muestra no hubo ninguno útil (vacíos o «Advertisement»).
- Recorrer toda la ventana de segmentos o recordar el último título visto: si el último segmento no trae título, no se muestra, igual que con ICY.
- Cambios en el puente HLS, que sigue descartando el ID3 del audio.

## Decisions

### D1. Lector ID3v2 puro (`lib/id3.ts`)
`readId3TextFrames(bytes): { title: string | null; artist: string | null } | null`:
- `null` si los bytes no empiezan por `ID3`. Recorre las **etiquetas ID3 consecutivas** del inicio: en Cadena100 HLS una primera etiqueta solo lleva `PRIV` y la siguiente, el `TIT2`, igual que contempla `stripId3Tags`. Gana el primer valor no vacío de cada marco. Admite las versiones 2.3 y 2.4. El tamaño del tag es syncsafe; el de cada marco es syncsafe en 2.4 y de 32 bits normales en 2.3.
- Si el tag tiene cabecera extendida (bit 6 de los flags), se salta usando su tamaño. Si el tag tiene unsynchronisation (bit 7) o un marco está comprimido o cifrado, ese marco se ignora: es raro en directo y no compensa.
- Codificación por el primer byte del marco: 0 → `latin1`, 1 → UTF-16 con BOM, 2 → UTF-16BE, 3 → UTF-8. Se quitan los NUL y se toma el primer valor si hay varios separados por NUL.
- Recorrido acotado al tamaño del tag y a los bytes disponibles. Un marco truncado termina el recorrido sin lanzar excepción.
- *Alternativa:* una dependencia npm (p. ej. `music-metadata`). Se descarta: es mucho peso para leer dos marcos de texto, y añadir dependencias de producción complica la auditoría de la imagen.

### D2. Composición del título
- Hay `TPE1` y `TIT2`, y el título no contiene ya al artista (comparación normalizada, como en el filtro) → `"${artist} - ${title}"`.
- En cualquier otro caso → `TIT2` tal cual.
- `TPE1` sin `TIT2` no se usa como título: el artista solo no dice qué suena.

### D3. Sonda HLS (`probeHlsId3(url, options)`)
Devuelve el mismo `IcyProbeResult` (`title` | `empty` | `unsupported` | `error`) para reutilizar la caché sin cambios:
1. `fetchHlsManifest(url)`. Si es maestra, `parseMasterPlaylist` → primera variante → `fetchHlsManifest` (como máximo 2 niveles, igual que `resolveMedia`).
2. `parseMediaPlaylist`. Si está cifrada o tiene `hasMap` → `unsupported`. Si no tiene segmentos → `error`.
3. `lastSegment` → `fetchFollowingRedirects` con `Range: bytes=0-16383` y sin `Authorization`, y `readBytesCapped`-like que **corta** al llegar a 16 KB aunque el origen ignore el `Range`. Hace falta una variante que trunque en vez de devolver `null`, o leer con un lector manual.
4. `readId3TextFrames`: `null` → `unsupported`; sin título → `empty`; con título → `{ kind: "title", raw, icyName: null }`.
- Un único `AbortController` con tiempo máximo de 5 s para toda la secuencia (no 10 s por manifiesto), combinado con el `signal` de `fetchHlsManifest`.
- En `NowPlayingService.lookup`, `format === "hls"` pasa a llamar a `probeHlsId3` en lugar de devolver `null` antes de consultar la caché. La clave de caché sigue siendo la URL de la emisora.

### D4. Filtro de publicidad
`normalizeNowPlaying` rechaza los títulos que, una vez normalizados (minúsculas, sin tildes), son exactamente uno de `advertisement`, `advert`, `ad`, `ads`, `commercial`, `publicidad`, `anuncio`, `anuncios` o `cuña`/`cuna`. Se compara con el título completo y no por palabras, para no descartar canciones que contengan esas palabras.

### D5. OpenAPI
La descripción del endpoint pasa a decir que HLS se cubre mediante ID3 en segmentos y que TS/fMP4 devuelven `null`.

## Risks / Trade-offs

- [El último segmento de la playlist es el más reciente publicado, no el que está sonando en el cliente (el reproductor va unos segmentos por detrás)] → Desfase de unos 10–20 s con el audio, menor que la caché de 25 s más los 30 s de consulta del cliente. Aceptable.
- [Origen que ignora `Range` y envía el segmento completo, ~50–200 KB] → La lectura se corta a 16 KB y se aborta la conexión.
- [Emisoras que ponen en `TIT2` el nombre de la emisora o un eslogan] → Lo descarta el filtro existente (nombre de la emisora / palabras de directo).
- [Más peticiones por sondeo que ICY (3 frente a 1)] → Cubiertas por la misma caché compartida y la deduplicación; solo ocurren con oyentes activos.
- [ID3 con unsynchronisation o marcos comprimidos] → Se ignoran y se devuelve `null`; no rompe nada.

## Migration Plan

Sin migraciones ni configuración. Despliegue normal. Para revertir, basta con revertir el commit: el cliente ya tolera `title: null`.
