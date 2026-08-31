## Context

La pagina de favoritos usa `@dnd-kit/core` v6.3.1 y `@dnd-kit/sortable` v10.0.0 para reordenar. Actualmente configura un `TouchSensor` con `delay: 150ms` y `tolerance: 5px`, pero en movil el browser decide hacer scroll antes de que dnd-kit pueda activar el drag. La causa raiz es la ausencia de `touch-action: none` en los elementos arrastrables: sin esa propiedad CSS, el browser prioriza la deteccion de scroll sobre el drag.

El componente `Favorites.tsx` (245 lineas) contiene toda la logica: sensores, `SortableCard`, `SortableListItem`, `DndContext`, `DragOverlay`, y la funcion `commitOrder` que hace optimistic update + llamada a `PUT /favorites/order`. Los componentes `StationCard.tsx` y `StationListItem.tsx` no tienen logica de drag; solo renderizan la tarjeta/fila.

Ver `proposal.md` para la motivacion y `specs/` para los requisitos completos.

## Goals / Non-Goals

**Goals:**
- Que el reordenamiento funcione en dispositivos tactiles sin que el browser robe el touch event
- Mantener la simplicidad: un toggle editar/listo es suficiente
- Mantener la consistencia: boton editar visible en desktop y movil
- No cambiar la logica de persistencia (auto-guardar cada movimiento)

**Non-Goals:**
- No anadir haptic feedback ni vibracion
- No anadir animacion de shake/oscilacion en las tarjetas
- No cambiar la API backend
- No anadir un boton de deshacer (undo)
- No soportar reordenar por swipe (solo drag por handle)

## Decisions

### Decision 1: Modo editar con toggle, no drag directo con touch-action en toda la tarjeta

**Opcion A**: `touch-action: none` en toda la tarjeta
- Pro: Simple, sin cambio de UX
- Con: El scroll vertical se rompe donde toques la tarjeta. En un grid de 2 columnas con tarjetas grandes, casi no hay espacio para scrollear

**Opcion B**: Modo editar con handle dedicado (elegida)
- Pro: Scroll intacto fuera de modo editar, UX claro, patron estandar
- Con: Paso extra para reordenar, mas complejidad de UI

**Opcion C**: Handle siempre visible sin modo editar
- Pro: Sin toggle
- Con: Handle visible todo el tiempo es ruido visual, y sigue sin resolver el problema de que el touch en la tarjeta (play, favorito) compite con el drag

**Decision**: Opcion B. El patron de modo editar es el estandar en apps moviles (Instagram, Apple Music, Spotify). El paso extra es minimo y la claridad de UX lo compensa.

### Decision 2: Handle como overlay, no como parte del layout de la tarjeta

**Opcion A**: Handle como parte del layout (anade altura a la tarjeta)
- Pro: Mas facil de implementar
- Con: Cambia el tamano de las tarjetas al entrar en editar, causa layout shift

**Opcion B**: Handle como overlay con posicion absoluta (elegida)
- Pro: Sin layout shift, mas limpio
- Con: El handle puede solapar contenido si la tarjeta es pequena

**Decision**: Opcion B. El handle va con `position: absolute; bottom: 0` en tarjetas y `position: relative` a la derecha en lista. El solapamiento es aceptable porque el handle es pequeno (icono de grip) y solo aparece en modo editar.

### Decision 3: Auto-guardar cada movimiento, no boton guardar explicito

**Opcion A**: Boton "Guardar" explicito
- Pro: Control total, el usuario puede cancelar
- Con: Paso extra, mas complejidad, riesgo de perder cambios si olvida guardar

**Opcion B**: Auto-guardar cada movimiento (elegida)
- Pro: Mas simple, ya funciona asi actualmente, sin riesgo de perder cambios
- Con: No hay forma de cancelar un reordenamiento (pero se puede reordenar de nuevo)

**Decision**: Opcion B. Mantener el comportamiento actual de `commitOrder` (optimistic update + API call en cada `handleDragEnd`). El boton "Listo" solo sirve para salir de modo editar, no para guardar.

### Decision 4: touch-action: none solo en el handle, no en toda la tarjeta

El handle es el unico elemento con `touch-action: none`. Esto permite que el scroll vertical funcione normalmente cuando el usuario toca fuera del handle (en modo normal). En modo editar, los botones de play y favoritos estan ocultos, por lo que el unico touch target es el handle.

### Decision 5: Animaciones con CSS transitions, no con librerias externas

Las animaciones de fade-in/out de handles y botones se implementan con CSS `transition: opacity 150ms` y clases condicionales. No se anade ninguna dependencia como framer-motion. Tailwind ya soporta `transition-opacity` y `duration-150`.

## Risks / Trade-offs

**[Riesgo] El handle puede ser demasiado pequeno en movil para ser un buen touch target**
- Mitigacion: El handle debe tener un area minima de 44x44px (recomendacion de Apple HIG). El icono de grip se centra en un area de padding generoso.

**[Riesgo] Los usuarios no descubren el modo editar**
- Mitigacion: El texto de ayuda indica "Pulsa Editar para reordenar". El boton "Editar" es prominente en el header.

**[Riesgo] Layout shift al entrar/salir de modo editar si los handles cambian el tamano de las tarjetas**
- Mitigacion: Los handles son overlays con posicion absoluta, no afectan al layout.

**[Trade-off] El boton editar es visible en desktop donde el drag directo ya funciona**
- Es un boton extra que no es estrictamente necesario en desktop, pero mantenerlo visible simplifica la implementacion y da consistencia.

## Migration Plan

Sin migracion. Es un cambio puramente frontend que no afecta a la API ni a la base de datos. Se puede desplegar directamente.

## Open Questions

Ninguna. Todas las decisiones de diseno estan resueltas.
