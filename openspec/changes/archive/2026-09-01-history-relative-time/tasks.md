## 1. Funcion timeAgo

- [x] 1.1 Crear funcion `timeAgo(ts: number): string` en `apps/web/src/pages/History.tsx` que devuelva "hace un momento" (<60s), "hace N minuto(s)" (<60min), "hace N hora(s)" (<24h), "hace N dia(s)" (>=24h) con pluralizacion correcta en espanol. Verificar con `npm run typecheck` que compila sin errores.

## 2. Componentes StationListItem y StationCard

- [x] 2.1 Anadir prop opcional `playedAt?: number` a `StationListItem` en `apps/web/src/components/StationListItem.tsx`. Si se proporciona, renderizar texto con `timeAgo(playedAt)` debajo del nombre de la emisora, con `title` attribute con fecha absoluta formateada. Verificar con `npm run typecheck`.
- [x] 2.2 Anadir prop opcional `playedAt?: number` a `StationCard` en `apps/web/src/components/StationCard.tsx`. Si se proporciona, renderizar texto con `timeAgo(playedAt)` al final del contenido de la tarjeta, con `title` attribute con fecha absoluta formateada. Verificar con `npm run typecheck`.

## 3. Pagina History

- [x] 3.1 En `apps/web/src/pages/History.tsx`, pasar `playedAt={latest.playedAt}` al banner "Ultima escucha" y reemplazar `formatDate()` por `timeAgo()` con tooltip. Verificar visualmente en el navegador.
- [x] 3.2 En la vista lista, pasar `playedAt` correspondiente a cada `StationListItem` mapeando desde `data.items`. Verificar visualmente.
- [x] 3.3 En la vista card, pasar `playedAt` correspondiente a cada `StationCard` mapeando desde `data.items`. Verificar visualmente.

## 4. Verificacion final

- [x] 4.1 Ejecutar `npm run typecheck`, `npm run lint` y `npm run build` desde la raiz del monorepo. Todos deben pasar sin errores.
