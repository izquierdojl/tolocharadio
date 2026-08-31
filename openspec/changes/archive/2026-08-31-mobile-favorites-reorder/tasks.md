## 1. CSS y animaciones

- [x] 1.1 Anadir en `index.css` la clase `.drag-handle` con `touch-action: none; cursor: grab;` y las keyframes `fade-in` y `fade-out` para opacidad (verificar que la clase existe en el CSS compilado)
- [x] 1.2 Anadir en `index.css` la clase `.editing-border` con `border-style: dashed` o equivalente para el borde punteado en modo editar (verificar que aplica borde punteado)

## 2. Componentes StationCard y StationListItem

- [x] 2.1 Anadir prop opcional `isEditing?: boolean` a `StationCard.tsx` y ocultar el boton de play y `FavoriteButton` cuando `isEditing` es true, con transicion de opacidad (verificar que con `isEditing={true}` no se ven play ni corazon)
- [x] 2.2 Anadir prop opcional `isEditing?: boolean` a `StationListItem.tsx` y ocultar el boton de play y `FavoriteButton` cuando `isEditing` es true, con transicion de opacidad (verificar que con `isEditing={true}` no se ven play ni corazon)
- [x] 2.3 Anadir la clase `.editing-border` al contenedor de `StationCard` cuando `isEditing` es true (verificar borde punteado visible)
- [x] 2.4 Anadir la clase `.editing-border` al contenedor de `StationListItem` cuando `isEditing` es true (verificar borde punteado visible)

## 3. Drag handles en Favorites.tsx

- [x] 3.1 Crear componente `DragHandle` que renderice un icono de agarre (GripVertical de lucide-react) dentro de un div con la clase `.drag-handle` y area minima de 44x44px (verificar que el componente renderiza el icono)
- [x] 3.2 Modificar `SortableCard` para que `attributes` y `listeners` se apliquen al `DragHandle` en vez de al wrapper, y mostrar el `DragHandle` solo cuando `isEditing` es true (verificar que el handle aparece solo en modo editar y que arrastrar desde el handle activa el drag)
- [x] 3.3 Modificar `SortableListItem` para que `attributes` y `listeners` se apliquen al `DragHandle` en vez de al wrapper, y mostrar el `DragHandle` a la derecha solo cuando `isEditing` es true (verificar que el handle aparece a la derecha solo en modo editar)
- [x] 3.4 Pasar la prop `isEditing` a `StationCard` y `StationListItem` dentro de los componentes `SortableCard` y `SortableListItem` (verificar que play y favoritos se ocultan en modo editar)

## 4. Toggle editar/listo en Favorites.tsx

- [x] 4.1 Anadir estado `isEditing` con `useState<boolean>(false)` en el componente `Favorites` (verificar que el estado existe)
- [x] 4.2 Renderizar boton "Editar" en el header (junto a "Vaciar") cuando `isEditing` es false y hay favoritos, y boton "Listo" cuando `isEditing` es true (verificar que el boton cambia de texto segun el estado)
- [x] 4.3 Al pulsar "Editar", set `isEditing(true)`; al pulsar "Listo", set `isEditing(false)` (verificar que el toggle funciona)
- [x] 4.4 Pasar `isEditing` al `SortableContext` y a los componentes `SortableCard`/`SortableListItem` (verificar que la prop llega a los componentes hijos)

## 5. Texto de ayuda y feedback visual

- [x] 5.1 Cambiar el texto de ayuda segun `isEditing`: en modo editar mostrar texto sobre arrastrar handles, en modo normal mostrar el texto actual (verificar que el texto cambia al alternar modo)
- [x] 5.2 Anadir animaciones de fade-in/fade-out a los handles y botones de play/favoritos usando las clases CSS definidas en la tarea 1.1 (verificar que las transiciones son visibles al entrar/salir de modo editar)

## 6. Verificacion final

- [x] 6.1 Verificar en desktop: el drag con raton funciona desde el handle en modo editar, y el toggle editar/listo funciona correctamente (verificar flujo completo en desktop)
- [x] 6.2 Verificar en movil (o emulacion): el drag desde el handle NO activa el scroll del browser y el reordenamiento funciona correctamente (verificar en Chrome DevTools con emulacion touch o en dispositivo real)
- [x] 6.3 Ejecutar `npm run typecheck` y `npm run lint` sin errores (verificar que no hay errores de tipo ni lint)
- [x] 6.4 Ejecutar `npm run build` exitosamente (verificar que el build completa sin errores)
