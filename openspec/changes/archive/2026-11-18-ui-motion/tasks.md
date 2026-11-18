# Tasks

## 1. Base de movimiento en CSS

- [x] 1.1 Añadir keyframes `pop`, `slide-up`, `fade-slide-down` y `eq-bounce` en `apps/web/src/index.css` con `prefers-reduced-motion` y verificar que `npm run verify --workspace @tolocharadio/web` pasa y que con movimiento reducido no hay animación.
- [x] 1.2 Definir duraciones/easing coherentes (150-200ms) reutilizando `fade-in` existente y verificar visualmente overlay y desplegable de ejemplo en ambos temas.

## 2. Botones y tarjetas

- [x] 2.1 Aplicar `active:scale-95` y `transition-transform` a botones de reproducir, controles del reproductor, copiar enlace, reintentar y toggles, y verificar pulsando cada uno que hay respuesta de escala sin retrasar la acción.
- [x] 2.2 Aplicar elevación en hover/foco y zoom suave de imagen en `StationCard` y `StationListItem`, y verificar con ratón y teclado que no se rompe el layout en móvil y escritorio.
- [x] 2.3 Añadir animación "pop" al `FavoriteButton` al marcar/desmarcar y verificar que se reproduce en ambos sentidos y respeta movimiento reducido.

## 3. Menús, combobox y diálogo

- [x] 3.1 Animar entrada/salida del menú hamburguesa y del menú de usuario (fade + escala/slide) y verificar apertura, cierre por opción, clic fuera y Escape.
- [x] 3.2 Animar el desplegable del `Combobox` (fade + slide corto) manteniendo la rotación del chevron y verificar filtrado, selección con teclado y Escape.
- [x] 3.3 Animar la caja interior del `ConfirmDialog` (escala + subida) además del overlay y verificar foco inicial, Escape y clic en fondo.

## 4. Reproductor

- [x] 4.1 Añadir entrada `slide-up` al `PlayerBar` al elegir emisora/episodio y fundido del texto secundario al cambiar (con `key`), y verificar cambio de emisora sin saltos de layout.
- [x] 4.2 Añadir ecualizador CSS de 3 barras en reproducción y estado estático en pausa, y verificar en móvil (<640px) que no muestra información extra y que con movimiento reducido queda estático.

## 5. Verificación integrada

- [x] 5.1 Ejecutar `npm run verify:full` y `docker compose up --build -d` + smoke del frontend, y verificar que no hay regresiones visuales en temas claro/oscuro ni en navegación por teclado.
