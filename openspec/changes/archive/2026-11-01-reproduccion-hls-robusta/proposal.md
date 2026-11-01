# Proposal

## Why

Dos fallos reales dejan emisoras inutilizables: las que emiten en HLS (`.m3u8`) nunca llegan a sonar porque el cliente usa un `<audio>` sin soporte de manifiestos, y los streams continuos que se cortan (por caducidad de sesión del origen, timeout de red o cierre del relay) no se recuperan nunca: el `<audio>` queda en estado de error y ni siquiera volver a pulsar play lo reinicia. En ambos casos el usuario no recibe ningún mensaje. Además, el despliegue real pasa por un proxy inverso Apache cuya configuración de streaming no está documentada.

## What Changes

- Nuevo endpoint **aditivo** `GET /api/v1/playback/:stationId/live` que devuelve siempre un flujo de audio continuo, resolviendo por dentro el tipo de emisora (directo, lista M3U/PLS o HLS).
- **Puente HLS en servidor** para emisoras HLS con segmentos concatenables (AAC-ADTS y MP3): poll de la playlist, descarga y concatenado de segmentos, ritmo de tiempo real y **renovación de la sesión de origen** cuando caduca (StreamTheWorld la invalida a los ~60 s).
- Rechazo tipado (`415 HLS_UNSUPPORTED_CONTAINER`) para HLS no concatenable (fMP4, MPEG-TS o cifrado AES), con mensaje claro; el cliente puede caer a la reproducción nativa si el navegador la soporta.
- **Supervisor de reproducción en el cliente**: watchdog de estancamiento, reconexión con backoff, refresco de token antes de reasignar la fuente, protección contra carreras al cambiar de emisora y estado de error visible con botón de reintentar.
- Uso real de `GET /playback/:stationId/status` para avisar antes de reproducir una emisora no disponible.
- Documentación de la configuración recomendada del **proxy inverso Apache** (timeouts, `flushpackets`, exclusión de compresión) en `docs/despliegue.md`.
- **BREAKING**: ninguno. Las rutas existentes (`/playback/:id`, `/playback/:id/hls`, `/playback/:id/status`), su autenticación y sus formatos de respuesta no cambian, de modo que la aplicación Android externa sigue funcionando sin tocar nada.

## Capabilities

### New Capabilities

<!-- Ninguna: el comportamiento encaja en capacidades existentes. -->

### Modified Capabilities

- `playback`: nuevo flujo continuo para emisoras HLS, renovación de sesión de origen, detección de contenedor no concatenable y reconexión automática del reproductor del cliente.
- `web-ui`: estado de error y reintento en el reproductor, con mensajes en español y sin spinner infinito.

## Impact

- **API** (`apps/api`): nueva ruta `/live` en `src/routes/playback.ts`, nuevo servicio de puente HLS y pruebas asociadas. Sin cambios de esquema ni de base de datos. Sin dependencias nuevas.
- **Web** (`apps/web`): `src/stores/player.ts`, `src/lib/api.ts` y `src/components/PlayerBar.tsx`. Sin dependencias nuevas (no se añade hls.js).
- **Documentación**: `docs/despliegue.md` (sección de proxy inverso Apache) y, si procede, `docs/arquitectura.md` y `docs/uso.md`.
- **Compatibilidad**: la aplicación Android externa consume `/playback/:id` y `/status`; ambas rutas quedan intactas. La nueva ruta es opcional para ella.
- **Operación**: los timeouts del proxy inverso afectan a la duración de las conexiones largas; se documentan recomendaciones, pero el cliente se recupera aunque el corte se produzca.

## Fuera de alcance

- Transcodificación de audio (no hay ffmpeg): solo se concatenan contenedores que ya son reproducibles tal cual.
- HLS con cifrado AES-128 o fMP4 en esta primera versión.
- Reparto de un mismo flujo HLS entre varios oyentes (cada conexión resuelve y consume su propia sesión de origen).
- Cambios en el cliente Android externo.
