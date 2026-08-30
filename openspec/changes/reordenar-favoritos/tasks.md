# Tasks

## 1. Modelo de datos (API)

- [x] 1.1 Añadir columna `position` (integer, nullable) a la tabla `favorites` en `apps/api/src/db/schema.ts` y generar la migración Drizzle; verificar que `npm run typecheck` en `apps/api` pasa y que la migración se aplica sin error al levantar la API
- [x] 1.2 Verificar que el arranque de la API aplica la migración y que `GET /favorites` sigue devolviendo la lista por defecto (cronológico inverso) sin cambios de formato

## 2. Servicio de favoritos (API)

- [x] 2.1 Modificar `FavoritesService.list` en `apps/api/src/services/favorites.ts` para ordenar por `position` ASC con fallback de `createdAt` DESC (tratando `NULL` como "sin orden" y detrás de los posicionados); verificar que con datos sin `position` el orden sigue siendo cronológico inverso
- [x] 2.2 Añadir método `reorder(userId, stationIds)` que valide que `stationIds` es exactamente una permutación de los favoritos de la cuenta (misma cardinalidad y mismos elementos) y asigne `position = índice`; rechazar con conflicto si la lista es incompleta o contiene emisoras no favoritas; verificar el comportamiento con tests unitarios del servicio

## 3. Endpoint de reordenado (API)

- [x] 3.1 Añadir `PUT /favorites/order` en `apps/api/src/routes/favorites.ts`, protegido por `requireAuth`, que valide el cuerpo (`{ stationIds: string[] }`) y llame a `FavoritesService.reorder`; verificar con llamada autenticada que responde `{ ok: true }` y que `GET /favorites` refleja el nuevo orden
- [x] 3.2 Verificar respuestas de error (401 sin token, conflicto por lista incompleta o emisora no favorita, 404 ajeno) mediante tests de rutas o llamadas reales
- [x] 3.3 Actualizar la documentación OpenAPI para incluir el nuevo endpoint `PUT /favorites/order` con su esquema de petición/respuesta; verificar que aparece en `/api/v1/docs` y en `/api/v1/openapi.json`

## 4. Reordenado en la web

- [x] 4.1 Añadir el tipo de petición/uso del endpoint en `apps/web/src/lib/api.ts` (función para `PUT /favorites/order`) y confirmar que el tipo `FavoriteEntry` mantiene su forma
- [x] 4.2 Hacer reordenable la lista de favoritos en `apps/web/src/pages/Favorites.tsx`: controles de arrastrar y soltar y/o botones subir/bajar por elemento, sin alterar el componente genérico `StationList`; verificar que el orden visual cambia al interactuar
- [x] 4.3 Al terminar un reorden, llamar a `PUT /favorites/order` con el nuevo orden e invalidar la query `["favorites"]`; si falla, revertir localmente al último orden válido y mostrar un toast de error; verificar la coherencia tras reordenar y refrescar

## 5. Verificación integral

- [x] 5.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` en el workspace y confirmar que todo pasa
- [x] 5.2 Levantar el stack con `docker compose up --build -d` y hacer smoke test: añadir favoritos, reordenarlos desde la web y desde el API (herramienta externa) y comprobar que ambos consumidores ven el mismo orden persistido
