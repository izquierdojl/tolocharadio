## 1. Modificar ViewModeToggle para soporte dual

- [x] 1.1 Añadir prop `menuItem` opcional al componente `ViewModeToggle` que aplique estilos de item de menú (flex, gap-2, px-3, py-2, text-sm) cuando esté activa, verificando que el componente se renderiza correctamente en ambos modos
- [x] 1.2 Verificar que el `ViewModeToggle` sin prop `menuItem` mantiene exactamente los mismos estilos y comportamiento que antes (regresión visual en escritorio)

## 2. Integrar toggle en menú hamburguesa móvil

- [x] 2.1 Añadir `<ViewModeToggle menuItem />` al dropdown del menú hamburguesa en `AppShell.tsx`, en la sección de usuarios autenticados, justo antes de `<ThemeToggle menuItem />`, verificando que aparece como un item de menú más
- [x] 2.2 Verificar que el toggle cierra el menú hamburguesa al pulsarse (si el comportamiento actual no lo hace, añadir `onClick` para cerrar el menú)
- [x] 2.3 Verificar que el toggle no aparece en el menú hamburguesa para usuarios no autenticados

## 3. Verificación integral

- [x] 3.1 Probar en navegador con DevTools en modo móvil (< 640px): abrir menú hamburguesa, verificar que el toggle de modo de vista aparece y funciona (alterna entre tarjeta y lista)
- [x] 3.2 Probar en navegador con DevTools en modo escritorio (>= 640px): verificar que el toggle en el header sigue funcionando como antes
- [x] 3.3 Ejecutar `npm run typecheck` y `npm run lint` en `apps/web` para verificar que no hay errores de tipos ni de linting
