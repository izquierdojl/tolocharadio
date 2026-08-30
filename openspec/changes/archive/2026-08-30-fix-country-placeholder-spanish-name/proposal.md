## Why

El placeholder del combobox de filtro de país en la pantalla de exploración muestra "País (ej. España)". Los nombres de país del catálogo provienen de RadioBrowser en inglés (p. ej. "Spain"), por lo que el ejemplo "España" no coincide con ninguna opción real que el usuario pueda escribir/seleccionar, resultando confuso.

## What Changes

- Cambiar el texto del placeholder del filtro de país de "País (ej. España)" a "País (ej. Spain)" en la pantalla de exploración de emisoras.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. No hay cambios de comportamiento a nivel de spec: es una corrección de texto visible que no altera requisitos, y por ello el change declara `skip_specs: true`.

## Impact

- `apps/web/src/pages/Explore.tsx`: actualización del texto del atributo `placeholder` del `FilterControl` del filtro de país.
- Sin cambios de API, dependencias o sistemas.
