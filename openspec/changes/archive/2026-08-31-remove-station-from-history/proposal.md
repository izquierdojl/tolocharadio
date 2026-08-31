## Why

Los usuarios necesitan control granular sobre su historial de reproducción. Actualmente solo pueden borrar todo el historial de una vez, pero no pueden eliminar emisoras individuales que ya no desean ver. Esto limita la gestión personal del historial y puede resultar en una experiencia frustrante cuando solo se quiere limpiar una emisora específica.

## What Changes

- Se añade un nuevo endpoint `DELETE /api/v1/history/:stationId` para eliminar una emisora específica del historial
- Se añade un botón de eliminación individual en la interfaz de historial para cada emisora
- Se mantiene la funcionalidad existente de limpiar todo el historial

## Capabilities

### New Capabilities

- `history/delete-station`: Capacidad para eliminar una única emisora del historial de reproducción

### Modified Capabilities

- `history`: Se añade el requisito de eliminar emisoras individuales al historial existente

## Impact

- **Backend**: Nuevo endpoint en `apps/api/src/routes/history.ts`, nuevo método en `apps/api/src/services/history.ts`
- **Frontend**: Nuevo componente de botón de eliminación en `apps/web/src/pages/History.tsx`, nueva mutación en React Query
- **API**: Nuevo endpoint REST `DELETE /api/v1/history/:stationId`
- **Base de datos**: No se requieren cambios en el esquema, se reutiliza la tabla existente
