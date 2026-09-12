## Context

Ver `proposal.md` — Why. A continuación, el estado actual relevante (diagnóstico pedido en el encargo).

**Cómo entrega hoy el proxy.** El handler `GET /playback/:stationId` vive en `apps/api/src/routes/playback.ts:87`. Resuelve la emisora con `ctx.stations.getStation(...)`, descarga `station.url` con `fetchStream()` (`playback.ts:23`), que sigue hasta 5 redirects manualmente y devuelve la `Response` del origen; si el origen responde OK (`origin.ok`), registra historial (`playback.ts:137`), copia las cabeceras de `COPY_HEADERS` (`playback.ts:11`) y hace `pipe` de los bytes sin inspeccionar extensión, content-type ni contenido. Es decir: los bytes del recurso se entregan tal cual.

**Precheck.** `GET /playback/:stationId/status` (`playback.ts:159`) usa `isPlayable()` (`playback.ts:48`), que hace un GET con `Range: bytes=0-` y lee el primer chunk. Para una emisora de lista hoy devuelve `playable: true` aunque el cliente no pueda reproducirla.

**Seguridad actual.** El fetch al origen solo envía `User-Agent`, `Accept`, `Accept-Encoding` y `Range`; nunca el Bearer del cliente. La URL de la emisora pasa por `sanitizeUrl()` (`normalize.ts:39`), que admite `http:` y `https:`.

**Contrato de referencia.** El contrato Android `specs/0019-.../contracts/playlist-resolution.md` (repo `tolocharadio-android`) define detección por extensión, gramáticas M3U/PLS, filtro HTTPS, orden/dedupe/tope 5, y las categorías de error `NETWORK`/`NO_ENTRIES`/`INSECURE_ONLY`/`MALFORMED` que este backend debe poder mapear a códigos tipados.

## Goals / Non-Goals

**Goals:**

- Que `GET /playback/:stationId` sea transparente para `.m3u8`, `.m3u` y `.pls`, incluyendo HLS maestro y de medios con URIs relativas o absolutas.
- Mantener el historial server-side y un precheck coherente para esas emisoras.
- Endpoint(s) aditivos, con el formato de error existente y sin cambios en el comportamiento de los streams directos.
- Garantías de seguridad: solo HTTPS en URLs resueltas, Bearer nunca a terceros, subrecursos HLS no falsificables (anti-SSRF).

**Non-Goals:**

- Reproducción HLS en el frontend web (requiere hls.js; cambio futuro).
- Cambios en el cliente Android (spec posterior en su repo).
- Formatos `.asx`/`.xspf` y HLS no detectable por URL ni content-type.
- Recursión sobre listas que apuntan a listas.

## Decisions

### D1. Detección por extensión del path

`detectPlaylistFormat(url)`: parsea con `new URL(url)` (la URL ya viene saneada), examina `pathname.toLowerCase()` y devuelve `"hls"` (`.m3u8`), `"m3u"` (`.m3u`), `"pls"` (`.pls`) o `null`. Query y fragmento no afectan. `null` → flujo directo actual sin tocar.

- **Alternativa descartada**: sniffing de content-type/contenido en el flujo directo. Exigiría bufferizar el primer chunk de todo stream (rompe streaming puro y latencia) y queda fuera de alcance según el contrato Android §10.

### D2. Módulos

- `apps/api/src/lib/upstream.ts` (nuevo): `fetchFollowingRedirects(url, headers, { signal })` → `{ response, finalUrl }`, con seguimiento manual de redirects (reutiliza la lógica de `fetchStream` actual) y aborto por signal.
- `apps/api/src/lib/read.ts` (o helper en `upstream.ts`): `readBodyCapped(response, maxBytes)` que lee texto con tope y aborta al superarlo.
- `apps/api/src/services/playlist.ts` (nuevo): `detectPlaylistFormat()`, parsers puros `parseM3u()`/`parsePls()`, `resolveCandidates()` (resolver relativas + filtro HTTPS + dedupe + tope) y `fetchPlaylist()` con timeout 10 s y tope 1 MB.
- `apps/api/src/lib/hls.ts` (nuevo): `signSubresource()`, `verifySubresource()`, `rewriteHlsManifest()` e `isHlsManifest()`.
- `apps/api/src/routes/playback.ts`: orquesta detección y respuestas; el handler directo queda funcionalmente igual.

### D3. Subrecursos HLS con URLs firmadas en un endpoint nuevo

`GET /api/v1/playback/:stationId/hls?u=<base64url>&d=<profundidad>&s=<firma>`.

