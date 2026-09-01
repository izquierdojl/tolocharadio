## Why

El boton "Siguiente" (`SkipForward`) del `PlayerBar` esta muerto: `AppShell.tsx:312` monta `<PlayerBar />` sin `fallbackStations` y `player.ts:85` hace `return` si la lista esta vacia, por lo que el clic no hace nada. Genera confusion ("no se para que sirve"), ocupa espacio en movil y refuerza una metafora de playlist (`siguiente cancion`) que no encaja con el modelo de radio (una emisora a la vez, sin cola). Quitarlo limpia la UI y evita prometer una navegacion que hoy no existe.

## What Changes

- Eliminar el boton "Siguiente emisora" (`SkipForward`) del `PlayerBar` (`apps/web/src/components/PlayerBar.tsx:93-100`), incluyendo su import y handler `next(fallbackStations)`.
- Simplificar `PlayerBarProps` eliminando `fallbackStations` si queda sin uso.
- Evaluar y, si no hay otros consumidores, eliminar `next()` de `apps/web/src/stores/player.ts:85-91` y su tipo en `PlayerState`.
- Actualizar spec `web-ui` (Requirement: Reproductor flotante persistente) para reflejar que el reproductor ofrece play/pausa, volumen y stop, sin "siguiente".
- Sin cambios de API ni de modelo de datos.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `web-ui`: Requirement "Reproductor flotante persistente" y escenarios asociados dejan de incluir el control "siguiente". Se actualiza la descripcion del reproductor simplificado en movil para listar solo play/pausa y stop.

## Impact

- **Frontend web** (`apps/web/src/components/PlayerBar.tsx`, `apps/web/src/stores/player.ts`): UI y store. Cambio visible menor, sin migration.
- **Specs**: `openspec/specs/web-ui/spec.md` (delta).
- **Riesgo**: Bajo. No hay consumidores de `next()` fuera de `PlayerBar` (verificado via grep). Si se quisiera reintroducir navegacion en el futuro, se haria con una cola explicita en un change posterior.
- **UX movil**: libera espacio horizontal en el PlayerBar, coherente con la simplificacion ya aplicada (`hidden sm:*`).
