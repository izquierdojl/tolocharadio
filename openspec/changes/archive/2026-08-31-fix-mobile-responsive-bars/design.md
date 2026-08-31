## Context

El layout actual usa un `flex row` en el header con logo + nav items + acciones visibles siempre, y un `flex row` en el PlayerBar con todos los controles en una fila. En pantallas < 640px ambos se desbordan. El proyecto usa Tailwind CSS v4, React, y ya aplica breakpoints `sm:` y `md:` en algunos componentes.

## Goals / Non-Goals

**Goals:**
- Eliminar el desbordamiento horizontal en móvil (< 640px) tanto en el header como en el player bar.
- Mantener toda la funcionalidad accesible (navegación, copiar enlace, volumen) sin sacrificar la experiencia de usuario.
- Usar patrones UI estándar móvil (hamburguesa) para la navegación.

**Non-Goals:**
- Rediseñar el layout general de la aplicación (estructura de main/content).
- Cambiar la paleta de colores o el tema visual.
- Añadir gestos táctiles avanzados (swipe, pull-to-refresh).
- Modificar la lógica de negocio del reproductor o la API.

## Decisions

### 1. Menú hamburguesa para el header en móvil
**Decisión**: En pantallas `< sm` (640px), ocultar los nav items inline y el bloque de acciones secundarias. Mostrar solo el logo y un botón hamburguesa que abre un drawer/dropdown con toda la navegación y acciones.

**Alternativas consideradas**:
- *Nav items como iconos sin label*: Ya se hace actualmente (`hidden sm:inline`), pero con 4 nav items + GitHub + ViewModeToggle + UserMenu siguen sin caber.
- *Drawer lateral (slide-in)*: Más pesado visualmente, requiere overlay y animaciones. Un dropdown es suficiente para pocos elementos.

**Razón**: El dropdown es ligero, nativo del patrón web móvil, y no requiere dependencias externas. Se puede implementar con un estado `open` y posicionamiento `absolute`.

### 2. Simplificación del PlayerBar en móvil
**Decisión**: En pantallas `< sm`, ocultar el botón "Copiar enlace" y la línea de información técnica (bitrate/codec). Mantener: thumbnail, nombre, país/idioma, play/pause, skip, stop.

**Alternativas consideradas**:
- *Mini-player colapsable*: Un player minimalista con solo play/pause. Pierde funcionalidad (skip, stop, info de emisora).
- *Dos filas en móvil*: Primera fila con info + play, segunda con acciones secundarias. Ocupa más espacio vertical (problemático con el teclado virtual).

**Razón**: La simplificación directa (ocultar elementos no esenciales) es la más limpia y mantiene los controles principales accesibles. El usuario puede copiar el enlace desde la vista de la emisora en la rejilla.

### 3. Breakpoint `sm` (640px) como umbral
**Decisión**: Usar el breakpoint `sm` de Tailwind (640px) para activar el comportamiento móvil.

**Razón**: Es el breakpoint estándar de Tailwind para móviles. Los smartphones típicos tienen 320-414px de ancho. A partir de 640px (tablets pequeñas) el layout actual ya funciona razonablemente.

### 4. Componente MobileDrawer inline en AppShell
**Decisión**: Implementar el menú hamburguesa como un componente local dentro de AppShell.tsx (no un archivo separado), usando un estado `useState` y un `useEffect` para cerrar al hacer clic fuera.

**Alternativas consideradas**:
- *Componente separado (MobileDrawer.tsx)*: Más modular pero añade un archivo para ~40 líneas de código.
- *Usar un库 de UI (Headless UI, Radix)*: Añadiría dependencias innecesarias.

**Razón**: El drawer es simple enough para vivir en AppShell. Si en el futuro crece, se puede extraer.

## Risks / Trade-offs

- **[Risk] El menú hamburguesa oculta la navegación** → Mitigación: El dropdown se cierra automáticamente al navegar. El icono hamburguesa es universalmente reconocido.
- **[Risk] Copiar enlace no disponible en móvil** → Mitigación: El enlace de copia es una función secundaria. El usuario puede acceder al stream directamente desde la rejilla. Se puede considerar en el futuro un long-press como alternativa.
- **[Trade-off] Menos información visible en el player móvil** → Aceptado: La información técnica (bitrate/codec) es menos relevante para el usuario casual. El nombre y la emisora son suficientes.