- `u` = URL absoluta upstream (base64url, sin padding), `d` = profundidad de manifiesto (0..2), `s` = HMAC-SHA256 de `${stationId}\n${d}\n${url}`.
- Clave HMAC derivada con separador de dominio: `HMAC(jwtAccessSecret, "tolocharadio/hls-subresource/v1")`. Así no se añade un secreto nuevo al `.env` y las URLs firmadas se invalidan si rota el secreto (aceptable: el cliente recarga la lista).
- Verificación con `timingSafeEqual`; protocolo debe ser `https:`; `d ≤ 2`. Firma inválida → `403 HLS_INVALID_SIGNATURE`; URL/esquema/profundidad inválidos → `400 HLS_INVALID_URL`.
- El servidor descarga `u` (solo con cabeceras propias; nunca Bearer del cliente), siguiendo redirects. Si el destino es un manifiesto (path `.m3u8`, content-type `*mpegurl*` o cuerpo que empieza por `#EXTM3U`), lo lee con tope 1 MB, lo reescribe con `d+1` y lo sirve como `application/vnd.apple.mpegurl` con `Cache-Control: no-store`. Si no, retransmite los bytes copiando `COPY_HEADERS` y propaga `Range` y el status (incluido `206`).
- **Por qué firmado y stateless**: evita que un cliente autenticado use el proxy como open-proxy/SSRF; funciona con CDNs y redirects a otros hosts (la firma cubre la URL pre-redirect, el servidor sigue el redirect); es válido con varias instancias.

**Alternativas descartadas**:

1. Reescribir el manifiesto a URLs absolutas del host original: mixed-content si el origen es HTTP, CORS para futuros clientes web, y no garantiza HTTPS.
2. Allowlist en memoria de hosts por emisora: stateful, frágil con redirects/CDNs y multi-instancia.
3. Endpoint JSON que devuelva la URL resuelta para que el cliente la reproduzca directa: no restaura el historial server-side (objetivo del cambio).
4. Firmar solo con la URL (sin `stationId`/`d`): permitiría reutilizar subrecursos entre emisoras y no acotaría la profundidad.

### D4. Listas de texto: parseo y resolución

- Descarga de la lista con `fetchFollowingRedirects` (10 s, 1 MB, `User-Agent` de la app). La **URL final tras redirects** es la base para resolver relativas.
- M3U: por línea; se ignoran vacías y las que empiezan por `#`; entrada = primer token de la línea. PLS: claves `FileN` (N entero) ordenadas ascendente; `TitleN`, `LengthN`, `NumberOfEntries` y comentarios (`;`, `#`, `[playlist]`) ignorados.
- Pipeline de candidatos: resolver contra la base → filtrar solo `https:` → deduplicar de forma estable por URL normalizada (`URL.toString()`) → tope 5.
- Errores tipados: sin entradas → `PLAYLIST_EMPTY`; había entradas y todas no-HTTPS → `PLAYLIST_INSECURE_ONLY`; cuerpo no reconocible (ni para `.m3u` ni `.pls`, p. ej. HTML) → `PLAYLIST_MALFORMED`; fallo de red/timeout/size cap → `PLAYLIST_UNREACHABLE`/`PLAYLIST_MALFORMED`.
- Consumo: se prueba el candidato en orden con el mismo `fetchFollowingRedirects` (propagando `Range` del cliente si existe); el primero con respuesta OK se sirve por el proxy y registra historial. Si ninguno responde → error existente `STREAM_UNAVAILABLE`. Sin recursión: una entrada que sea otra lista se trata como candidato normal.

### D5. Reescritura de manifiestos HLS

`rewriteHlsManifest(text, baseUrl, stationId, depth)`:

- Línea a línea, preservando saltos:
  - líneas de directiva (`#...`): se sustituye cada atributo `URI="..."` (cubre `EXT-X-MEDIA`, `EXT-X-KEY`, `EXT-X-MAP`, `EXT-X-I-FRAME-STREAM-INF`, `EXT-X-PART`, etc.);
  - líneas de URI (no `#`, no vacías): se sustituye la línea completa (cubre variantes de la maestra y segmentos de la media).
- Cada URI se resuelve contra `baseUrl` (URL final) y se reemplaza por la URL firmada del endpoint `/hls`.
- Si una URI resuelta no es `https:` → se rechaza el manifiesto completo con `PLAYLIST_INSECURE_ONLY` (no se generan subrecursos inseguros). Las relativas sobre base HTTPS siempre resuelven a HTTPS, así que esto solo afecta a URIs explícitamente no seguras.
- Profundidad: el manifiesto top-level usa `d=0`; cada reescritura incrementa en 1; `d>2` se rechaza (evita cadenas infinitas). Los segmentos heredan la profundidad del manifiesto que los referencia.
- El manifiesto reescrito se sirve con `application/vnd.apple.mpegurl`, `Cache-Control: no-store` (playlists en vivo se refrescan).

### D6. Historial

Se registra (`ctx.history.record`, fire-and-forget, igual que hoy) solo en `GET /playback/:stationId`, tras obtener la primera respuesta OK del origen directo o del candidato ganador. Las peticiones a `/playback/:stationId/hls` no registran historial.

