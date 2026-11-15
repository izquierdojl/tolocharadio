# Design

## Context

- El audio llega al navegador por el proxy de la API (`/playback/:id` y `/playback/:id/live`). `upstreamHeaders()` en `apps/api/src/routes/playback.ts` no pide `Icy-MetaData`, así que hoy el origen no intercala metadatos y el `<audio>` recibe audio limpio. Si los pidiéramos en ese pipe, habría que separar los bloques del audio; el navegador no sabe hacerlo.
- El pipe de audio y el puente HLS se acaban de estabilizar (v0.29.0 / v0.29.1). Este change no debe tocarlos.
- Ya hay piezas reutilizables: `fetchFollowingRedirects` y `readBytesCapped` (`lib/upstream.ts`), `detectPlaylistFormat` y `fetchPlaylist` (`services/playlist.ts`), y `Cache<T>` con TTL por entrada (`services/cache.ts`). Los endpoints auxiliares de reproducción siguen el patrón `/playback/:stationId/<acción>` (p. ej. `/status`) y obtienen la emisora con `ctx.stations.getStation(id, userId)`, que también resuelve emisoras propias.
- En el cliente, `usePlayerStore` (Zustand) guarda `station` y `status`, y `PlayerBar` muestra en la segunda línea `statusText ?? país/idioma`. No se usa `navigator.mediaSession` en ningún sitio.
- Prueba previa (40 emisoras ES): todas anuncian `icy-metaint` (1024–16384). El título viene en el **primer** bloque o el bloque viene vacío. Las generalistas (SER, COPE, RNE, Marca) envían bloques vacíos.

## Goals / Non-Goals

**Goals:**
- Ninguna latencia ni riesgo añadido al audio: la sonda falla en silencio y se queda en `title: null`.
- Coste acotado por emisora, no por oyente.
- Filtro como función pura y bien probada: es donde está el valor percibido.

**Non-Goals:**
- HLS (ID3 temporizado en segmentos, `#EXTINF` con título). Se puede añadir en otro change extrayendo el ID3 antes de `stripId3Tags`.
- Parrillas de programación por horario (capa 2 de la exploración).
- Push en tiempo real (SSE/WebSocket) y detección exacta del cambio de canción.
- Manejadores de acciones de Media Session (play/pause desde el sistema). Solo se publican metadatos y estado.
- Separar "artista" y "canción": el texto se muestra tal cual.

## Decisions

### D1. Sonda independiente en lugar de separar los metadatos en el proxy
`NowPlayingService.probe(url)` hace su propio `fetch` con `Icy-MetaData: 1`, el mismo `User-Agent` de la app, `Accept-Encoding: identity` y sin `Authorization`. Lee `icy-metaint` bytes de audio y los descarta, lee 1 byte de longitud (×16) y ese bloque, y aborta.
- *Alternativa:* separar los metadatos en `pipeOrigin`. Sale gratis en red y da cambios exactos, pero modifica el pipe crítico, solo funciona mientras alguien escucha por ese proceso y complica los tests existentes. Se descarta por ahora. Si se necesita, encaja como optimización sin cambiar la spec.
- Límites: tiempo total de 5 s; `icy-metaint` válido solo si es un entero entre 1 y 65536 (si no, `unsupported`); tope de lectura `metaint + 1 + 4080` bytes.
- El tiempo de espera se aplica al conjunto (redirecciones + lectura) con un `AbortController`.

### D2. Resultado de la sonda y caché
La sonda produce un resultado interno `{ kind: "title", raw, icyName } | { kind: "empty" } | { kind: "unsupported" } | { kind: "error" }`.
- Caché `Cache<string | null>` con clave **URL de la emisora** (no el id de usuario), así que la comparten todos los usuarios y las emisoras propias con la misma URL. TTL: 25 s para `title`, `empty` y `error`, y 10 min para `unsupported`. Un máximo de ~500 entradas.
- Deduplicación: `Map<url, Promise>` de sondas en curso. La segunda petición simultánea espera a la misma promesa.
- El filtro se aplica **al leer**, no al guardar, porque depende del nombre de la emisora y la entrada de caché se comparte. La caché guarda `raw` e `icyName`.

### D3. Listas M3U/PLS
Se reutiliza `fetchPlaylist(format, url, { userAgent })`, que ya descarta lo que no es HTTPS, deduplica y limita a 5 candidatos. Se sondean los candidatos en orden y vale el primero que devuelva `title` o `empty`. Si todos fallan, el resultado es `error`. La caché de la lista se guarda con la URL de la lista.
- HLS: `detectPlaylistFormat(url) === "hls"` devuelve `title: null` de inmediato, sin red.

