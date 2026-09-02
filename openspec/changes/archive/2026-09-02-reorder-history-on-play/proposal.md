## Why

Cuando un usuario reproduce una emisora desde la pestaña de historial, la lista no se reordena automáticamente. La emisora reproducida debería moverse a la primera posición, pero actualmente el usuario tiene que recargar la página para ver el orden actualizado. Esto rompe la expectativa de que el historial refleje siempre la escucha más reciente.

## What Changes

- Al reproducir una emisora desde la pestaña de historial, la consulta de historial se invalida automáticamente para refetchear los datos y reordenar la lista.
- La emisora reproducida aparece inmediatamente en la primera posición sin necesidad de recargar la página.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `history`: El comportamiento de actualización de la lista cambia: al reproducir una emisora, el historial se refresca automáticamente para reflejar el nuevo orden.

## Impact

- `apps/web/src/pages/History.tsx`: Invalidar la query de historial cuando se reproduce una emisora.
- No hay cambios en la API ni en el backend — el endpoint de playback ya registra el historial correctamente.
