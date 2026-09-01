## Context

El componente `StationCard` se renderiza en un CSS Grid con columnas responsivas (`grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4`). Actualmente, las tarjetas tienen alturas diferentes dependiendo de la cantidad de tags y texto descriptivo que contengan, lo que crea un layout visualmente desigual.

El componente usa `flex flex-col` con `flex-1` en el área de contenido, pero esto no garantiza altura uniforme entre tarjetas de la misma fila.

## Goals / Non-Goals

**Goals:**
- Todas las tarjetas en la misma fila deben tener la misma altura
- El contenido debe autoajustarse sin perder información
- Mantener el diseño responsive actual

**Non-Goals:**
- Cambiar el diseño visual de las tarjetas
- Modificar la cantidad de tags mostrados
- Alterar el comportamiento del grid responsivo

## Decisions

### Decisión 1: Usar CSS Grid `auto-rows-fr` en lugar de altura fija

**Elección**: Añadir la clase `auto-rows-fr` al contenedor grid de `StationList.tsx`

**Razón**: 
- CSS Grid tiene soporte nativo para igualar alturas de filas con `grid-auto-rows: 1fr`
- No requiere JavaScript ni cálculos manuales
- Respeta el diseño responsivo existente
- Las tarjetas se estiran automáticamente al tamaño del contenido más alto de la fila

**Alternativas consideradas**:
- Altura fija en tarjetas: Rechazada porque puede cortar contenido o dejar espacio vacío excesivo
- JavaScript para calcular alturas: Rechazada por complejidad innecesaria y problemas de rendimiento
- `align-items-stretch` (default de CSS Grid): Ya está aplicado pero no funciona porque las tarjetas usan `flex-col` sin altura definida

### Decisión 2: Ajustar el contenido de la tarjeta para truncamiento consistente

**Elección**: Mantener el truncamiento actual de tags (máximo 3) y texto descriptivo, pero asegurar que el área de contenido use `flex-1` correctamente

**Razón**:
- El componente ya limita tags a 3 con `station.tags.slice(0, 3)`
- El texto descriptivo ya usa `truncate`
- Solo necesitamos asegurar que el flex layout funcione con la altura uniforme del grid

## Risks / Trade-offs

**Riesgo**: En filas con pocas tarjetas (última fila incompleta), las tarjetas pueden estirarse más de lo deseado
**Mitigación**: Este es el comportamiento esperado de `auto-rows-fr` y es consistente con el diseño de grids modernos

**Riesgo**: En pantallas muy pequeñas, tarjetas con mucho contenido podrían ser demasiado altas
**Mitigación**: El contenido ya está limitado (3 tags, texto truncado) y el grid cambia a 2 columnas en móvil
