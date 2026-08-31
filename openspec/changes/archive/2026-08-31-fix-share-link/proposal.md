## Why

El botón "Copiar enlace" del reproductor copia la ruta interna del API (`/api/v1/playback/:stationId`) al portapapeles. Ese enlace requiere autenticación y no es accesible fuera de la aplicación. El usuario espera poder compartir la URL pública del stream de la emisora, no un endpoint interno.

## What Changes

- El botón de copiar enlace pasará de copiar la ruta relativa del proxy de playback a copiar la URL directa del stream de la emisora (`station.url`).

## Capabilities

### New Capabilities

_No hay._

### Modified Capabilities

- `web-ui`: El escenario "Copiar enlace de emisión" cambia la URL que se copia al portapapeles: en vez de la ruta del proxy autenticado (`/api/v1/playback/:stationId`), se copia la URL pública del stream (`station.url`).

## Impact

- `apps/web/src/components/PlayerBar.tsx`: Se reemplaza la llamada a `playbackUrl(station.id)` por `station.url` en la función `copyLink`.
- La función `playbackUrl` puede dejarse de importar en `PlayerBar.tsx` si ya no se usa allí.
