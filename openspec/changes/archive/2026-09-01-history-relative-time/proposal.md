## Why

El historial muestra la fecha de ultima reproduccion como fecha absoluta ("01 sep, 14:30"), pero los usuarios tienen mas intuicion con tiempo relativo ("hace 5 minutos"). Mostrar "hace X tiempo" en cada item del historial mejora la experiencia y es mas estetico.

## What Changes

- Nueva funcion `timeAgo()` en el frontend que calcula tiempo relativo desde un timestamp
- El banner "Ultima escucha" muestra tiempo relativo en vez de fecha absoluta
- Cada item de la vista lista muestra tiempo relativo debajo del nombre de la emisora
- Cada item de la vista card muestra tiempo relativo al final del contenido
- Tooltip con `title` en todos los casos muestra la fecha y hora absoluta completa
- Los componentes `StationListItem` y `StationCard` reciben una prop opcional `playedAt`

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `history`: El requisito de listar historial se amplia para incluir representacion de tiempo relativo en la UI, con fecha absoluta como tooltip.

## Impact

- `apps/web/src/pages/History.tsx` — nueva funcion `timeAgo()`, paso de `playedAt` a componentes
- `apps/web/src/components/StationListItem.tsx` — prop opcional `playedAt`, renderizado de tiempo relativo
- `apps/web/src/components/StationCard.tsx` — prop opcional `playedAt`, renderizado de tiempo relativo
- Sin cambios en backend ni API — el campo `playedAt` ya existe y se devuelve
- Sin dependencias nuevas
