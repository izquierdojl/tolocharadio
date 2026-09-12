## Why

La app Android reproduce las emisoras cuyo `station.url` es una lista (`.m3u8`, `.m3u`, `.pls`) **directas por HTTPS, sin proxy**, porque `GET /api/v1/playback/:id` entrega los bytes del recurso tal cual: un manifiesto HLS con URIs relativas se resolvería contra la ruta del proxy y fallaría, y una lista `.m3u`/`.pls` no es audio. Esa excepción impide registrar historial server-side y saltarse el precheck de disponibilidad, y quedó registrada como deuda técnica en `izquierdojl/tolocharadio-android#4` (revisión 2026-10-09).

## What Changes

- **Detección de formato**: por extensión del path de `station.url` sin query, case-insensitive (`.m3u8` → HLS, `.m3u` → M3U, `.pls` → PLS; cualquier otra o ninguna → stream directo actual, sin cambios).
- **Listas de texto `.m3u`/`.pls`**: el proxy descarga, parsea y resuelve server-side la primera entrada HTTPS reproducible (gramática M3U: líneas útiles cuyo primer token es la URL; PLS: claves `FileN` por orden ascendente), con resolución de relativas contra la URL final tras redirects, deduplicación estable, tope de 5 candidatos y fallback al siguiente si el primero falla.
- **HLS `.m3u8`**: el proxy descarga el manifiesto (maestro o de medios), reescribe todas sus URIs (líneas de variante/segmento y atributos `URI="..."`) a URLs firmadas del propio proxy, y sirve variantes, segmentos, mapas y claves a través de un endpoint de subrecursos autenticado. No se rompen los manifiestos con URLs absolutas.
- **Endpoint nuevo** `GET /api/v1/playback/{stationId}/hls` para subrecursos HLS, con URLs firmadas (HMAC) no falsificables: evita SSRF, no reenvía el Bearer del cliente a terceros y solo permite HTTPS.
- **Historial**: reproducir una emisora de lista por el proxy registra historial server-side igual que un stream directo (las peticiones de subrecursos no registran nada).
- **Precheck**: `GET /api/v1/playback/{stationId}/status` sigue funcionando y es coherente para emisoras de lista (resuelve la primera entrada reproducible o valida el manifiesto).
- **Errores tipados** con el formato existente `{error:{code,message,status,details?}}`: `PLAYLIST_UNREACHABLE`, `PLAYLIST_EMPTY`, `PLAYLIST_INSECURE_ONLY`, `PLAYLIST_MALFORMED` (alineados con las categorías `NETWORK`/`NO_ENTRIES`/`INSECURE_ONLY`/`MALFORMED` del contrato Android 0019 para su futura spec).
- **OpenAPI** actualizado con el endpoint nuevo y los códigos de error, retrocompatible.

## Capabilities

### New Capabilities

<!-- Ninguna: se extiende la capacidad existente `playback`. -->

### Modified Capabilities

- `playback`: nuevo requisito de resolución transparente de listas de reproducción en el proxy (detección, M3U/PLS, HLS reescrito/proxeado, seguridad solo-HTTPS, límites, errores tipados y registro de historial) y requisito de descubrimiento ampliado para cubrir emisoras de lista.

## Impact

- **Backend (`apps/api`)**:
  - `src/routes/playback.ts` — orquestación del handler y del precheck (hoy entrega bytes crudos del origen).
  - Nuevos módulos de servicio: detección/parseo M3U-PLS y reescritura/firma de manifiestos HLS.
  - `src/errors.ts` — nuevos códigos tipados (formato existente).
  - `src/openapi.ts` — nuevo endpoint `/playback/{stationId}/hls` y documentación de listas.
  - Tests: `apps/api/test/playback.test.ts` y unitarios nuevos de parsers y reescritura HLS.
- **Contrato `/api/v1`**: solo aditivo. Streams directos, códigos y respuestas actuales no cambian.
- **Android (`tolocharadio-android`)**: habilita una spec posterior para eliminar la excepción de reproducción directa y restaurar historial (issue #4).
- **Fuera de alcance**: reproducción HLS en el frontend web (requeriría hls.js); formatos `.asx`/`.xspf`; HLS no detectable por URL ni content-type.
- **Referencias**: `izquierdojl/tolocharadio-android#4` (deuda); contrato `specs/0019-jlizquierdo-20260911-audio-focus-playlists/contracts/playlist-resolution.md`.
