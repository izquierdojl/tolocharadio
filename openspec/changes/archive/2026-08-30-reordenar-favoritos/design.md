## Context

La capacidad `favorites` persiste en la tabla `favorites` de SQLite la relación `(userId, stationId)` junto a un `snapshot` de la emisora y un `createdAt` (marca de tiempo). El servicio `FavoritesService.list()` ordena por `createdAt` descendente, por lo que hoy el orden es inamovible y derivado de la fecha de adición. El API expone `GET /favorites`, `POST /favorites` y `DELETE /favorites/:stationId` bajo `/api/v1`, todos tras `requireAuth`. El frontend consume esos endpoints y muestra la lista mediante `StationList`. Motivación y alcance en `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Persistir un orden personalizado de favoritos por cuenta en el servidor.
- Exponer un endpoint que permita fijar/reordenar los favoritos, usable por el frontend y por herramientas externas autenticadas con JWT.
- Que el listado de favoritos devuelva el orden personalizado cuando exista, y el cronológico inverso por defecto (compatibilidad).
- Añadir la interacción de reordenado en la página de favoritos de la web.

**Non-Goals:**
- No se modifica la lista de favoritos ajenos ni el aislamiento entre cuentas (ya garantizado).
- No se añaden reordenados de otras colecciones (historial, estaciones).
- No se implementan carpetas/agrupaciones ni favoritos por estación favorita duplicada.

## Decisions

### D1. Persistir el orden con una columna `position`
Se añade una columna `position` (integer, nullable) a la tabla `favorites`. El orden personalizado se deriva ordenando por `position` ASC y, como desempate/fallback, por `createdAt` DESC. `NULL` se trata como "sin orden personalizado" y se ordena después de los posicionados (comportamiento por defecto previo).

- **Alternativa (rechazada): tabla separada `favorite_order`.** Añadir complejidad sin beneficio real: la relación ya existe en `favorites` y el volumen por cuenta es pequeño; una sola columna mantiene el modelo simple y aprovecha el índice único `(userId, stationId)`.

### D2. Semántica del orden: lista completa y sin huecos
El nuevo endpoint exige un array de `stationId` que debe ser exactamente una permutación de los favoritos actuales (misma cardinalidad y mismos elementos). Cualquier elemento extraño o faltante se rechaza con conflicto. Esto evita órdenes parciales ambiguos y mantiene el invariante "todos los favoritos tienen posición". Se asigna `position = índice de la lista enviada`.

- **Alternativa (rechazada): aceptar subconjuntos o inserts puntuales (ej. "mover X a posición Y").** Más flexible pero más complejo y propenso a estados inconsistentes para consumidores externos; la permutación completa es un contrato simple y determinista.

### D3. Endpoint `PUT /favorites/order`
`PUT /api/v1/favorites/order` recibe `{ stationIds: string[] }`, valida contra los favoritos de la cuenta y reescribe las posiciones. Responde `{ ok: true }` (o la lista resultante). Es idempotente. Se usa `PUT` por ser una actualización completa del recurso "orden".

- **Alternativa (rechazada): `POST /favorites/reorder`.** `PUT` sobre `/favorites/order` encaja mejor con la semántica de actualización total y es coherente con el resto de la API versionada.

### D4. Reordenado en la web: drag & drop + botones subir/bajar
En `Favorites.tsx`, la lista se vuelve reordenable. Como `StationList` es genérica y reutilizable en otras vistas, el reordenado se aplica a nivel de la página de favoritos (no se toca la vista de catálogo): se añade un control por elemento (arrastrar y/o flechas subir/bajar) y, al terminar un cambio, se llama a `PUT /favorites/order` con el nuevo orden y se refresca la query. Aunque visualmente se use `StationListItem`, el orden se gestiona localmente en la página y se persiste tras cada movimiento.

- **Alternativa (rechazada): reutilizar el drag & drop dentro de `StationList`.** Acoplaría el componente genérico a la lógica de favoritos; mantenerlo en la página conserva la reutilización del catálogo.

## Risks / Trade-offs

- **[Orden personalizado sin persistencia inmediata]** → Tras cada reorden se llama a `PUT /favorites/order`; si falla, se revierte localmente al último orden válido y se muestra un toast de error, manteniendo coherencia con el servidor.
- **[Coherencia con otras pestañas/dispositivos]** → El listado siempre refleja el orden del servidor; al invalidar la query tras reordenar se evita mostrar estados caducos.
- **[Migración de la columna `position` en SQLite]** → Drizzle genera la migración; al ser nullable no requiere rellenar datos previos. Despliegue monolítico en un paso con la migración en el arranque.
- **[Compatibilidad de consumidores existentes]** → Mantener `GET /favorites` devolviendo `{ items }` con el formato actual preserva los consumidores; el orden por defecto sigue siendo cronológico inverso hasta que el usuario reordene.

## Migration Plan

1. Migración Drizzle que añade `position` (integer, nullable) a `favorites`.
2. Despliegue monolítico (API + web) en un paso.
3. Rollback: quitar la migración y restaurar el código previo; al ser `position` nullable, descartar la columna no pierde datos de favoritos existentes (solo el orden personalizado establecido con la nueva versión).

## Open Questions

Ninguna que afecte a specs, enfoque o desglose de tareas.
