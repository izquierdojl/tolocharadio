## Context

En `PlayerBar.tsx`, la función `copyLink` usa `playbackUrl(station.id)` que devuelve la ruta relativa del proxy interno (`/api/v1/playback/:stationId`). Esta ruta requiere autenticación y no es accesible fuera de la aplicación. El `Station` ya expone `station.url` (la URL pública del stream), que es el enlace correcto para compartir.

## Goals / Non-Goals

**Goals:**
- Copiar al portapapeles la URL pública del stream (`station.url`) en vez de la ruta del proxy interno.

**Non-Goals:**
- No se añade Web Share API (`navigator.share()`).
- No se modifica la lógica de playback (el reproductor sigue usando el proxy autenticado internamente).

## Decisions

### Usar `station.url` directamente
- **Decisión**: Reemplazar `playbackUrl(station.id)` por `station.url` en `copyLink`.
- **Alternativa descartada**: Construir una URL absoluta con `window.location.origin + playbackUrl(...)`. Esto seguiría copiando el enlace interno del proxy, solo que en formato absoluto — no resuelve el problema de accesibilidad.
- **Razón**: `station.url` es la URL pública que el usuario comparte. Es directa, no requiere autenticación y es el enlace estándar de la emisora.

## Risks / Trade-offs

- **[Riesgo]** Algunas `station.url` podrían ser URLs internas del servidor de stream no accesibles públicamente → **Mitigación**: Esto es responsabilidad de la fuente de datos (Radio Browser API / estaciones custom). El botón refleja lo que la emisora ofrece como URL de stream.
