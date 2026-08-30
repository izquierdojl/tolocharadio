## 1. Store y componentes base

- [x] 1.1 Crear `apps/web/src/stores/viewMode.ts` (Zustand) con `viewMode: "card" | "list"`, `setViewMode`, lectura inicial desde `localStorage` (`tolocha:viewMode`) con valor por defecto `card` y guardado en try/catch, siguiendo el patrón de `stores/theme.ts`; verificar con `npm run typecheck` en `apps/web`
- [x] 1.2 Extraer la lógica de favorito de `StationCard.tsx` a `apps/web/src/components/FavoriteButton.tsx` (mismo comportamiento: query de favoritos, toggle, toasts en español, invalidación de cache) manteniendo `StationCard.tsx` reutilizándolo; verificar con `npm run typecheck` y que la tarjeta sigue marcando/quitando favoritos
- [x] 1.3 Crear `apps/web/src/components/StationListItem.tsx`: fila densa con portada o placeholder, nombre truncado, país · idioma, géneros y bitrate, acciones de reproducir y `FavoriteButton`, con hover coherente con la identidad Tolocha; verificar `npm run typecheck`

## 2. Renderizado por modo de vista

- [x] 2.1 Crear `apps/web/src/components/StationList.tsx` que reciba `stations: Station[]` y renderice, según el store `viewMode`, la rejilla de `StationCard` (grid actual) o la lista de `StationListItem`; verificar `npm run typecheck`
- [x] 2.2 Usar `StationList` en `pages/Explore.tsx` sustituyendo el grid inline de `StationCard`; verificar que la búsqueda/filtros siguen mostrando resultados en ambos modos y que la paginación no se rompe
- [x] 2.3 Usar `StationList` en `pages/Favorites.tsx` (manteniendo «Vaciar» y los estados vacíos) y neutralizar el texto del pie («Pulsa el corazón en cualquier emisora…», válido en ambos modos); verificar que favoritos se muestra en tarjeta y lista
- [x] 2.4 Usar `StationList` en `pages/History.tsx` solo para la lista de emisoras, dejando intacto el bloque «Última escucha»; verificar que el historial respeta ambos modos y el bloque superior no cambia

## 3. Control en la cabecera

- [x] 3.1 Crear `apps/web/src/components/ViewModeToggle.tsx`: botón con iconos `LayoutGrid`/`List` de lucide-react, `aria-label`/`title` en español («Cambiar a vista de lista»/«Cambiar a vista de tarjetas») que alterna `setViewMode` leyendo el estado actual; verificar que alterna el valor del store
- [x] 3.2 Integrar `ViewModeToggle` en `apps/web/src/components/AppShell.tsx` (cabecera) mostrándolo solo cuando `status === "authenticated"`, junto a la navegación/menú de usuario; verificar que con sesión aparece, sin sesión no, y que altera la presentación de las tres páginas de inmediato

## 4. Integración y calidad

- [x] 4.1 Pasar `npm run typecheck`, `npm run lint` y `npm run build` en `apps/web` (y el `build` de raíz) y corregir cualquier fallo
- [x] 4.2 Smoke manual (o `docker compose up --build -d`): con sesión, alternar a modo lista y verificar que explorar/búsqueda, favoritos e historial muestran filas; recargar la página y confirmar que el modo elegido se conserva; con un dispositivo/borrado de `localStorage` confirmar que el modo por defecto es tarjeta; verificar que un invitado no ve el control