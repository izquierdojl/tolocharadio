## 1. Backend - Servicio

- [x] 1.1 Añadir método `removeStation(userId, stationId)` en `apps/api/src/services/history.ts` que elimine una emisora específica del historial
- [x] 1.2 Verificar que el método valida el formato del stationId antes de ejecutar la consulta
- [x] 1.3 Verificar que el método retorna `{ ok: true }` en caso de éxito y error 404 si no existe

## 2. Backend - Router

- [x] 2.1 Añadir endpoint `DELETE /api/v1/history/:stationId` en `apps/api/src/routes/history.ts`
- [x] 2.2 Verificar que el endpoint requiere autenticación JWT
- [x] 2.3 Verificar que el endpoint maneja errores correctamente (404 para emisora no encontrada)

## 3. Backend - OpenAPI

- [x] 3.1 Añadir especificación del nuevo endpoint en `apps/api/src/openapi.ts`
- [x] 3.2 Verificar que la documentación incluye parámetros de ruta y respuestas

## 4. Frontend - Página de Historial

- [x] 4.1 Añadir botón de eliminación individual para cada emisora en `apps/web/src/pages/History.tsx`
- [x] 4.2 Añadir mutación React Query para eliminar emisora específica
- [x] 4.3 Verificar que la caché se invalida correctamente tras la eliminación

## 5. Testing

- [x] 5.1 Añadir prueba para el nuevo endpoint en `apps/api/test/history.test.ts`
- [x] 5.2 Verificar que la eliminación requiere autenticación
- [x] 5.3 Verificar que la eliminación exitosa retorna `{ ok: true }`
- [x] 5.4 Verificar que la eliminación de emisora inexistente retorna 404

## 6. Verificación Final

- [x] 6.1 Ejecutar `npm run typecheck` y verificar que no hay errores de tipo
- [x] 6.2 Ejecutar `npm run lint` y verificar que no hay errores de linting
- [x] 6.3 Ejecutar `npm run test` y verificar que todas las pruebas pasan
- [x] 6.4 Verificar que la funcionalidad funciona en Docker con `docker compose up --build -d`
