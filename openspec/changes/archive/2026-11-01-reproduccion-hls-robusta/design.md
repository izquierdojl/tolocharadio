# Design

## Context

Ver `proposal.md` para la motivación. Lo que condiciona el diseño:

- El cliente es un único `HTMLAudioElement` global en `apps/web/src/stores/player.ts`, sin librería HLS y sin capa de recuperación.
- La API ya resuelve listas M3U/PLS y proxya HLS con manifiestos reescritos y subrecursos firmados (`apps/api/src/routes/playback.ts`, `services/playlist.ts`, `lib/hls.ts`).
- StreamTheWorld (Onda Cero) entrega un master que redirige a una sesión con TTL duro de ~60 s; comprobado que con y sin cookies la playlist responde `410` a los ~60 s, y que `EXT-X-MEDIA-SEQUENCE` no avanza.
- Los segmentos de Onda Cero son AAC-ADTS (`ID3` + ADTS, ~165 KB por 10 s), concatenables tal cual.
- El despliegue real está detrás de Apache 2.4.69 con HTTP/2 en `radio.jlizquierdo.com`.
- Existe una app Android externa que consume `/playback/:id`, `/playback/:id/hls` y `/playback/:id/status`.

## Hallazgos del spike (medidos)

- La sesión de StreamTheWorld caduca a los ~60 s con `410`, con y sin cookie jar.
- La playlist es una ventana deslizante de 3-5 segmentos: `EXT-X-MEDIA-SEQUENCE` avanza, el segmento más antiguo se expulsa y responde `410`, y los segmentos no cambian de contenido dentro de la sesión.
- Cada sesión ancla su `EXT-X-PROGRAM-DATE-TIME` a unos 28 s antes de la creación; la rejilla de segmentos **no es global**, así que en la renovación puede haber un desfase de hasta un segmento.
- El atajo progresivo está verificado: `/livestream-redirect/OCAAC.m3u8` → `/livestream-redirect/OCAAC.aac` devuelve `audio/aacp` con ADTS válido. Entra en la v1 como *fast path*.

## Goals / Non-Goals

**Goals:**

- Que una emisora HLS concatenable suene en web, PWA, Tauri (WebView2 y WebKitGTK) y Safari sin depender de MSE.
- Que cualquier corte de stream se recupere solo, sin recargar la página.
- Que el fallo sea visible y accionable en español.
- No cambiar ni un byte del contrato que ya consume la app Android.

**Non-Goals:**

- Transcodificar (no hay ffmpeg en la imagen; el segmento ya es reproducible).
- Soportar fMP4, MPEG-TS o AES-128 en esta versión.
- Compartir una sesión HLS entre oyentes.
- Cambiar el cliente Android.

## Decisions

### D1. Endpoint aditivo `/live` en lugar de cambiar `/playback/:id`

**Decisión:** `GET /api/v1/playback/:stationId/live` es nuevo y devuelve siempre audio continuo. Las tres rutas existentes quedan intactas.

**Por qué:** la app Android depende del comportamiento actual y no podemos verificar cómo consume el manifiesto. Un cambio de tipo de contenido en `/playback/:id` sería el único cambio capaz de romperla; evitándolo, la compatibilidad es trivial de garantizar. Además permite que la web y el escritorio migren sin coordinación con el cliente externo.

**Alternativas:** negociación por `Accept` en `/playback/:id` (frágil: los elementos multimedia envían `*/*`); query param `?format=live` (contamina la ruta existente y sigue siendo un cambio de contrato en la misma URL).

### D2. Puente HLS en servidor en lugar de hls.js

**Decisión:** para HLS con segmentos concatenables, el servidor entrega un flujo continuo AAC/MP3 y el cliente sigue usando `<audio>`.

**Por qué:** (a) la sesión de origen caduca a los ~60 s y la secuencia no avanza, así que un cliente HLS estándar se atasca o necesita re-resolver el master cada minuto; (b) WebKitGTK (Tauri Linux) no garantiza MSE; (c) el cliente ya tiene un `<audio>` persistente y una capa de reconexión que se reutiliza sin añadir 150 KB de dependencia. El servidor ya es dueño de la cadena de origen, así que renovar la sesión ahí es barato.

**Alternativas:** hls.js (descartado por el TTL y por WebKitGTK, no por ser mala opción en general); remux con ffmpeg (descartado: no hay binario en la imagen y multiplica el tamaño).

### D3. Clasificación del origen dentro de `/live`

```
station.url
   |
   +-- .m3u/.pls ---> resolver lista ---> proxy del primer candidato reproducible
   |
   +-- .m3u8 -------> resolver cadena ---> sniff del primer segmento
   |                                          |
   |                                          +-- ADTS/MP3 --> puente
   |                                          +-- fMP4/TS/AES --> 415 tipado
   |
   +-- otro --------> proxy directo (mismo comportamiento que /playback/:id)
```

