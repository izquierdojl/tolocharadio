# auth-refresh-deslizante — Tareas

## 1. Configuración

- [x] 1.1 Añadir `REFRESH_ROTATE_THRESHOLD` (duración, default `"24h"`) y `REFRESH_GRACE_MS` (ms, default `60000`) al `EnvSchema` y a la interfaz `Config` en `apps/api/src/config/env.ts`, y verificar que `npm run test --workspace @tolocharadio/api` pasa (config.test.ts cubre defaults)
- [x] 1.2 Documentar las dos variables en `.env.example` y `docs/instalacion.md`

## 2. Lógica de refresh

- [x] 2.1 Modificar `AuthService.refresh()` en `apps/api/src/services/auth.ts`: con token válido y vida restante > umbral, devolver el mismo refresh token (re-deslizando `expiresAt` en BD y emitiendo access token nuevo) sin borrar/insertar filas, y verificar con un test que la fila original sigue existiendo tras el refresh
- [x] 2.2 Implementar la rotación al final de la vida: con vida restante ≤ umbral, fijar la caducidad de la fila vieja a `now + REFRESH_GRACE_MS` en lugar de borrarla, insertar la fila nueva y devolver el par nuevo, y verificar con un test que el token viejo sigue siendo usable dentro de la gracia
- [x] 2.3 Cubrir el reuso del token viejo dentro de la gracia (vuelve a rotar y devuelve tokens válidos) y fuera de la gracia (401), con tests para ambos casos
- [x] 2.4 Verificar que `logout`, `changePassword` y `resetPassword` siguen revocando (los tests existentes de auth pasan sin cambios)

## 3. Verificación integral

- [x] 3.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` en la raíz y confirmar que todo pasa
- [x] 3.2 Smoke manual en Docker (`docker compose up --build -d`): login → refresh → recargar página sin perder la sesión, y recarga tras expirar el access token (o borrándolo) con restauración automática
## 4. Frontend: falso "sesión caducada" tras recarga

- [x] 4.1 Corregir `ensureValidToken()` en `apps/web/src/lib/api.ts` para que una sesión restaurada por cookie (token no presente en memoria) refresque el token en lugar de devolver `false`, y verificar con `npm run typecheck`, `npm run lint` y `npm test`
- [x] 4.2 Verificación manual en dev con el backend nuevo: login → reproducir → Ctrl+F5 → reproducir de nuevo sin toast de sesión caducada, y recarga con access token expirado con restauración automática
