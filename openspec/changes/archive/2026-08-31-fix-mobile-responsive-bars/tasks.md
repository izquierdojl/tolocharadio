## 1. Header responsive — Menú hamburguesa móvil

- [x] 1.1 Añadir importación de icono `Menu` de `lucide-react` en AppShell.tsx y verificar que el proyecto compila sin errores
- [x] 1.2 Crear estado `menuOpen` (useState) en el componente `Header` y añadir el botón hamburguesa visible solo en `< sm` (`hidden sm:inline` inverso: `sm:hidden`), verificando que se renderiza correctamente en viewport móvil
- [x] 1.3 Implementar el panel dropdown del menú hamburguesa con las 4 rutas de navegación (Explorar, Favoritos, Historial, Mis emisoras), enlace GitHub, toggle de tema y acciones de sesión (Perfil, Cerrar sesión), verificando que todas las opciones son accesibles y navegan correctamente
- [x] 1.4 Añadir comportamiento de cierre: cerrar el menú al seleccionar una opción, al tocar fuera del panel, y al pulsar Escape. Verificar que el dropdown se cierra correctamente
- [x] 1.5 Ocultar los nav items inline y el bloque de acciones secundarias (GitHub, ViewModeToggle, ThemeToggle/Entrar) en `< sm`, manteniendo solo logo y hamburguesa. Verificar en viewport de 375px que no hay desbordamiento horizontal

## 2. PlayerBar responsive — Simplificación móvil

- [x] 2.1 Añadir clase `hidden sm:flex` al contenedor del botón "Copiar enlace" en PlayerBar.tsx para ocultarlo en `< sm`. Verificar que el botón no aparece en viewport móvil
- [x] 2.2 Añadir clase `hidden sm:block` a la línea de información técnica (bitrate/codec) en PlayerBar.tsx para ocultarla en `< sm`. Verificar que la línea no aparece en viewport móvil
- [ ] 2.3 Verificar que el PlayerBar en viewport de 375px muestra solo: miniatura, nombre de emisora, país/idioma, play/pause, skip y stop, sin desbordamiento horizontal

## 3. PlayerBar vacío — Texto adaptativo

- [x] 3.1 Modificar el estado vacío del PlayerBar para que en `< sm` muestre un texto más conciso ("Elige una emisora para escuchar") en una sola línea. Verificar en viewport móvil que el texto no se desborda

## 4. Verificación integral

- [x] 4.1 Verificar con `npm run typecheck` que no hay errores de tipo en los archivos modificados
- [x] 4.2 Verificar con `npm run lint` que no hay errores de linting
- [x] 4.3 Verificar con `npm run build` que la aplicación compila correctamente
- [ ] 4.4 Verificar manualmente en viewport móvil (375px) que: el header muestra logo + hamburguesa, el menú se abre/cierra, el player bar muestra solo los controles esenciales, y no hay scroll horizontal en ninguna vista
