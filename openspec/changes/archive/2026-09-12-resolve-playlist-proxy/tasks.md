## 1. Fundamentos de fetch y detección

- [x] 1.1 Extraer `fetchFollowingRedirects(url, headers, {signal})` a `apps/api/src/lib/upstream.ts` (con `MAX_REDIRECTS = 5` y captura de la URL final), reutilizándolo en el handler actual de `playback.ts`; verificar que los tests existentes de playback siguen en verde.
- [x] 1.2 Añadir el helper de lectura de cuerpo con tope en bytes (`readBodyCapped`, texto, 1 MB) y cubrirlo con un test unitario que compruebe corte exacto y error al superar el tope.
- [x] 1.3 Implementar `detectPlaylistFormat(url)` (path sin query, case-insensitive; `.m3u8`→hls, `.m3u`→m3u, `.pls`→pls, resto→null) y verificarlo con tests unitarios de mayúsculas, query/fragmento, sin extensión y URL malformada.

## 2. Parsers y resolución de listas de texto

- [x] 2.1 Implementar `parseM3u(text)` (ignora vacías y `#`; primer token; tolera CRLF) y verificarlo con tests de los ejemplos del contrato Android.
- [x] 2.2 Implementar `parsePls(text)` (`FileN` ordenados por N; ignora `TitleN`, `LengthN`, `NumberOfEntries`, comentarios y sección) y verificarlo con tests unitarios.
- [x] 2.3 Implementar la resolución de candidatos: relativas contra la URL final, filtro solo-HTTPS, deduplicación estable y tope 5; verificar con tests unitarios de relativas, duplicados, mezcla http/https y más de 5 entradas.
- [x] 2.4 Implementar `fetchPlaylist` (timeout 10 s, tope 1 MB, sin Bearer) con errores tipados `PLAYLIST_UNREACHABLE`/`PLAYLIST_MALFORMED` y verificarlo con tests de red caída, timeout y cuerpo sobredimensionado.
- [x] 2.5 Implementar la resolución del candidato ganador con fallback (máx. 5, sin recursión y sin repetir) y verificarla con tests de primer candidato que falla, segundo que responde, y todos agotados → `STREAM_UNAVAILABLE`.

## 3. HLS: firma y reescritura

- [x] 3.1 Implementar `signSubresource`/`verifySubresource` (HMAC derivado de `jwtAccessSecret` con separador de dominio, payload `stationId\nprofundidad\nurl`, comparación timing-safe) y verificarlo con tests de firma válida, firma manipulada y `stationId` distinto.
- [x] 3.2 Implementar `isHlsManifest` (path `.m3u8`, content-type `*mpegurl*` o cuerpo que empieza por `#EXTM3U`) y verificarlo con tests unitarios.
- [x] 3.3 Implementar `rewriteHlsManifest(text, baseUrl, stationId, depth)` reescribiendo líneas de URI y atributos `URI="..."` a URLs firmadas del proxy, preservando directivas; verificar con tests de playlist maestra (variante relativa y absoluta) y de medios (segmentos, `EXT-X-MAP`, `EXT-X-KEY`).
- [x] 3.4 Añadir el rechazo de URIs resueltas no-HTTPS (`PLAYLIST_INSECURE_ONLY`) y el tope de profundidad (`d > 2`), verificados con tests unitarios.

## 4. Rutas: proxy, subrecursos y precheck

- [x] 4.1 Integrar la detección en `GET /playback/:stationId`: `.m3u`/`.pls` sirven el candidato ganador; `.m3u8` sirve el manifiesto reescrito (content-type HLS, `no-store`); sin extensión de lista se mantiene el flujo directo; verificar con tests de ruta (directo sin regresión, `.m3u` y `.m3u8`).
- [x] 4.2 Registrar historial al servir el stream ganador o el manifiesto y no registrarlo en peticiones `/hls`; verificar con tests de ruta sobre `/api/v1/history`.
- [x] 4.3 Implementar `GET /playback/:stationId/hls` (verificación de firma/esquema/profundidad, fetch sin Bearer, manifiesto reescrito vs. bytes, `Range` con `206`, copiado de cabeceras) y verificarlo con tests de ruta de firma inválida (403), URL http (400), variante, segmento y rango.
- [x] 4.4 Adaptar `GET /playback/:stationId/status`: directo sin cambios; listas de texto resuelven candidatos y reportan `playable`/`reason` tipado; `.m3u8` valida el manifiesto; verificar con tests de ruta de cada caso.

## 5. Errores y OpenAPI

- [x] 5.1 Incorporar los códigos tipados (`PLAYLIST_UNREACHABLE`, `PLAYLIST_EMPTY`, `PLAYLIST_INSECURE_ONLY`, `PLAYLIST_MALFORMED`, `HLS_INVALID_URL`, `HLS_INVALID_SIGNATURE`) manteniendo el formato `{error:{code,message,status}}`; verificar con tests que comprueban `error.code` y status.
- [x] 5.2 Documentar `/playback/{stationId}/hls` y los nuevos códigos/motivos en `apps/api/src/openapi.ts`; verificar con `apps/api/test/openapi.test.ts` (el path y los parámetros aparecen y el resto del contrato sigue validando).

## 6. Verificación integral

- [x] 6.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` en la raíz y confirmar que todo pasa.
- [x] 6.2 Levantar `docker compose up --build -d` y hacer smoke autenticado de una emisora directa (sin regresión) y de una emisora `.m3u8`/`.m3u` de prueba servida localmente, comprobando manifiesto reescrito, segmentos y entrada de historial.
- [x] 6.3 Verificar manualmente el flujo HLS completo (maestra → media → segmentos) contra un manifiesto de prueba y anotar en el change cualquier desviación frente a los criterios de aceptación.
