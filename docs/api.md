# Uso de la API

> [← Volver al README](../README.md)

La especificación OpenAPI está publicada por el propio servidor:

- `GET /api/v1/openapi.json` — spec OpenAPI 3.1
- `GET /api/v1/docs` — Swagger UI interactiva

## Endpoints

Resumen de endpoints (todos bajo `/api/v1`):

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/health` | público | Healthcheck |
| `GET` | `/config` | público | Configuración pública (p. ej. registro habilitado) |
| `POST` | `/auth/register` | público | Alta de usuario (si está habilitada) |
| `POST` | `/auth/login` | público | Inicio de sesión (devuelve tokens + cookies) |
| `POST` | `/auth/refresh` | cookie/body | Rota el refresh token |
| `POST` | `/auth/logout` | autenticado | Revoca la sesión |
| `POST` | `/auth/forgot-password` | público | Genera token de reset de un solo uso |
| `POST` | `/auth/reset-password` | público | Establece nueva contraseña |
| `GET` | `/users/me` | autenticado | Perfil |
| `PATCH` | `/users/me` | autenticado | Actualiza el nombre |
| `PATCH` | `/users/me/password` | autenticado | Cambia la contraseña |
| `GET` | `/stations` | público | Búsqueda (name/country/language/tag, limit/offset, unique) |
| `GET` | `/stations/:id` | público | Detalle de una emisora |
| `GET` | `/playback/:stationId` | autenticado | Stream (proxy), registra historial |
| `GET` | `/playback/:stationId/status` | autenticado | Comprueba disponibilidad del stream |
| `GET` | `/favorites` | autenticado | Lista de favoritos |
| `POST` | `/favorites` | autenticado | Añade un favorito |
| `DELETE` | `/favorites/:stationId` | autenticado | Quita un favorito |
| `GET` | `/history` | autenticado | Historial reciente |
| `DELETE` | `/history` | autenticado | Limpia el historial |

Errores en formato `{ "error": { "code", "message", "status", "details?" } }`.