### D4. Decodificación y filtro (`normalizeNowPlaying`)
Función pura en `services/nowPlaying.ts` (o `lib/icy.ts`):
1. Extraer `StreamTitle='…';` del bloque. Si no hay patrón, `null`. El valor puede contener `'`, así que se busca el cierre `';`.
2. Decodificar con `TextDecoder("utf-8", { fatal: true })` y, si falla, con `latin1`. Limpiar caracteres de control, colapsar espacios, recortar y limitar a 200 caracteres.
3. Rechazar (`null`) si:
   - queda vacío o solo hay separadores (`-`, `|`, `·`);
   - contiene `://`, `www.` o un token con forma de dominio (`\b[\p{L}\d-]+\.(com|net|org|es|fm|info|io|tv|radio|eu|cat)\b`, sin distinguir mayúsculas);
   - es un único token sin espacios que contiene `_` o mide más de 24 caracteres;
   - tras normalizar (minúsculas, sin tildes, sin puntuación) y quitar las palabras del nombre de la emisora, las de `icy-name`, las palabras de directo (`en`, `directo`, `emision`, `live`, `online`, `streaming`, `radio`, `fm`, `la`, `el`) y los separadores, no queda ningún token.

   Así se cubren los casos observados: "Loca FM", "Loca URBAN" (en "Loca FM Urban"), "Remember The Music FM - Emision en directo", "Flaix FM", "shopify.com - …" y "FHR_2026_…". "Maná - Clavado en un bar" y "con Antonio San José - FIKA CAFE" se conservan.

### D5. Endpoint
`GET /api/v1/playback/:stationId/now-playing` (auth) → `200 { id, title: string | null }`. Errores de `getStation` (404, etc.) se propagan como en `/status`. No se llama a `ctx.history` ni a `ctx.stats`. El servicio se instancia en el contexto (`ctx.nowPlaying`) para poder sustituirlo por uno falso en los tests de ruta. Se documenta en `openapi.ts`.

### D6. Cliente
- `fetchNowPlaying(stationId)` en `lib/api.ts`.
- Hook `useNowPlaying()` montado en `PlayerBar`, separado del `PlaybackEngine` para no tocarlo. Se suscribe a `station.id` y `status` del store y a `visibilitychange`:
  - activo si `status === "playing"` y `document.visibilityState === "visible"`: consulta de inmediato y luego `setInterval` de 30 s;
  - inactivo: limpia el intervalo y conserva el último título (en pausa se sigue viendo);
  - al cambiar `station.id`, pone el título a `null` e ignora respuestas tardías comprobando el id;
  - los errores se ignoran en silencio.
- El título vive en el store como `nowPlaying: string | null` (y no en el estado local del hook), para que Media Session y `PlayerBar` lean la misma fuente. `stop()` y `play()` de otra emisora lo ponen a `null`.
- Media Session: un efecto que, si existe `"mediaSession" in navigator`, asigna `new MediaMetadata({ title: nowPlaying ?? station.name, artist: nowPlaying ? station.name : "TolochaRadio", artwork: favicon ? [{ src: favicon }] : [] })` y `playbackState` según `isPlaying`. Al no haber emisora, `metadata = null` y `playbackState = "none"`. Todo envuelto en `try/catch`.
- `PlayerBar`: segunda línea = `statusText ?? (nowPlaying ? "Ahora suena · " + nowPlaying : país/idioma)`, con `title` en el `span` para mostrar el texto completo. Se ve igual en todas las anchuras.

## Risks / Trade-offs

- [Conexión extra al origen; alguna emisora limita oyentes simultáneos] → La conexión dura menos de 1–2 s, como máximo cada 25 s por emisora y solo con oyentes activos. Si una emisora rechaza la sonda, queda en `error` o `unsupported` sin afectar al audio.
- [El primer bloque puede venir vacío aunque luego llegue un título] → Se acepta: es el comportamiento habitual de Icecast/Shoutcast (envían el título actual al conectar). Se reintenta en el siguiente ciclo.
- [Desfase de hasta ~55 s (25 s de caché + 30 s de consulta) respecto al cambio real] → Aceptable para "Ahora suena". Se pueden ajustar las constantes sin cambiar la spec.
- [Falsos positivos o negativos del filtro] → Función pura con tests de tabla basados en los títulos reales observados. Fácil de afinar.
- [Mojibake en emisoras Latin-1] → Primero UTF-8 estricto y, si falla, Latin-1.
- [Carga si muchos usuarios escuchan emisoras distintas] → Caché acotada (~500 entradas) y sondas de pocos KB. Sin estado persistente.

## Migration Plan

Sin migraciones ni configuración nueva. Despliegue normal. Si hubiera problemas, se revierte el commit: el endpoint es aditivo y el cliente tolera su ausencia (errores ignorados, `title: null`).
