# Proposal

## Why

En modo podcast, los botones de salto (`−15 s` / `+30 s`) están arrinconados al inicio de la segunda fila del reproductor, son pequeños y quedan lejos del botón de reproducir/pausar, que se mantiene arriba a la derecha junto a la miniatura. Saltar es la acción más frecuente al escuchar un episodio y hoy exige apuntar con precisión, especialmente en el móvil. Agrupar el transporte (`retroceder · play · avanzar`) en una fila central, con controles más grandes, hace el reproductor más fácil de usar sin cambiar ninguna funcionalidad de reproducción.

## What Changes

- En modo podcast, el botón de reproducir/pausar deja la fila de metadatos y pasa a una fila de transporte propia, **centrada** en la barra inferior.
- El transporte queda ordenado como **`−15 s` · Play · `+30 s`**: retroceder a la izquierda del play y avanzar a la derecha.
- Los tres controles crecen: play de `44 px` a `56 px` y saltos de `~24 px` a `44 px` de alto, con una etiqueta legible (`15 s` / `30 s`) e icono de rotación. Todos alcanzan el mínimo táctil de 44 px.
- La barra de progreso con tiempos y el selector de velocidad se mantienen, colocados debajo del transporte; la información de metadatos (miniatura, badge PODCAST, título, autor, reintentar y stop) se mantiene en la fila superior.
- En radio en vivo no hay saltos: el play continúa en la fila superior y el reproductor se ve igual que hasta ahora. Tampoco cambian los controles de volumen, copiar enlace ni stop.
- Se ajusta el espacio reservado al final del contenido si la barra más alta lo requiere, para que no tape la última fila de las listas.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `podcast-playback`: se añaden requisitos que especifican la disposición del transporte de podcasts (retroceder a la izquierda del play, avanzar a la derecha, grupo centrado sobre el progreso) y el tamaño mínimo de sus controles.

## Impact

- `apps/web/src/components/PlayerBar.tsx`: el play se renderiza dentro de la fila de transporte cuando el modo es podcast y permanece en la fila superior en radio.
- `apps/web/src/components/podcasts/EpisodePlayerControls.tsx`: los saltos dejan de ser chips pequeños al inicio de la fila; pasan a formar parte del grupo de transporte con tamaños mayores. El componente puede dividirse en transporte y progreso.
- `apps/web/src/components/AppShell.tsx`: posible ajuste del `padding-bottom` del `main` si la barra crece.
- Sin cambios en API, stores, motor de reproducción ni dependencias. Los saltos siguen siendo `-15 s` y `+30 s`, y la Media Session API se mantiene intacta.
- Pruebas: no existen tests de componente para `PlayerBar`; se valora añadir una prueba de renderizado que compruebe el orden (`retroceder`, `play`, `avanzar`) y las etiquetas accesibles.
