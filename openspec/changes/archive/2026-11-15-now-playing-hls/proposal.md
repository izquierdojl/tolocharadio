# Proposal

## Why

En v0.30.0 «Ahora suena» deja fuera las emisoras HLS (`.m3u8`): el endpoint responde `title: null` sin consultar el origen. Hay emisoras muy escuchadas que solo están en HLS y sí publican el título, por ejemplo la «Cadena100» de 64 kbps AAC: lo llevan en una etiqueta ID3 `TIT2` al principio de cada segmento de audio. En una medición de unos 2 minutos, los 25 segmentos de Cadena100 llevaban el título, y se vio el cambio de canción («Madonna - Sorry» → «Teddy Swims - Mr. know it all»). Ahora esa información pasa por nuestro servidor y se descarta.

## What Changes

- El endpoint `GET /api/v1/playback/{stationId}/now-playing` devuelve también el título de las emisoras **HLS**. Para obtenerlo resuelve el manifiesto (maestro → primera variante, como el puente de reproducción), toma el **último segmento** de la playlist de medios, descarga solo sus primeros KB y lee las etiquetas ID3v2 `TIT2` (título) y `TPE1` (artista).
- Sondeo independiente del audio, como en ICY: no cambian el puente HLS (`stripId3Tags`) ni el proxy.
- Se reutilizan la caché compartida (25 s), la deduplicación y el filtro de títulos. Las HLS sin ID3 al inicio del segmento (contenedor TS, fMP4, cifradas) se tratan como «sin soporte» y se recuerdan 10 minutos.
- El filtro descarta además los marcadores de publicidad de los servidores de anuncios (p. ej. `TIT2 = "Advertisement"` de Triton en Onda Cero).
- **Sin cambios en el cliente**: la web ya muestra el título en cuanto el endpoint lo devuelve.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities
- `now-playing`: la cobertura de formatos incluye HLS mediante ID3 en segmentos (antes `null` sin contactar con el origen), y el filtro descarta los marcadores de publicidad.

## Impact

- **API**: `apps/api/src/services/nowPlaying.ts` (nueva rama HLS), un lector ID3v2 puro (en `apps/api/src/lib/`) y la descripción del endpoint en `openapi.ts`. Reutiliza `fetchHlsManifest`, `parseMasterPlaylist`, `parseMediaPlaylist` y `lastSegment`.
- **Red**: por cada sondeo de una emisora HLS, hasta 2 manifiestos de texto y ≤ 16 KB de un segmento, como mucho cada ~25 s por emisora y solo mientras alguien la escucha.
- **Sin cambios** en la web, el puente HLS, el pipe de audio, el esquema, las dependencias, el Dockerfile ni la app de escritorio.
- **Cobertura esperada** (sondeo de 25 emisoras HLS ES): aportan título las AAC/MP3 con ID3 (Cadena 100 y similares). Las TS (RNE, RTVE…) siguen sin título; Onda Cero/Triton solo envía `Advertisement` en las cuñas, que se filtra.
