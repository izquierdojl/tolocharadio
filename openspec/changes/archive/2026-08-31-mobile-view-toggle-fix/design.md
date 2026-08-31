## Context

El componente `ViewModeToggle` se renderiza actualmente en la barra de navegación de escritorio dentro de un `<div className="hidden items-center gap-1 sm:flex">` (AppShell.tsx:178), lo que lo oculta completamente en pantallas menores a 640px. El menú hamburguesa móvil (AppShell.tsx:196-288) no incluye este control, por lo que los usuarios móviles no pueden alternar entre vista de tarjeta y lista.

El `ViewModeToggle` es un botón simple de 32x32px que alterna entre iconos `List` y `LayoutGrid` de Lucide. El estado se persiste en Zustand store con localStorage.

## Goals / Non-Goals

**Goals:**
- Hacer que el control de modo de vista sea accesible en dispositivos móviles
- Mantener la experiencia de usuario coherente entre móvil y escritorio
- No alterar el comportamiento existente del toggle en escritorio

**Non-Goals:**
- Rediseñar el menú hamburguesa completo
- Cambiar la lógica de persistencia del modo de vista
- Modificar el comportamiento de las vistas de tarjeta/lista

## Decisions

### Decisión 1: Integrar el toggle en el menú hamburguesa móvil

**Alternativa A**: Mostrar el `ViewModeToggle` directamente en el header móvil junto al logotipo.
- Contra: Ocupa espacio valioso en un header ya compacto en móvil, compite con el botón hamburguesa.

**Alternativa B (elegida)**: Añadir el `ViewModeToggle` como item dentro del dropdown del menú hamburguesa, junto a ThemeToggle y otros controles.
- A favor: Consistente con el patrón existente (ThemeToggle ya está en el menú). No sobrecarga el header. El toggle ya tiene un label descriptivo (`aria-label`).
- Contra: Requiere abrir el menú para cambiar el modo, pero es una acción de baja frecuencia.

**Implementación**: Añadir `<ViewModeToggle menuItem />` al menú hamburguesa en la sección de usuarios autenticados, justo antes de ThemeToggle. Adaptar el componente `ViewModeToggle` para aceptar una prop `menuItem` que aplique los estilos de menú (igual que `ThemeToggle` ya lo hace).

### Decisión 2: Adaptar ViewModeToggle para soporte dual (header + menú)

El componente `ViewModeToggle` actual solo renderiza un botón con estilos de header. Para integrarlo en el menú hamburguesa sin duplicar lógica, se añadirá una prop `menuItem` opcional que aplique los estilos de item de menú (flex, gap, padding, etc.), siguiendo el mismo patrón que `ThemeToggle`.

## Risks / Trade-offs

- **Riesgo**: Los usuarios móviles podrían no encontrar el toggle si no abren el menú.
  - **Mitigación**: El toggle ya es una acción de baja frecuencia (la mayoría de usuarios eligen un modo y se quedan). El menú hamburguesa es el patrón estándar para controles secundarios en móvil.

- **Riesgo**: Cambiar el componente ViewModeToggle podría afectar su uso en el header de escritorio.
  - **Mitigación**: La prop `menuItem` es opcional y por defecto el componente se renderiza como hasta ahora. No se modifica el comportamiento existente.