El sniff se hace sobre los primeros bytes del segmento (`ID3` o `0xFFFx` → concatenable; `ftyp`/`styp` → fMP4; `0x47` → MPEG-TS). Si el manifiesto declara `EXT-X-KEY`, se rechaza sin descargar segmentos.

### D4. Arranque honesto y ritmo de tiempo real

**Decisión:** `/live` no envía la cabecera `200` hasta tener el primer segmento válido. El puente escribe segmentos a medida que la playlist los publica, sin descargar por delante del directo.

**Por qué:** evita el peor síntoma actual (spinner infinito sobre una emisora muerta) y evita llenar el buffer del cliente o la memoria del servidor. Si el puente se retrasa más de una ventana, salta al segmento más reciente para resincronizar.

**Detalle:** `Content-Type` del segmento (`audio/aacp` o `audio/mpeg`), `Transfer-Encoding: chunked`, sin `Content-Length`, `Cache-Control: no-store`. Se respeta la contrapresión de Node (`pipe`/`write` con `drain`).

### D5. Renovación de sesión y alineación por `EXT-X-PROGRAM-DATE-TIME`

**Decisión:** cuando la playlist o un segmento responde `404`/`410`, el puente re-resuelve la cadena completa de la emisora (las 4 redirecciones incluidas) y continúa. La reanudación se alinea por `EXT-X-PROGRAM-DATE-TIME`; si no está disponible, por el último segmento entregado y el índice.

**Por qué:** es la única forma de sobrevivir al TTL de 60 s sin cortar la respuesta. El riesgo real es el empalme: si la nueva sesión arranca por delante, se omite audio; si arranca por detrás, se repite. Con PDT se elige el primer segmento cuyo inicio sea `>=` al final del último entregado, y si no existe, el más cercano.

**Límite:** máximo 3 intentos de renovación por corte; después se cierra el flujo y el cliente reconecta con backoff. Así no se deja una conexión abierta en silencio.

### D6. Atajo opcional: variante progresiva del mismo proveedor

**Decisión:** antes de montar el puente, si la URL es `.m3u8`, probar el mismo path sin extensión + `.aac`/`.mp3` y validar `Content-Type` + primeros bytes. Si responde audio, se proxya directamente.

**Por qué:** en StreamTheWorld funciona (`/livestream-redirect/OCAAC.m3u8` → `/livestream-redirect/OCAAC.aac`) y elimina de raíz el problema del TTL. Es un *fast path* con validación estricta, no la base del diseño: si falla, se sigue con el puente.

**Riesgo:** un `200` con HTML o con otro recurso. Mitigado por content-type y sniff; coste de un intento fallido ~1 s, solo la primera vez por emisora.

### D7. Supervisor de reproducción en el cliente

Estados y transiciones:

```
          play(station)
                |
                v
        +---------------+
        |  CONNECTING   |  ensureValidToken() + src
        +-------+-------+
                | playing
                v
        +---------------+   stall > 15 s   +---------------+
        |    PLAYING    | ---------------> |  RECOVERING   |
        +-------+-------+   ended/error    |  backoff      |
                |                          |  0,1,2,4,8,15 |
                |                          +-------+-------+
                |                                  | ok
                |                                  +-------> PLAYING
                |  fallo tras N intentos
                v
        +---------------+
        |    FAILED     |  mensaje + "Reintentar"
        +---------------+
```

- **Watchdog:** temporizador de 15 s que se reinicia con `timeupdate`/`progress`. Si vence, se trata como estancamiento.
- **Backoff:** 0, 1, 2, 4, 8, 15 s (máximo 30 s), con reinicio del contador tras 60 s de reproducción estable.
- **Auth:** `ensureValidToken()` antes de cada reasignación de `src`. No se introduce ticket firmado en la URL: el refresco de cookie es suficiente y no toca el contrato de autenticación.
- **Carreras:** cada `play()` incrementa un `requestId`; cualquier callback de una petición anterior se descarta.
- **Errores:** `MEDIA_ERR_NETWORK` y `MEDIA_ERR_SRC_NOT_SUPPORTED` → reintento con mensaje distinto; `MEDIA_ERR_DECODE` → fallo no recuperable con mensaje de formato.
- **`src` con cache-buster:** `?r=<n>` en `/live` para evitar reutilización de respuestas cacheadas por el navegador.

**Alternativas:** reconectar solo con `error` (insuficiente: `ended` y los estancamientos no emiten `error`); temporizador de `stalled` nativo (no fiable entre navegadores).

### D8. Estadísticas e historial

El flujo continuo usa `trackListening(..., "hls")` y `pulse` por segmento, y registra historial una sola vez al abrir la conexión. Esto mejora el cálculo actual, donde el HLS solo suma pulsos sin conexión de escucha.

### D9. Proxy inverso Apache

El flujo continuo no necesita keepalive especial, pero sí timeouts holgados y nada de compresión. Configuración recomendada a documentar en `docs/despliegue.md`:

