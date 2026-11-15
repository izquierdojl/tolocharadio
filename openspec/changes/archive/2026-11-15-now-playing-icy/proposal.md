# Proposal

## Why

El reproductor solo muestra el nombre de la emisora, aunque muchas emisoras emiten en sus metadatos ICY (`StreamTitle`) qué está sonando. En una prueba sobre 40 emisoras españolas del catálogo, todas anuncian `icy-metaint` y cerca de la mitad envían un título útil (sobre todo canciones en las musicales). Mostrarlo es barato y aporta contexto inmediato. El navegador no puede leer ICY por sí mismo, así que la lectura debe hacerse en el backend.

## What Changes

- Nuevo endpoint autenticado `GET /api/v1/playback/{stationId}/now-playing` que devuelve el título que suena ahora en la emisora, o `null` si no hay uno válido.
- El backend obtiene el título con una **sonda independiente** del proxy de audio: abre una conexión corta al origen con `Icy-MetaData: 1`, lee el primer bloque de metadatos y la cierra. El flujo de audio que recibe el cliente **no cambia**.
- Resultado cacheado por emisora durante unos 25 s y compartido entre usuarios, con deduplicación de sondas simultáneas y caché negativa más larga para emisoras sin soporte ICY.
- Filtro de calidad del título: se descartan textos vacíos, los que solo repiten el nombre de la emisora o `icy-name`, los de tipo "en directo/live", las URLs o dominios (publicidad) y los códigos internos sin espacios.
- Cubre streams directos y listas M3U/PLS. **HLS (`.m3u8`) queda fuera**: el endpoint responde `title: null` para esas emisoras.
- En el reproductor web aparece una línea "Ahora suena" con el título cuando existe. El cliente solo consulta mientras la emisora está sonando y la pestaña está visible.
- El título (o el nombre de la emisora) se publica en `navigator.mediaSession` para la pantalla de bloqueo y los controles del sistema.

## Capabilities

### New Capabilities
- `now-playing`: obtención, filtrado, caché y exposición del título que suena ahora en una emisora, y su consumo por el cliente (consulta condicionada y Media Session).

### Modified Capabilities
- `web-ui`: el reproductor flotante persistente muestra "Ahora suena" con el título actual cuando está disponible, también en móvil.

## Impact

- **API**: nuevo servicio de sonda ICY y filtro en `apps/api/src/services/`, nueva ruta en `apps/api/src/routes/playback.ts` y documentación en `apps/api/src/openapi.ts`. Reutiliza `fetchFollowingRedirects`, `fetchPlaylist` y `Cache`.
- **Web**: `apps/web/src/lib/api.ts`, `apps/web/src/stores/player.ts` (o un hook dedicado) y `apps/web/src/components/PlayerBar.tsx`.
- **Red**: aproximadamente 16 KB por sonda y emisora cada ~25 s, solo mientras alguien la escucha. Abre una conexión adicional breve al origen.
- **Sin cambios** en el pipe de audio, el puente HLS, el esquema de base de datos, las dependencias, el Dockerfile ni la app de escritorio. La sonda no registra historial ni estadísticas.
