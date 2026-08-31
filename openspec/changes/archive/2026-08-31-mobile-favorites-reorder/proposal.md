## Why

El reordenamiento de favoritos en movil no funciona: al arrastrar una tarjeta o fila, el browser interpreta el gesto como scroll y mueve la pagina en vez de activar el drag de dnd-kit. Esto hace que la funcionalidad de reordenar sea inutil en dispositivos tactiles, donde la unica via actual es el `TouchSensor` con un delay de 150ms que el browser intercepta antes de que dnd-kit pueda actuar.

## What Changes

- Anadir un modo "Editar" a la vista de favoritos, con un toggle "Editar" / "Listo" en el header
- En modo editar: mostrar drag handles dedicados (overlay en tarjetas, a la derecha en lista) con `touch-action: none` para que el browser no robe los touch events
- En modo editar: ocultar botones de play y favoritos para evitar conflictos de interaccion
- En modo editar: feedback visual con borde punteado en las tarjetas/filas
- Texto de ayuda dinamico que cambia segun el modo
- Animaciones de fade-in/out en la transicion entre modos
- El boton "Editar" es siempre visible (mobile y desktop) para consistencia
- El reordenamiento sigue auto-guardando cada movimiento (sin cambio en la logica de persistencia)

## Capabilities

### New Capabilities

- `favorites-edit-mode`: Modo de edicion para reordenar favoritos con drag handles dedicados, toggle editar/listo, y touch-action:none para soporte tactil fiable

### Modified Capabilities

- `favorites`: El requisito de reordenar favoritos cambia: en vez de arrastrar la tarjeta completa, el usuario activa un modo editar y arrastra un handle dedicado. El resultado (persistencia del orden) no cambia.

## Impact

- **Frontend**: `Favorites.tsx` (logica principal del modo editar), `StationCard.tsx` y `StationListItem.tsx` (prop `isEditing` para ocultar play/favoritos), `index.css` (animaciones fade-in/out, clase drag-handle con touch-action:none)
- **Backend**: Sin cambios. La API de reordenar (`PUT /favorites/order`) no se modifica
- **Dependencias**: Sin nuevas dependencias. Ya se usa `@dnd-kit/core` y `@dnd-kit/sortable`
- **UX**: Cambio significativo en como se interactua con favoritos en movil. El patron de modo editar es estandar (Instagram, Apple Music, etc.)
