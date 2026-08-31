## Context

La app web usa React 19 + Tailwind CSS v4 + Zustand. Las tarjetas de emisoras se renderizan con `StationCard` (modo tarjeta) y `StationListItem` (modo lista). Los favoritos usan un componente `ReorderControls` con botones de flechas y un handle de arrastre nativo HTML5. El historial delega el renderizado a `StationList` que internamente segun el modo global muestra tarjetas o listas. No hay ninguna libreria de drag-and-drop instalada actualmente.

## Goals / Non-Goals

**Goals:**
- Arrastrar tarjetas/filas completas para reordenar favoritos, en desktop y movil
- Boton de play siempre visible en tarjetas y listas, en todos los dispositivos
- Boton de eliminar del historial como overlay en modo tarjeta, con icono de papelera

**Non-Goals:**
- Cambiar la API de favoritos o historial (los endpoints no cambian)
- Anadir reordenar por arrastre a otras vistas (solo favoritos)
- Cambiar el comportamiento del reproductor flotante
- Modificar la funcionalidad de busqueda o filtros

## Decisions

### Decision 1: @dnd-kit/sortable para drag-and-drop

**Eleccion**: `@dnd-kit/core` + `@dnd-kit/sortable`

**Alternativas consideradas**:
- *HTML5 draggable nativo*: Ya esta implementado parcialmente pero no soporta touch events. En movil el arrastre no funciona.
- *react-beautiful-dnd*: Desmantenido, sin mantenimiento activo.
- *Implementacion custom con touch events*: Reimplementar toda la logica de deteccion de gestos, collision detection, y accesibilidad. Mucho trabajo para un caso de uso que @dnd-kit resuelve bien.

**Razon**: @dnd-kit es la libreria drag-and-drop mas madura del ecosistema React. Soporta touch y mouse nativamente, tiene deteccion de colisiones, es accesible, y el tamano es razonable (~15KB). Ya se usa ampliamente en proyectos React modernos.

### Decision 2: Sensor con delay para touch

**Eleccion**: Configurar `PointerSensor` + `TouchSensor` con `activationConstraint: { delay: 150, tolerance: 5 }` para touch.

**Razon**: Sin delay, cualquier toque en la tarjeta activaria el arrastre, impidiendo hacer click en Play o Favorito. El delay de 150ms distingue un toque rapido (click) de un toque sostenido (arrastre). El tolerance de 5px permite pequenos movimientos durante el toque sin activar el drag.

### Decision 3: DragOverlay para preview visual

**Eleccion**: Usar `DragOverlay` de @dnd-kit para mostrar una copia de la tarjeta mientras se arrastra.

**Alternativa**: Mover el DOM element directamente (sortable sin overlay). Menos control visual pero mas simple.

**Razon**: DragOverlay da un preview limpio que no interfiere con el layout del grid. La tarjeta original permanece en su posicion hasta que se suelta, y el overlay sigue el cursor. Mejor UX.

### Decision 4: Play siempre visible sin condicion

**Eleccion**: Eliminar completamente el patron `opacity-0 group-hover:opacity-100` y usar siempre `bg-black/50 text-pine-100` (o `bg-black/40 text-pine-100` en list items).

**Alternativa**: Usar media queries para mostrar solo en movil (`sm:opacity-0 sm:group-hover:opacity-100`). Mantiene el efecto hover en desktop.

**Razon**: El usuario indico que quiere el play siempre visible. Ademas, el patron de hover para revelar controles es un anti-patron de UX en interfaces modernas - los controles principales deberian ser siempre discoverables. El cambio es mas consistente y accesible.

### Decision 5: History renderiza directamente StationCard/StationListItem

**Eleccion**: En vez de delegar a `StationList`, History importara y renderizara directamente `StationCard` o `StationListItem` segun el modo de vista, y posicionara el boton de eliminar como overlay absoluto sobre la tarjeta.

**Alternativa**: Modificar `StationList` para aceptar un prop `renderAction` que inyecte el boton de eliminar. Mas reutilizable pero mas complejo.

**Razon**: History es el unico caso que necesita un boton de eliminar sobre la tarjeta. Modificar `StationList` para esto seria over-engineering. Renderizar directamente es mas simple y explicito. El componente `StationList` se sigue usando en Explore y CustomStations sin cambios.

### Decision 6: Posicion del boton de eliminar en tarjeta

**Eleccion**: `absolute top-2 right-12` (a la izquierda del corazon de favoritos) con `z-10`, fondo `bg-black/50 backdrop-blur rounded-full p-1.5`.

**Alternativas**:
- *Debajo del corazon* (`top-10 right-2`): Funciona pero depende del tamano del boton de favoritos.
- *Esquina inferior derecha*: Lejos del contenido visual principal.
- *Overlay completo en hover*: Requiere hover, mismo problema que el play.

**Razon**: A la izquierda del corazon mantiene ambos botones accesibles sin solaparse. El fondo semi-transparente con backdrop-blur es consistente con el patron usado en los controles de reordenar que se van a eliminar.

## Risks / Trade-offs

**[Riesgo] Conflictos de click vs drag en touch**: El delay de 150ms podria no ser suficiente para todos los usuarios, o podria sentirse lento para activar el drag. -> *Mitigacion*: El tolerance de 5px compensa: usuarios que hacen click rapido (sin movimiento) activan el click inmediatamente. Si el delay se siente lento, se puede ajustar a 200ms.

**[Riesgo] Tamano del bundle**: @dnd-kit anade ~15KB gzipped. -> *Mitigacion*: Es una dependencia bien tree-shakeable y solo se importa en Favorites.tsx. El impacto real es menor.

**[Trade-off] Play siempre visible reduce area de imagen limpia**: El boton de play permanece visible sobre la imagen en todo momento, reduciendo la visibilidad de la imagen de la emisora. -> *Mitigacion*: El boton es semi-transparente (bg-black/50) y pequeno (40px), el impacto visual es menor. La mejora de usabilidad compensa.

**[Trade-off] History ya no usa StationList**: Se pierde la abstraccion de un solo componente para el renderizado de emisoras. -> *Mitigacion*: History es el unico caso con necesidades especiales. El patron de renderizar directamente es mas explicito y facil de mantener para este caso concreto.
