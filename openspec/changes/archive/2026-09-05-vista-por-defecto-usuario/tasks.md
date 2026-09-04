## 1. Backend — preferencia en el perfil

- [x] 1.1 Añadir `defaultView` a `users` (Drizzle `default_view NOT NULL DEFAULT 'explorar'`), generar la migración con `db:generate` y verificar que `db:migrate` la aplica y que usuarios existentes devuelven `explorar`.
- [x] 1.2 Extender `updateProfile` y el esquema Zod de `PATCH /users/me` con `defaultView` (`explorar` | `favoritos` | `historial`, error de validación en español ante otro valor) y actualizar el esquema OpenAPI del usuario; verificar con los tests del API (`npm run test --workspace apps/api` o equivalente) y una petición manual a `GET/PATCH /users/me`.

## 2. Frontend — selector y navegación inicial

- [x] 2.1 Extender el tipo `User` con `defaultView`, añadir el helper central de mapeo preferencia → ruta (`/explorar`, `/favoritos`, `/historial`, caída a `/explorar`) y verificar con `npm run typecheck --workspace apps/web`.
- [x] 2.2 Añadir en `/perfil` el selector de vista por defecto (Explorar/Favoritos/Historial, textos en español) con guardado vía `PATCH /users/me`, confirmación visual y mensaje de error ante fallo; verificar manualmente que el valor persiste tras recargar.
- [x] 2.3 Dirigir a la vista por defecto tras login/registro y redirigir `/` a la vista por defecto cuando hay sesión (respetando el estado `loading` y dejando la portada intacta para invitados); verificar manualmente los escenarios de las specs (login, registro, apertura de `/` con y sin sesión, valor ausente → `/explorar`).

## 3. Calidad y verificación

- [x] 3.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`, y verificar que los cuatro pasan sin errores.
- [x] 3.2 Confirmar en Docker tras los cambios del backend con `docker compose up --build -d` más una comprobación de humo (login, consulta de perfil con `defaultView`, cambio de preferencia y redirección inicial), y verificar que no hay regresiones en invitados.
