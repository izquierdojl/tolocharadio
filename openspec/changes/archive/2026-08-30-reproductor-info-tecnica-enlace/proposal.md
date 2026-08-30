## Why

El reproductor flotante solo muestra el nombre, el país y el idioma de la emisora en reproducción, de modo que el oyente no conoce la calidad ni el formato de la escucha (bitrate y códec) ni dispone de una forma rápida de compartir el enlace de emisión. Mostrar esta información técnica da transparencia sobre la calidad del stream y facilita compartir la emisora con otros.

## What Changes

- **Información técnica en el reproductor**: junto al nombre de la emisora se muestra su **bitrate** (p. ej. "128 kbps") y su **formato/códec de audio** (p. ej. "MP3", "AAC"), cuando estén disponibles. Se omiten cuando la emisora no aporta esos datos.
- **Botón de copiar enlace de emisión**: se añade en el reproductor un botón que copia al portapapeles el enlace de emisión de la emisora (la URL del stream expuesta por el proxy de playback de la API), con confirmación visual de que se ha copiado.
- **Sin cambios de API**: los datos necesarios (bitrate, códec y URL de emisión) ya están disponibles en el modelo `Station` del frontend.

**Supuestos (decisión de alcance)**:
- La información técnica se deriva del modelo `Station` actual (`bitrate`, `codec`); no se introducen nuevas fuentes de datos ni llamadas extra a la API.
- El "enlace de emisión" que se copia es la URL del stream vía proxy de playback (`/api/v1/playback/:id`), coherente con la reproducción real del reproductor, en lugar de la URL origin de la emisora que puede ser HTTP/inaccesible para otros.
- Esto es un cambio puramente de interfaz: no se altera el backend de playback ni la emisora en sí.

## Capabilities

### New Capabilities
<!-- Ninguna: la funcionalidad se integra en la capacidad web existente. -->

### Modified Capabilities
- `web-ui`: el requisito "Reproductor flotante persistente" se amplía para mostrar la información técnica de la emisora (bitrate y formato/códec) y ofrecer un botón para copiar el enlace de emisión, ambos solo cuando hay una emisora seleccionada/reproduciéndose.

## Impact

- **Web** (`apps/web`): actualización del componente `components/PlayerBar.tsx` para mostrar bitrate/códec y añadir el botón de copiar enlace (usando Clipboard API y estado de confirmación), sin tocar la tienda de reproducción `stores/player.ts` salvo lo necesario.
- **Especificaciones**: delta de `web-ui` (se amplía un requirement existente).
- **Sin cambios de API** (`apps/api`): ningún endpoint, esquema o migración se ve afectado.
- **Sin cambios de backend** en playback, favoritos o historial.
