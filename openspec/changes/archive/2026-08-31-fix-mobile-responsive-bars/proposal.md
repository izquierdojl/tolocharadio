## Why

La barra superior (header) y la barra inferior del reproductor no se adaptan correctamente a pantallas de smartphone (320-414px). El header muestra logo + 4 nav items + acciones (GitHub, tema/perfil) en una sola fila, desbordando el espacio disponible. El player bar muestra thumbnail, info, "Copiar enlace", play/pause, skip y stop en fila, también sin espacio suficiente. Ambas barras se ven recortadas o generan scroll horizontal en móvil.

## What Changes

- **Header móvil**: Sustituir la navegación inline por un menú hamburguesa en pantallas `< sm`. En móvil se muestra solo el logo a la izquierda y el icono hamburguesa + avatar (si autenticado) a la derecha. Al tocar el hamburguesa se abre un drawer lateral con las rutas de navegación, el enlace de GitHub, el toggle de tema y las acciones de sesión (perfil, cerrar sesión).
- **PlayerBar móvil**: En pantallas `< sm`, ocultar el botón "Copiar enlace" y simplificar la información de la emisora (ocultar bitrate/codec). Mantener solo: thumbnail, nombre de emisora, país/idioma, play/pause, skip y stop. El enlace de copia se puede acceder desde el propio nombre de la emisora o como opción de largo-press.
- **PlayerBar vacío móvil**: En pantallas `< sm`, acortar el texto del estado vacío para que quepa en una línea.

## Capabilities

### New Capabilities

_(ninguna — se trata de un fix de layout, no de una funcionalidad nueva)_

### Modified Capabilities

- `web-ui`: La requirement "Reproductor flotante persistente" y "Exploración de emisoras en rejilla" necesitan escenarios adicionales que contemplen el comportamiento adaptativo en móvil (menú hamburguesa, simplificación del player bar). No es un cambio de requisitos funcionales sino de presentación responsive.

## Impact

- **Componentes afectados**: `apps/web/src/components/AppShell.tsx` (Header, NavLink items), `apps/web/src/components/PlayerBar.tsx`
- **Dependencias nuevas**: `lucide-react` ya incluido (icono `Menu` para hamburguesa). Se necesita un componente `MobileDrawer` o integrar el drawer en AppShell.
- **API**: Sin cambios.
- **Estilos**: Tailwind classes nuevas para breakpoints móvil. Sin nuevos archivos CSS.
- **Testing**: Verificar en viewport móvil (320px, 375px, 414px) que no hay desbordamiento horizontal y que el drawer se abre/cierra correctamente.
