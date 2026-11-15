# Tasks

## 1. Filtro y lectura ICY (backend, funciones puras)

- [x] 1.1 Implementar la extracción de `StreamTitle` de un bloque de metadatos (cierre `';`, bloque vacío, sin patrón) con decodificación UTF-8 estricta y alternativa Latin-1; verificar con tests unitarios en `apps/api/test/nowPlaying.test.ts`, incluido un caso Latin-1 con tildes
- [x] 1.2 Implementar `normalizeNowPlaying(raw, { stationName, icyName })` según D4 (normalización, URL/dominio, código sin espacios, solo palabras del nombre o de directo); verificar con una tabla de tests con los títulos reales observados: rechazar "Loca FM", "Loca URBAN"/"Loca FM Urban", "Remember The Music FM - Emision en directo", "Flaix FM", "shopify.com - …", "FHR_2026_NatalieRivera_NH", "" y " - ", y aceptar "Maná - Clavado en un bar" y "con Antonio San José - FIKA CAFE"

## 2. Servicio de sonda y caché (backend)

- [x] 2.1 Implementar la sonda ICY (`Icy-MetaData: 1`, sin `Authorization`, tiempo máximo de 5 s, `icy-metaint` válido entre 1 y 65536, tope de bytes, aborto tras el primer bloque) con resultados `title | empty | unsupported | error`; verificar con tests que usan un servidor HTTP local que intercala metadatos, otro sin `icy-metaint`, uno lento y uno con `metaint` absurdo
- [x] 2.2 Añadir la resolución por formato: directo → sonda; M3U/PLS → `fetchPlaylist` y candidatos en orden; HLS → `null` sin red; verificar con tests de cada caso (HLS sin peticiones salientes)
- [x] 2.3 Añadir caché por URL (25 s, 10 min para `unsupported`, ~500 entradas) y deduplicación de sondas en curso; verificar con tests que dos consultas simultáneas y una repetida dentro del TTL hacen una sola petición al origen, y que `unsupported` no vuelve a sondear
- [x] 2.4 Registrar el servicio en `AppContext` (`ctx.nowPlaying`) y en la factoría de la app; verificar con `npm run typecheck`

## 3. Endpoint y documentación (backend)

- [x] 3.1 Añadir `GET /playback/:stationId/now-playing` en `routes/playback.ts` → `200 { id, title }`, aplicando el filtro con el nombre de la emisora y sin tocar historial ni estadísticas; verificar con tests de ruta: 401 sin token, 404 con emisora desconocida, título válido, `null` sin metadatos, y que historial y estadísticas no cambian
- [x] 3.2 Documentar el endpoint en `openapi.ts`; verificar con `apps/api/test/openapi.test.ts`
- [x] 3.3 Comprobar que el pipe de audio no cambia: los tests existentes de `playback.test.ts`, `hls*.test.ts` y `statsPlayback.test.ts` siguen en verde sin modificarlos

## 4. Cliente web

- [x] 4.1 Añadir `fetchNowPlaying(stationId)` en `apps/web/src/lib/api.ts` y el campo `nowPlaying` en `usePlayerStore`, que `play()` de otra emisora y `stop()` ponen a `null`; verificar con `npm run typecheck`
- [x] 4.2 Implementar el hook `useNowPlaying` (consulta inmediata y cada 30 s solo con `status === "playing"` y la pestaña visible, descarte de respuestas de otra emisora y errores en silencio); verificar con tests de vitest con temporizadores falsos que cubran inicio, pausa, pestaña oculta, cambio de emisora con respuesta tardía y error
- [x] 4.3 Mostrar "Ahora suena · <título>" en `PlayerBar` en la segunda línea, con prioridad `statusText` > título > país/idioma, recorte y atributo `title`; verificar visualmente en escritorio y en menos de 640px con `npm run dev:web`
- [x] 4.4 Publicar metadatos y `playbackState` en `navigator.mediaSession` con la regla de D6, protegido si la API no existe, y limpiarlos al detener; verificar con un test que simula `navigator.mediaSession` ausente y presente, y manualmente en el navegador (controles multimedia del sistema)

## 5. Integración

- [x] 5.1 Ejecutar `npm run verify:full` y verificar que pasa sin errores
- [x] 5.2 `docker compose up --build -d` y smoke: reproducir una emisora musical con ICY (p. ej. Cadena 100) y ver "Ahora suena" con el título; reproducir una generalista (p. ej. Cadena SER) y ver país/idioma; reproducir una HLS y comprobar que el audio no cambia y no aparece título

## Workflow follow-up

- Rama `worktree-now-playing-icy` + PR hacia `main` (toca API y web): CI `quality` en verde.
- Tras fusionar: archivar el change, commitear todo y, ya en `main`, `node scripts/bump.js minor` → `git push origin main` → CI en verde → `git push origin --tags`.
