## 1. Limpieza del PlayerBar

- [x] 1.1 Eliminar el boton "Siguiente emisora" de `apps/web/src/components/PlayerBar.tsx` (bloque `onClick={() => next(fallbackStations)}` con icono `SkipForward`, lineas 93-100), eliminar `SkipForward` del import `lucide-react`, eliminar `fallbackStations` de `PlayerBarProps` y la desestructuracion de `next` en `usePlayerStore()`. Verificar: `grep -R "SkipForward\|fallbackStations\|next(fallback"` en `apps/web/src` no devuelve resultados en `PlayerBar.tsx` y `npm run typecheck --workspace @tolocharadio/web` pasa.
- [x] 1.2 Verificar layout tras la eliminacion: el PlayerBar sigue mostrando miniatura, nombre/pais/idioma, boton copiar enlace (desktop), play/pausa y stop sin huecos ni desbordamiento en viewport desktop y movil (<640px). Verificar visualmente o con snapshot DOM.

## 2. Limpieza del store de reproduccion

- [x] 2.1 Si `grep -R "player.*next\|\.next\("` confirma que no hay otros consumidores de `next()`, eliminar `next: (stations: Station[]) => void` de `PlayerState` y la implementacion `next(stations)` en `apps/web/src/stores/player.ts` (lineas 14 y 85-91). Si se decide conservarlo, dejar comentario `// no usado tras fix-quitar-boton-siguiente`. Verificar: `npm run typecheck` y `npm run lint --workspace @tolocharadio/web` pasan sin errores.
- [x] 2.2 Verificar que el resto de controles del reproductor (play/pausa `toggle()`, `stop()`, `setVolume()`, copiar enlace, info tecnica) siguen funcionando tras el cambio. Verificar: reproducir/pausar una emisora, ajustar volumen, copiar enlace y stop responden sin regresiones (test manual o e2e existente).

## 3. Verificacion y calidad

- [x] 3.1 Ejecutar `npm run typecheck && npm run lint && npm run test && npm run build` desde la raiz y verificar que todos pasan. Verificar salida sin errores.
- [x] 3.2 Smoke en Docker tras el cambio: `docker compose up --build -d` y verificar que la web carga y el PlayerBar no muestra el boton siguiente en desktop ni movil.