### D7. Precheck

`GET /playback/:stationId/status` mantiene el shape actual `{id, playable, reason?}`:

- Directo: `isPlayable()` sin cambios.
- `.m3u`/`.pls`: se resuelven candidatos; si la resolución falla → `playable:false` con `reason` igual al código tipado (`PLAYLIST_EMPTY`, `PLAYLIST_INSECURE_ONLY`, `PLAYLIST_MALFORMED`, `PLAYLIST_UNREACHABLE`). Si hay candidatos, se prueban en orden (máx. 5) y se devuelve `true` al primero reproducible; si ninguno → `playable:false, reason:"STREAM_UNREACHABLE"`.
- `.m3u8`: se descarga el manifiesto; accesible y con pinta de HLS → `playable:true`; si no, `playable:false` con el motivo correspondiente.
- El status siempre responde `200` (como hoy) y nunca lanza; los motivos nuevos se documentan en OpenAPI.

### D8. Códigos de error y compatibilidad

- Resolución de listas/manifiestos (upstream) → HTTP `503` con `serviceUnavailable(code, message)` y códigos `PLAYLIST_UNREACHABLE`, `PLAYLIST_EMPTY`, `PLAYLIST_INSECURE_ONLY`, `PLAYLIST_MALFORMED`; candidatos agotados → `STREAM_UNAVAILABLE` (existente). Formato `{error:{code,message,status}}` intacto.
- Subrecursos HLS: `400 HLS_INVALID_URL`, `403 HLS_INVALID_SIGNATURE`.
- Mapeo para la futura spec Android: `PLAYLIST_UNREACHABLE`↔`NETWORK`, `PLAYLIST_EMPTY`↔`NO_ENTRIES`, `PLAYLIST_INSECURE_ONLY`↔`INSECURE_ONLY`, `PLAYLIST_MALFORMED`↔`MALFORMED`.
- Directos: sin cambios de status, cabeceras ni comportamiento.

### D9. OpenAPI

- Nuevo path `/playback/{stationId}/hls` (GET, `bearerAuth`, parámetros `u`, `d`, `s`, respuestas 200/400/401/403/404/503).
- `/playback/{stationId}`: descripción de la respuesta 200 ampliada (audio directo o manifiesto HLS reescrito) y 503 documentado con los códigos de lista. Solo aditivo.

### D10. Límites como constantes

`PLAYLIST_FETCH_TIMEOUT_MS = 10_000`, `PLAYLIST_MAX_BYTES = 1_000_000`, `PLAYLIST_MAX_CANDIDATES = 5`, `HLS_MAX_DEPTH = 2`, reutilizando `MAX_REDIRECTS = 5`. Se mantienen como constantes del módulo (estilo actual del repo) en vez de nuevas variables de entorno, para no ampliar la superficie de configuración.

## Risks / Trade-offs

- [El tráfico de segmentos HLS se duplica al pasar por el servidor] → Aceptable en self-hosted; es el precio de garantizar HTTPS al cliente, historial y ausencia de Bearer en terceros.
- [Playlists HLS en vivo se re-descargan en cada refresco del cliente] → `no-store` evita servir manifiestos obsoletos; el coste es el mismo que ya asume el proxy para audio directo.
- [Rotación del secreto JWT invalida URLs firmadas en vuelo] → El cliente vuelve a pedir el manifiesto y obtiene URLs nuevas; no hay estado persistente que migrar.
- [Manifiestos > 1 MB o listas con entradas no-URL] → Error tipado (`PLAYLIST_MALFORMED`/`PLAYLIST_UNREACHABLE`), nunca 200 con bytes inválidos.
- [El precheck de una lista puede probar hasta 5 candidatos secuenciales] → Early-exit al primero reproducible; la app Android no bloquea la reproducción por el precheck (FR-012 de 0019).
- [El frontend web no reproduce HLS] → No hay regresión (hoy tampoco); `.m3u`/`.pls` sí pasan a funcionar en web. HLS web queda como cambio futuro (hls.js).
- [Content-Length copiado del origen en streams] → Comportamiento actual sin cambios; los segmentos HLS con `Range` propagan `206`/`Content-Range`.

## Migration Plan

- Sin migraciones de base de datos ni cambios de esquema. Despliegue normal del backend (`docker compose up --build -d`) y smoke de los flujos directo y de lista.
- Rollback: revertir el despliegue; los streams directos no dependen del código nuevo y las URLs firmadas dejan de pedirse al recargar el manifiesto.
- El cliente Android seguirá usando la reproducción directa hasta su propia spec; este cambio no lo rompe (endpoints existentes intactos).

## Open Questions

- Adopción de hls.js en el frontend web para reproducir `.m3u8` con el proxy: cambio futuro independiente, no afecta a specs, enfoque ni tareas de este change.
