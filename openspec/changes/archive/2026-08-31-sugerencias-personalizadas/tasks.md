## 1. Rama de trabajo

- [x] 1.1 Crear la rama `feature/sugerencias-personalizadas` desde `main` y verificar que la rama activa es la nueva

## 2. Backend - Esquema y migración

- [x] 2.1 Añadir la tabla `suggestions` (`id`, `userId`, `genre`, `createdAt`, índice único `(userId, genre)` e índice por `userId`) en `apps/api/src/db/schema.ts` y verificar que compila el esquema
- [x] 2.2 Generar la migración con drizzle-kit y aplicarla, verificando que la tabla aparece en la base de datos

## 3. Backend - Servicio

- [x] 3.1 Crear `SuggestionsService` en `apps/api/src/services/suggestions.ts` con `list(userId)`, `add(userId, genre)` y `delete(userId, id)` y verificar que se comporta según la spec
- [x] 3.2 Verificar que `add` sane el género (rechaza vacío/espacios) y lanza conflicto si el género ya existe para el usuario
- [x] 3.3 Verificar que `list` devuelve solo las sugerencias del usuario en orden de creación y que `delete` de una sugerencia ajena o inexistente responde como éxito
- [x] 3.4 Registrar `SuggestionsService` en `apps/api/src/factory.ts` y `apps/api/src/context.ts` como `ctx.suggestions` y verificar que la compilación pasa

## 4. Backend - Router y OpenAPI

- [x] 4.1 Crear `suggestionsRouter` en `apps/api/src/routes/suggestions.ts` con `GET /suggestions`, `POST /suggestions` (body `{ genre }`) y `DELETE /suggestions/:id`, todos con `requireAuth`, y montarlo en `apps/api/src/app.ts`
- [x] 4.2 Verificar que el POST devuelve 201 con la sugerencia, 409 en duplicado y 422 en género vacío (error de validación, convención del proyecto), y que sin autenticación responde 401
- [x] 4.3 Añadir las tres operaciones y sus esquemas al documento OpenAPI en `apps/api/src/openapi.ts` y verificar que la validación OpenAPI pasa

## 5. Backend - Pruebas

- [x] 5.1 Crear `apps/api/test/suggestions.test.ts` con cobertura de lista vacía, alta, duplicado (409), género vacío (422), borrado, aislamiento entre cuentas y 401 sin sesión, y verificar que pasan (`npm run test`)
- [x] 5.2 Verificar que las pruebas del endpoint OpenAPI (`apps/api/test/openapi.test.ts`) siguen pasando

## 6. Frontend - API y tipos

- [x] 6.1 Añadir el tipo `Suggestion` (`{ id: number; genre: string }`) en `apps/web/src/lib/types.ts` y las funciones `fetchSuggestions`, `createSuggestion` y `deleteSuggestion` en `apps/web/src/lib/api.ts`, verificando que el typecheck pasa

## 7. Frontend - Fila de sugerencias en Explorar

- [x] 7.1 En `apps/web/src/pages/Explore.tsx` reemplazar las chips fijas (`EXAMPLES`) por la fila de sugerencias del usuario consultada con React Query (queryKey `["suggestions"]`)
- [x] 7.2 Hacer que pulsar una chip aplique el filtro de género (`tag`) con `applyFilters` y actualice la rejilla
- [x] 7.3 Añadir control de añadir sugerencia reutilizando el combobox de géneros del catálogo, con mutación `createSuggestion` que invalida la caché de `["suggestions"]`
- [x] 7.4 Añadir acción de eliminar en cada chip con mutación `deleteSuggestion` que invalida la caché tras el borrado
- [x] 7.5 Mostrar un estado que invite a añadir la primera sugerencia cuando el usuario no tiene ninguna, y verificar el comportamiento en el navegador

## 8. Verificación final

- [x] 8.1 Ejecutar `npm run typecheck` y verificar que no hay errores de tipo
- [x] 8.2 Ejecutar `npm run lint` y verificar que no hay errores de linting
- [x] 8.3 Ejecutar `npm run test` y verificar que todas las pruebas pasan
- [x] 8.4 Ejecutar `npm run build` y verificar que compilan ambos workspaces
- [x] 8.5 Confirmar en Docker con `docker compose up --build -d` y un smoke test de la funcionalidad