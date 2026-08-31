## Why

En la interfaz móvil, el botón `ViewModeToggle` para cambiar entre vista de tarjeta y lista no es visible. Actualmente el componente está oculto en pantallas menores a 640px (`hidden sm:flex`), lo que impide a los usuarios móviles alternar entre modos de visualización. Esto afecta la experiencia de usuario en dispositivos móviles donde la mayoría de la navegação ocurre.

## What Changes

- Modificar la visibilidad del `ViewModeToggle` para que sea accesible tanto en móvil como en escritorio
- Adaptar el diseño del toggle para pantallas pequeñas (posiblemente integrarlo en el menú hamburguesa o hacerlo visible en el header)
- Mantener la funcionalidad existente de persistencia en localStorage

## Capabilities

### New Capabilities

_No se introducen nuevas capacidades._

### Modified Capabilities

- `web-ui`: La especificación existente de UI web incluye el view mode toggle. Se modificará para reflejar que el toggle debe estar visible y accesible en todos los dispositivos (móvil y escritorio), no solo en desktop para usuarios autenticados.

## Impact

- **Componentes afectados**: `apps/web/src/components/ViewModeToggle.tsx`, `apps/web/src/components/AppShell.tsx`
- **Patrón responsive**: Se cambiará la clase `hidden sm:flex` para permitir visibilidad en móvil
- **UX móvil**: Los usuarios móviles podrán alternar entre vistas de tarjeta y lista
- **Sin breaking changes**: La funcionalidad existente no se modifica, solo se hace accesible
