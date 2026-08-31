## 1. Setup

- [x] 1.1 Instalar `@dnd-kit/core` y `@dnd-kit/sortable` en `apps/web` y verificar que `package.json` y `package-lock.json` se actualizan correctamente

## 2. Play siempre visible

- [x] 2.1 En `apps/web/src/components/StationCard.tsx`, eliminar el patron `opacity-0 group-hover:opacity-100` del boton de play y usar siempre `bg-black/50 text-pine-100` visible. Verificar que el boton se ve sin hover en desktop y en movil
- [x] 2.2 En `apps/web/src/components/StationListItem.tsx`, eliminar el patron `bg-black/0 text-transparent group-hover:bg-black/40 group-hover:text-pine-100` del boton de play y usar siempre `bg-black/40 text-pine-100`. Verificar que el boton se ve sin hover

## 3. Drag-to-reorder en favoritos

- [x] 3.1 En `apps/web/src/pages/Favorites.tsx`, eliminar el componente `ReorderControls` (lineas 15-61) y las importaciones de `ChevronUp`, `ChevronDown`, `GripVertical`
- [x] 3.2 Implementar `DndContext` con `PointerSensor` + `TouchSensor` (delay 150ms, tolerance 5px) y `DragOverlay` en el componente Favorites
- [x] 3.3 En modo tarjeta, envolver cada tarjeta en `useSortable` de @dnd-kit, haciendo que la tarjeta completa sea arrastrable. Verificar que Play y FavoriteButton siguen funcionando con click
- [x] 3.4 En modo lista, envolver cada `<li>` en `useSortable`. Verificar que el arrastre funciona en la fila completa
- [x] 3.5 Implementar `onDragEnd` que llame a `commitOrder` con el nuevo orden usando `arrayMove`. Verificar que el reordenado persiste en la API
- [x] 3.6 Implementar `DragOverlay` que muestre una copia visual de la tarjeta/elemento arrastrado. Verificar que el preview se ve correctamente durante el arrastre
- [x] 3.7 Eliminar la referencia a `dragIndex`, `dragProps`, `handleDrop` y el texto de ayuda sobre flechas. Actualizar el texto de ayuda para mencionar solo arrastre

## 4. Historial: boton de eliminar como overlay

- [x] 4.1 En `apps/web/src/pages/History.tsx`, importar `StationCard`, `StationListItem` y `useViewModeStore` en vez de `StationList`
- [x] 4.2 En modo tarjeta, renderizar un grid de tarjetas donde cada `StationCard` se envuelve en un contenedor `relative` con un boton de Trash2 como overlay en `absolute top-2 right-12 z-10` con fondo `bg-black/50 backdrop-blur rounded-full`. Verificar que no deforma la tarjeta
- [x] 4.3 En modo lista, renderizar filas con `StationListItem` y el boton Trash2 inline a la derecha (manteniendo patron similar al actual pero con Trash2 en vez de X)
- [x] 4.4 Eliminar la importacion de `X` de lucide-react y el renderizado antiguo que envolvia `StationList`. Verificar que la eliminacion de emisoras del historial sigue funcionando

## 5. Verificacion final

- [x] 5.1 Ejecutar `npm run typecheck` en `apps/web` y verificar que no hay errores de tipos
- [x] 5.2 Ejecutar `npm run lint` en `apps/web` y verificar que no hay errores de linting
- [x] 5.3 Ejecutar `npm run build` en `apps/web` y verificar que el build completa sin errores
- [x] 5.4 Verificar manualmente: favoritos se reordenan arrastrando la tarjeta en desktop y movil, play siempre visible en tarjetas y listas, historial en modo tarjeta muestra papelera como overlay sin deformar
