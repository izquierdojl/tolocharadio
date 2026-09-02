## Context

El proyecto TolochaRadio no tiene componentes de modal/dialog existentes. Todos los overlays actuales (menús desplegables, barra de player) se construyen con posicionamiento absoluto/fijo y Tailwind. El componente `AboutSection` actual es un `<div>` estático que se renderiza dentro de menús desplegables en `AppShell.tsx`. El hook `useVersionCheck` ya proporciona la versión actual y la última release de GitHub.

## Goals / Non-Goals

**Goals:**
- Crear un componente `AboutModal` reutilizable con Tailwind, sin dependencias externas.
- Mantener la integración actual en los menús de escritorio y móvil de `AppShell.tsx`.
- Reutilizar `useVersionCheck` para datos de versión.

**Non-Goals:**
- No se crea un sistema genérico de modals/dialogs reutilizable para otros usos.
- No se modifica la API ni el backend.
- No se añaden dependencias npm.

## Decisions

### 1. Implementación del modal con Tailwind + useState

**Decisión:** Construir el modal directamente con Tailwind y `useState`/`useRef`, sin librería externa.

**Alternativas consideradas:**
- `@headlessui/react` — añade una dependencia para un único uso.
- `<dialog>` nativo — soporte inconsistente en navegadores antiguos y menos control sobre estilos.

**Rationale:** El proyecto ya construye todos sus overlays a mano con Tailwind. Mantener coherencia con el código existente evita fragmentación y dependencias innecesarias.

### 2. Estructura del componente

**Decisión:** Crear `AboutModal.tsx` como componente controlado que recibe `open: boolean` y `onClose: () => void`. `AboutSection` se reescribe para manejar el estado de apertura y renderizar el modal.

**Rationale:** Separa la lógica de presentación (modal) de la de integración (menús). El componente modal es reutilizable si en el futuro se necesita desde otro lugar.

### 3. Animación de entrada/salida

**Decisión:** Reutilizar las clases CSS `fade-enter`/`fade-exit` ya definidas en `index.css` para la transición del backdrop y del contenido.

**Rationale:** El proyecto ya define estas animaciones. Usarlas mantiene coherencia visual.

### 4. Accesibilidad

**Decisión:** Implementar `role="dialog"`, `aria-modal="true"`, `aria-labelledby` y gestión de foco básica (cerrar con Escape, trap focus dentro del modal).

**Rationale:** Son prácticas estándar de accesibilidad para modals. No requieren librerías adicionales.

## Risks / Trade-offs

- **[Riesgo] Gestión de foco incompleta** → Se implementará cierre con Escape y clic fuera. Un focus trap completo puede requerir más trabajo, pero es aceptable para un modal informativo simple.
- **[Trade-off] No hay sistema de modals genérico** → Si en el futuro se necesitan más modals, habrá que refactorizar. Para un único caso de uso, la duplicación es preferible a la abstracción prematura.
