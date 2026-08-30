## 1. Actualizar el placeholder del filtro de país

- [x] 1.1 Cambiar en `apps/web/src/pages/Explore.tsx` el literal `placeholder="País (ej. España)"` del `FilterControl` de país por `placeholder="País (ej. Spain)"` y verificar que la búsqueda de "España" en el repositorio ya no devuelve coincidencias (la única aparición era en ese placeholder).
- [x] 1.2 Ejecutar los controles de calidad del proyecto (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`) y verificar que todos pasan sin errores.
