## 1. Crear componente AboutModal

- [x] 1.1 Crear `apps/web/src/components/AboutModal.tsx` con estructura de modal (backdrop, contenedor, cabecera, contenido, cierre) y verificar que el archivo existe
- [x] 1.2 Implementar cierre con Escape, clic fuera y botón X, y verificar que `onClose` se invoca en cada caso
- [x] 1.3 Añadir `role="dialog"`, `aria-modal="true"` y `aria-labelledby` para accesibilidad, y verificar que el HTML renderizado incluye los atributos

## 2. Contenido del modal

- [x] 2.1 Mostrar nombre del proyecto, descripción breve y mención de licencia, y verificar que el texto es visible al abrir el modal
- [x] 2.2 Mostrar enlace al repositorio de GitHub (abre en nueva pestaña con `rel="noopener noreferrer"`), y verificar que el enlace apunta a la URL correcta
- [x] 2.3 Integrar `useVersionCheck` para mostrar versión actual e indicador de actualización con enlace a la release, y verificar que los datos se renderizan correctamente

## 3. Integración en AboutSection

- [x] 3.1 Reescribir `AboutSection.tsx` para que el botón "Acerca de..." abra el modal en lugar de mostrar info inline, y verificar que el clic abre el diálogo
- [x] 3.2 Verificar que `AboutSection` funciona correctamente en el menú de escritorio de `AppShell.tsx`
- [x] 3.3 Verificar que `AboutSection` funciona correctamente en el menú móvil de `AppShell.tsx`

## 4. Estilos y animación

- [x] 4.1 Aplicar estilos Tailwind al modal (fondo semitransparente, tarjeta centrada, tipografía coherente con el tema) y verificar la apariencia visual
- [x] 4.2 Aplicar animación fade-in/fade-out usando las clases existentes del proyecto, y verificar la transición al abrir/cerrar

## 5. Verificación final

- [x] 5.1 Ejecutar `npm run typecheck` y verificar que no hay errores de tipos
- [x] 5.2 Ejecutar `npm run lint` y verificar que no hay errores de linting
- [x] 5.3 Ejecutar `npm run build` y verificar que la compilación es exitosa
