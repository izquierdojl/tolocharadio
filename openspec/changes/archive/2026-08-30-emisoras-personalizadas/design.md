## Context

La API (`apps/api`) expone catálogo desde radio-browser.info vía `StationsService`, y mantiene datos por usuario en SQLite (drizzle) con tablas propias (`favorites`, `history`) que guardan un `snapshot` JSON del objeto `Station`. El proxy de playback (`routes/playback.ts`) resuelve la emisora por `ctx.stations.getStation(stationId)` y usa su `url` para reenviar el stream, registrando además el historial.

El frontend (`apps/web`) muestra `Station` y usa un favicon o el emblema `SierraEmblem` cuando no hay imagen. Una emisora personalizada no tiene favicon propio: debe mostrarse siempre con el emblema Tolocha.

Ver proposal.md (`Why`) para la motivación.

## Goals / Non-Goals

**Goals:**
- Proporcionar CRUD mínimo (crear, listar, eliminar) de emisoras personalizadas, aisladas por usuario.
- Hacerlas reproducibles con el proxy de playback existente y compatibles con favoritos/historial.
- Reutilizar el modelo `Station` para no bifurcar el frontend; distinguir el origen (catálogo vs personalizada) con un marcador.

**Non-Goals:**
- No modificar el catálogo global de radio-browser.info ni mezclarlas en su búsqueda.
- No incluir edición de emisoras personalizadas (fuera de alcance inicial).
- No añadir imagen/subida de archivos para emisoras personalizadas (siempre usan el emblema Tolocha).

## Decisions

### 1. Identificador de emisora con prefijo de namespace
Las emisoras del catálogo usan IDs con `stationuuid` de radio-browser.info. Para no colisionar, cada emisora personalizada recibe un identificador con prefijo reservado, p. ej. `custom:<uuid-numérico>`. Todo el sistema (playback, favoritos, historial, snapshots) sigue usando un único `stationId` de tipo texto.

- **Alternativa considerada**: separar el campo origen (catálogo/personalizada) en el snapshot. Se descarta: el prefijo es suficiente y evita añadir lógica de ambigüedad en favoritos/historial.

### 2. Nueva tabla `custom_stations` con snapshot normalizado
Almacenar `id`, `userId`, `name`, `url` (saneda y normalizada) y `createdAt`, más una columna `snapshot` que serializa el objeto `Station` correspondiente (con `favicon: null`, `isCustom: true`). Así favoritos/historial pueden guardar un snapshot idéntico al de las emisoras del catálogo.

- **Alternativa**: derivar el `Station` al vuelo. Se descarta: el snapshot evita duplicar la lógica de serialización y mantiene la misma forma que usan `favorites`/`history`.

### 3. Resolución unificada en playback: `getStation` aware de namespace
Para no bifurcar `playback.ts`, se extiende la resolución para que, cuando el `stationId` lleva el prefijo `custom:`, la resolución delegue en `CustomStationsService` (respetando el `userId` de la sesión, de modo que una emisora ajena se traduce en un 404 equivalente). En caso contrario sigue resolviendo contra el catálogo.

- **Alternativa**: ruta de playback separada para personalizadas. Se descarta: duplica el código de streaming y el registro de historial.

### 4. Marcar `isCustom` en el objeto `Station`
Se amplía el tipo `Station` con un booleano `isCustom` (por defecto `false` para el catálogo) para que el frontend sepa cuándo renderizar el emblema Tolocha en lugar del favicon, sin tener que inspeccionar el prefijo.

### 5. Endpoints protegidos REST
- `POST /custom-stations` (crear, validación de nombre + URL HTTP(S)).
- `GET /custom-stations` (listar las mías).
- `DELETE /custom-stations/:id` (eliminar; también limpia favoritos/historial de la cuenta).
Todos autenticados con `requireAuth`; el borrado usa la transacción de SQLite para limpiar `favorites`/`history` del usuario cuyo `stationId` coincida.

## Risks / Trade-offs

- [Colisión de IDs] Los IDs del catálogo vienen de radio-browser.info; el prefijo `custom:` elimina el riesgo de colisión → Decisión 1.
- [Emisora personalizada con stream caído] Igual que el catálogo, se degrada al reproducir/status con el mismo manejo de errores existente → mitigación compartida en `playback`.
- [Datos de otra cuenta] El aislamiento depende de resolver siempre contra el `userId` de la sesión → se delega en `getStation` con `userId` y en consultas filtradas por `userId`.
- [Migración de esquema] Nueva tabla implica migración de SQLite; se reutiliza el flujo de migraciones existente (`db/migrate.ts`).

## Open Questions

Ninguna pendiente que afecte a specs, enfoque o desglose de tareas.
