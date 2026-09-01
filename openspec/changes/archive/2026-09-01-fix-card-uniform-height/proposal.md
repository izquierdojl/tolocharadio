## Why

En la vista de tarjetas de emisoras, las tarjetas tienen alturas inconsistentes cuando tienen diferente cantidad de tags o texto descriptivo. Esto crea un layout desigual que afecta la estética visual de la rejilla. Las tarjetas deberían tener todas la misma altura y autoajustarse para mantener un diseño uniforme.

## What Changes

- Modificar el componente `StationCard` para que todas las tarjetas tengan altura uniforme en la rejilla
- Implementar truncamiento o ajuste automático del contenido para que las tarjetas mantengan consistencia visual
- Asegurar que el grid CSS mantenga las tarjetas con la misma altura independientemente del contenido

## Capabilities

### New Capabilities

Ninguna capability nueva.

### Modified Capabilities

- `web-ui`: Mejora del requisito de "Exploración de emisoras en rejilla" para especificar que las tarjetas deben tener altura uniforme y autoajustarse al contenido.

## Impact

- Componente afectado: `apps/web/src/components/StationCard.tsx`
- Estilos CSS del grid en `apps/web/src/components/StationList.tsx`
- Posible ajuste de Tailwind CSS para manejar alturas uniformes