```apache
# Tiempos holgados para conexiones largas de audio
ProxyTimeout 3600

# timeout del worker: margen amplio para streams con datos continuos
ProxyPass        /api/v1/playback/ http://127.0.0.1:3000/api/v1/playback/ timeout=3600
ProxyPassReverse /api/v1/playback/ http://127.0.0.1:3000/api/v1/playback/

# No comprimir audio en ningún caso
SetEnvIf Request_URI "^/api/v1/playback/" no-gzip dont-vary
```

Notas que acompañarán al snippet:

- `Timeout` y `ProxyTimeout` matan conexiones **ociosas**; un stream activo no debería caer por ellos, pero un valor de 1800 explicaría el corte de ~30 min observado.
- Si `mod_http2` está activo, revisar `H2StreamTimeout`; los clientes modernos hablan HTTP/2 con Apache.
- `mod_deflate` no debe tocar `audio/*`; `no-gzip` lo garantiza por ruta.
- El cliente se recupera aunque el proxy corte: la configuración mejora la continuidad, no es un requisito para que funcione.

### D10. Estrategia de pruebas

- **Unitarias:** sniff de contenedor, parseo de PDT, cálculo del siguiente segmento, clasificación de errores del supervisor.
- **Integración API:** origen HLS falso que sirve playlist + segmentos y que responde `410` a los N segundos; se comprueba que `/live` sigue entregando audio tras la renovación.
- **Negativas:** fMP4 → `415`; manifiesto con `EXT-X-KEY` → `415`; origen caído → error tipado, no `200` vacío.
- **Cliente:** temporizador simulado para forzar `ended`, `stal`l y error de red; se comprueba que hay reintento y que el estado final es `FAILED` tras agotar intentos.
- **Regresión de compatibilidad:** snapshots de `/playback/:id`, `/hls` y `/status` para emisora HLS y directa.

## Risks / Trade-offs

- **Empalme audible cada ~50 s en StreamTheWorld** → alineación por PDT y prueba de 3 minutos antes de dar por buena la implementación; si no se consigue, se acepta un salto corto y se documenta, porque la alternativa es no reproducir.
- **El TTL real puede variar por CDN o por emisora** → la renovación se dispara por error (`404`/`410`), no por reloj; el reloj solo sirve para re-resolver de forma preventiva.
- **HLS no concatenable queda fuera** → `415` con mensaje claro; Safari puede seguir usando `/playback/:id` con HLS nativo.
- **Doble descarga por oyente** → coste aceptable en autohospedaje; se puede añadir caché de segmentos compartida más adelante sin cambiar el contrato.
- **Latencia de ~10-20 s** → inherente al tamaño de segmento; suficiente para radio hablada y música.
- **El corte de 30 min de Litera sigue sin causa confirmada** → el supervisor lo recupera; además se añade registro de duración/motivo de cierre en el proxy para poder diagnosticarlo después.

## Migration Plan

1. Desplegar la API con `/live` (aditivo). Nada existente cambia; la app Android no se entera.
2. Desplegar la web usando `/live` para todas las emisoras. Rollback: volver a `/playback/:id` (una constante en `lib/api.ts`).
3. Actualizar `docs/despliegue.md` con la configuración de Apache y revisar el vhost real.
4. Si el puente da problemas en producción, `/live` puede devolver el comportamiento antiguo para HLS (manifiesto) sin tocar `/playback/:id`; el cliente ya sabe caer a HLS nativo cuando recibe `415`.

## Open Questions

- ¿El corte de Litera coincide con los 15 min de la cookie, con un `ProxyTimeout` de 30 min o con un reinicio del relay? El supervisor lo tapa, pero el registro de cierres permitirá confirmarlo después.
- ¿Merece la pena adoptar `/live` también en la app Android? Es una decisión externa a este cambio.

## Propuesta para la app Android externa (fuera de este repo)

La app puede seguir como está: las rutas que usa (`/playback/{id}`, `/playback/{id}/hls` y `/playback/{id}/status`) no cambian. Cuando se quiera mejorar, esta es la propuesta para llevarla a su proyecto:

- Adoptar `GET /api/v1/playback/{stationId}/live` para todas las emisoras. Devuelve audio continuo, también para HLS concatenable, y evita el manifiesto y la caducidad de sesión de ~60 s de StreamTheWorld.
- Si la app usaba el manifiesto HLS de `/playback/{id}` para emisoras `.m3u8`, con `/live` recibe `audio/aac` en lugar de `application/vnd.apple.mpegurl`; ExoPlayer/Media3 lo reproduce igual.
- Para HLS no concatenable, `/live` responde `415 HLS_UNSUPPORTED_CONTAINER`; la app puede caer a `/playback/{id}` con su reproductor HLS si lo tiene.
- Añadir reconexión con espera creciente (equivalente al supervisor web) y refrescar la sesión antes de reconectar.
- Mantener `/playback/{id}/status` para avisar antes de reproducir una emisora no disponible.
