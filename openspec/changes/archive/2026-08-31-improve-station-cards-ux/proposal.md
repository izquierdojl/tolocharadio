## Why

La experiencia de usuario con las tarjetas de emisoras tiene tres problemas de usabilidad: (1) en favoritos, reordenar requiere usar botones pequenos de flechas en vez de arrastrar la tarjeta directamente, y ademas no funciona en movil; (2) el boton de reproduccion en las tarjetas y listas es invisible hasta que el usuario hace hover, lo que en pantallas tactiles lo hace inaccesible; (3) en el historial en modo tarjeta, el boton de eliminar (X) deforma el layout porque se renderiza como un elemento flex al lado de la tarjeta en vez de como un overlay.

## What Changes

- **Drag-to-reorder en favoritos**: Reemplazar los botones de flechas (subir/bajar) y el handle de arrastre nativo por arrastre de la tarjeta completa usando `@dnd-kit/sortable`. Funcionara tanto en desktop como en movil (touch). Se eliminan los controles `ReorderControls` con ChevronUp/ChevronDown/GripVertical.
- **Play siempre visible**: Eliminar el patron `opacity-0 group-hover:opacity-100` del boton de reproduccion en `StationCard` y `StationListItem`. El boton sera siempre visible con fondo semi-transparente.
- **Historial: boton de eliminar como overlay**: En modo tarjeta, el boton de eliminar se posicionara como overlay en la esquina superior derecha de la tarjeta (en vez de como elemento flex adicional). Se cambia el icono `X` por `Trash2` para mayor claridad semantica.

## Capabilities

### New Capabilities

_Ninguna capability nueva._

### Modified Capabilities

- `favorites`: El requisito de reordenar favoritos cambia en la interfaz: el mecanismo de entrada pasa de botones de flechas + handle a arrastre de la tarjeta completa, con soporte touch.
- `web-ui`: Los requisitos de exploracion en rejilla y vistas de favoritos/historial cambian: el boton de play siempre visible (sin depender de hover), y el boton de eliminar del historial como overlay en modo tarjeta.

## Impact

- **Dependencia nueva**: `@dnd-kit/core` y `@dnd-kit/sortable` en `apps/web`
- **Archivos modificados**:
  - `apps/web/src/pages/Favorites.tsx` — reemplazar `ReorderControls` por DnD context
  - `apps/web/src/components/StationCard.tsx` — clases del boton play
  - `apps/web/src/components/StationListItem.tsx` — clases del boton play
  - `apps/web/src/pages/History.tsx` — renderizado directo de tarjetas/listas con overlay de Trash2
- **Sin cambios en API**: Los endpoints de favoritos e historial no cambian
- **Sin breaking changes**: Comportamiento observable mejora, no se rompe nada existente
