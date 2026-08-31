## Context

La API (`apps/api`) mantiene datos por usuario en SQLite (drizzle/better-sqlite3) con tablas propias (`favorites`, `history`, `custom_stations`), servicios inyectados en `AppContext` y routers Express protegidos con `requireAuth`. El frontend (`apps/web`) muestra en `Explore.tsx` una fila de "Sugerencias" con chips hardcodeadas (`EXAMPLES = ["clásica", "jazz", "folk"]`) que al pulsarlas rellenan el filtro de **nombre** y rehacen la búsqueda. Existe un combobox de géneros (`tagsQuery` → `GET /stations/tags`) reutilizable para elegir géneros del catálogo.

Ver proposal.md (`Why`) para la motivación.

## Goals / Non-Goals

**Goals:**
- Persistir por cuenta una lista personal de géneros sugeridos (añadir, listar, eliminar) a través de la API.
- Sustituir las chips fijas de `Explore.tsx` por las sugerencias del usuario, de modo que pulsar una chip aplique el filtro de **género** (no el de nombre).
- Mantener el aislamiento por cuenta en todos los accesos.

**Non-Goals:**
- No recomendar emisoras ni generar sugerencias automáticamente a partir del historial o los favoritos.
- No aplicar sugerencias a invitados (la exploración ya es solo para autenticados).
- No cambiar la búsqueda ni los filtros existentes más allá de que la chip aplique el filtro de género.

## Decisions

### 1. Nueva tabla `suggestions` con unicidad por (usuario, género)
Almacenar `id`, `userId`, `genre` (texto saneado) y `createdAt`, con índice único `(userId, genre)` para impedir duplicados a nivel de esquema y filtros por `userId`. Orden de listado por `createdAt` ascendente (las más antiguas primero), igual que el orden de la fila de sugerencias.

- **Alternativa considerada**: guardar las sugerencias en una columna JSON del usuario. Se descarta: una tabla dedicada sigue el patrón existente (`favorites`, `history`, `custom_stations`) y simplifica la unicidad y el borrado puntual.

### 2. Servicio `SuggestionsService` y router `suggestions`
Nuevo servicio con `list(userId)`, `add(userId, genre)` y `delete(userId, id)`, inyectado en `AppContext` como `ctx.suggestions`. Nuevo router protegido con `requireAuth`:
- `GET /suggestions` → `{ items: [{ id, genre }] }`
- `POST /suggestions` body `{ genre }` → 201 `{ suggestion }`, conflicto si ya existe, validación si el género es vacío (se sane con `sanitizeText`)
- `DELETE /suggestions/:id` → `{ ok: true }` (ajena/inexistente también éxito, como en favoritos)

El borrado usa el `id` numérico, no el género, para no depender de codificar géneros en la URL.

- **Alternativa**: guardar/borrar por nombre de género (`/suggestions/:genre`). Se descarta: los géneros pueden contener caracteres especiales y el `id` numérico es inequívoco.

### 3. Endpoints `suggestions` en OpenAPI
Añadir las tres operaciones al documento OpenAPI existente (`apps/api/src/openapi.ts`) con sus esquemas, parámetros y respuestas, siguiendo el estilo de `favorites`/`custom-stations`.

### 4. Frontend: fila de sugerencias gestionada por React Query
En `apps/web/src/lib/api.ts` se añaden `fetchSuggestions()`, `createSuggestion(genre)` y `deleteSuggestion(id)`. En `types.ts` se añade `Suggestion` (`{ id: number; genre: string }`). En `Explore.tsx`:
- La fila de sugerencias consulta `fetchSuggestions` (queryKey `["suggestions"]`).
- Pulsar una chip llama a `applyFilters({ ...filters, tag: genero })` para aplicar el filtro de género.
- Botón de añadir que reutiliza el combobox de géneros del catálogo (`tagsQuery`) y, al confirmar, `createSuggestion` e invalida `["suggestions"]`.
- Cada chip incluye una acción de eliminar (`deleteSuggestion`) que invalida la caché tras el borrado.
- Estado vacío que invita a añadir la primera sugerencia cuando no hay ninguna.
- Mutaciones con React Query (patrón ya usado en `FavoriteButton`/`CustomStations`), con `toast` de confirmación.

- **Alternativa**: guardar las sugerencias solo en localStorage del cliente. Se descarta: el usuario pidió personalización por cuenta y el resto de preferencias (favoritos, historial) viven en la API.

### 5. Rama de trabajo separada
El desarrollo se hace en una rama propia siguiendo la convención del proyecto (p. ej. `feature/sugerencias-personalizadas`), abierta desde `main` antes de tocar código.

## Risks / Trade-offs

- [Género con caracteres especiales] Al borrar por `id` numérico se evita codificar géneros en URLs → Decisión 2.
- [Catálogo de géneros no disponible] El combobox de añadir degrade igual que el filtro de género existente (permite escribir manualmente) y comunica el problema sin romper la fila → se reutiliza el manejo degradado de `FilterControl`.
- [Chips fijas desaparecen] Los usuarios pierden las sugerencias genéricas actuales; quedan sustituidas por las suyas (vacías al principio con invitación a añadir) → cambio deliberado del requisito modificado de `web-ui`.
- [Migración de esquema] Nueva tabla implica migración SQLite; se reutiliza el flujo de `db/migrate.ts` con `drizzle-kit generate`.

## Migration Plan

1. Abrir rama `feature/sugerencias-personalizadas` desde `main`.
2. Añadir la tabla `suggestions` al esquema drizzle y generar/aplicar la migración.
3. Implementar servicio, router y OpenAPI en `apps/api`.
4. Implementar la fila de sugerencias en `apps/web`.
5. Pruebas de API (lista/alta/borrado, duplicados, aislamiento, 401) y verificación de calidad (`typecheck`, `lint`, `test`, `build`).
6. Confirmar en Docker (`docker compose up --build -d` + smoke).

## Open Questions

Ninguna pendiente que afecte a specs, enfoque o desglose de tareas.