# Tasks

## 1. Lector ID3v2 y filtro (funciones puras)

- [x] 1.1 Implementar `readId3TextFrames` en `apps/api/src/lib/id3.ts` según D1 (v2.3/2.4, cabecera extendida, 4 codificaciones, marcos truncados sin excepción) y la composición del título de D2; verificar con tests en `apps/api/test/id3.test.ts` que construyen tags a mano: título+artista, título que ya incluye al artista, solo `PRIV`, `TIT2` vacío, UTF-16 con BOM y UTF-8 con tildes, v2.3 frente a v2.4, bytes sin `ID3` y tag truncado
- [x] 1.2 Añadir el filtro de marcadores de publicidad (D4) a `normalizeNowPlaying`; verificar en `apps/api/test/nowPlaying.test.ts` que se descartan "Advertisement", "ADVERT" y "Publicidad" y que se conserva un título como "Advertising Space - Robbie Williams"

## 2. Sonda HLS en el servicio

- [x] 2.1 Implementar `probeHlsId3` (D3): maestra → primera variante, playlist de medios, último segmento con `Range` y lectura cortada a 16 KB, 5 s en total y sin `Authorization`; verificar en `apps/api/test/nowPlayingService.test.ts` con `fetch` falso: maestra + medios + segmento con ID3 → título; playlist de medios directa; segmento TS → `unsupported`; playlist cifrada o con `#EXT-X-MAP` → `unsupported`; segmento grande con `Range` ignorado → lectura acotada; origen lento → `error`; cabeceras sin `Authorization`
- [x] 2.2 Conectar HLS en `NowPlayingService.lookup` (sustituye la salida temprana con `null`), con la misma caché y deduplicación; verificar sustituyendo el test "no contacta con el origen para emisoras HLS" por: título HLS filtrado, caché de 25 s, `unsupported` recordado 10 min y "Advertisement" → `null`

## 3. Endpoint y documentación

- [x] 3.1 Actualizar la descripción del endpoint en `openapi.ts` (HLS por ID3; TS/fMP4 → `null`); verificar con `apps/api/test/openapi.test.ts`
- [x] 3.2 Añadir en `apps/api/test/nowPlayingRoute.test.ts` un caso de emisora HLS con ID3 que responde `200 { id, title }` y no registra historial; verificar que pasa junto a los tests existentes de `playback`, `hls*` y `statsPlayback` sin modificarlos

## 4. Integración

- [x] 4.1 Ejecutar `npm run verify:full` y verificar que pasa sin errores
- [ ] 4.2 Smoke con la imagen Docker de la rama en un puerto libre: «Cadena100» (HLS AAC) devuelve el título actual; una emisora Onda Cero HLS devuelve `null` o un título que no es «Advertisement»; RNE Radio 3 (HLS TS) devuelve `null`; Cadena 100 MP3 (ICY) sigue devolviendo su título; y en el navegador aparece «Ahora suena» con la Cadena100 HLS

## Workflow follow-up

- Aplicar a `main` (fast-forward desde la rama del worktree), CI `quality` en verde.
- Archivar el change, commitear todo y, ya en `main`, `node scripts/bump.js minor` → `git push origin main` → CI en verde → push del tag.
