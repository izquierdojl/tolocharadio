## 1. Portada de inicio temática

- [x] 1.1 Crear `apps/web/src/pages/Home.tsx` con la portada de TolochaRadio: titular y subtítulo de la Sierra, ilustración SVG temática con la paleta actual (pine/ochre) y una tarjeta con llamada a la acción según sesión (invitado → `/login` y `/registro`; autenticado → «Explorar emisoras» en `/explorar`); verificar con `npm run typecheck -w @tolocharadio/web` y visualizándola en `/`
- [x] 1.2 Ajustar `RequireAuth` en `App.tsx` para redirigir al invitado a `/` (portada) en lugar de `/login`, y montar la portada en `/` y la exploración en `/explorar` con su guarda; verificar que `/` y `/explorar` renderizan la página correcta y el typecheck pasa

## 2. Navegación y acceso restringido

- [x] 2.1 Actualizar `AppShell.tsx`: el ítem de nav «Explorar» apunta a `/explorar` (el logo sigue a `/`); verificar en el navegador que el enlace activo resalta en `/explorar`
- [x] 2.2 Un invitado que intente acceder a `/explorar` (por URL o enlace) es redirigido a la portada y NO ve la lista de emisoras ni la búsqueda; verificar el redirect y que al entrar/registrarse vuelve a tener acceso
- [x] 2.3 Con sesión abierta, recorrer portada → «Explorar emisoras» → reproducir una emisora y cerrar sesión: la app vuelve a la portada (sin rejilla) y el cierre de sesión queda consistente; verificar manualmente el flujo completo

## 3. Verificación final

- [x] 3.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` en la raíz sin errores
- [x] 3.2 Levantar `docker compose up --build -d` y smoke: la portada se muestra en `/` sin sesión, `/explorar` redirige al invitado y, con sesión, la exploración y la reproducción siguen funcionando; Swagger (sin cambios) sigue respondiendo