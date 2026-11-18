# Proposal

## Why

La interfaz responde a las pulsaciones con cambios instantáneos de color y apariciones/desapariciones bruscas (menús, modal, reproductor), lo que hace que la aplicación se sienta rígida. Una capa de micro-interacciones solo con CSS haría la usabilidad más atractiva sin añadir dependencias ni riesgo.

## What Changes

- Feedback de pulsación (`active:scale`) en botones principales: reproducir en tarjeta/fila, favorito, copiar enlace, reintentar, toggles de cabecera y controles del reproductor.
- Hover con elevación en tarjetas (`hover:-translate-y`, sombra) y zoom suave de la imagen (`group-hover:scale`).
- Animación "pop" del corazón de favorito al marcar/desmarcar.
- Entrada/salida animada (fade + escala/deslizamiento corto, ~150-200ms) para: menú hamburguesa, menú de usuario, desplegable del combobox y diálogo de confirmación (overlay + caja).
- Entrada deslizante del reproductor (`slide-up`) y transición suave del texto "Ahora suena" al cambiar de emisora; ecualizador CSS de 3 barras cuando hay reproducción.
- Respeto a `prefers-reduced-motion` en todas las animaciones nuevas.
- Sin cambios de API, sin nuevas dependencias, sin cambios de rutas ni de lógica de datos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `web-ui`: añade requisitos de micro-interacciones y movimiento (respuesta a pulsación, hover en tarjetas, entradas/salidas de menús/modal/combobox/reproductor y respeto a movimiento reducido). No cambia textos, rutas ni comportamiento funcional.

## Impact

- Afecta a `apps/web/src/index.css` (keyframes) y a componentes: `StationCard`, `StationListItem`, `FavoriteButton`, `PlayerBar`, `AppShell` (menús), `Combobox`, `ConfirmDialog`, `ThemeToggle`/`ViewModeToggle`.
- Solo CSS + clases Tailwind; sin dependencias nuevas.
- Riesgo bajo; verificar en móvil (<640px) y en ambos temas (claro/oscuro).
