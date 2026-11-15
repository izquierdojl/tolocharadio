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
| `GET` | `/stats/me/top` | autenticado | Emisoras más escuchadas (from/to/limit) |
| `GET` | `/stats/me/timeline` | autenticado | Evolución temporal (from/to/granularity) |
| `GET` | `/stats/me/habits` | autenticado | Hábitos por hora y día (from/to) |
| `GET` | `/stats/me/genres` | autenticado | Tiempo por género (from/to/limit) |
| `GET` | `/stats/me/countries` | autenticado | Tiempo por país (from/to) |
| `GET` | `/stats/me/recent` | autenticado | Escuchas recientes con duración (limit) |
| `GET` | `/podcasts/search` | autenticado | Búsqueda de podcasts en directorio (q, limit) |
| `POST` | `/podcasts/resolve` | autenticado | Resuelve e ingiere un feed RSS/Atom (`feedUrl`) |
| `GET` | `/podcasts/subscriptions` | autenticado | Lista de suscripciones de podcasts |
| `POST` | `/podcasts/subscriptions` | autenticado | Suscripción por `podcastId` o `feedUrl` |
| `POST` | `/podcasts/subscriptions/bulk` | autenticado | Importación en lote de feeds (OPML) |
| `GET` | `/podcasts/subscriptions/opml` | autenticado | Exportación OPML 2.0 de suscripciones |
| `DELETE` | `/podcasts/subscriptions/:podcastId` | autenticado | Baja de suscripción a un podcast |
| `GET` | `/podcasts/home` | autenticado | Portada agregada (continuar, novedades, suscripciones, cola) |
| `GET` | `/podcasts/queue` | autenticado | Cola de reproducción con su `revision` |
| `POST` | `/podcasts/queue` | autenticado | Añade un episodio al final o como siguiente (`position`) |
| `PUT` | `/podcasts/queue/order` | autenticado | Reordena la cola con `baseRevision` (`409` si obsoleta) |
| `DELETE` | `/podcasts/queue/:episodeId` | autenticado | Quita un episodio de la cola |
| `GET` | `/podcasts/favorites` | autenticado | Lista episodios favoritos de podcasts |
| `POST` | `/podcasts/favorites` | autenticado | Marca un episodio como favorito |
| `DELETE` | `/podcasts/favorites/:episodeId` | autenticado | Quita un episodio de favoritos |
| `GET` | `/podcasts/:podcastId` | autenticado | Ficha de un podcast |
| `GET` | `/podcasts/:podcastId/episodes` | autenticado | Episodios paginados (sort, filter, offset, limit) |
| `POST` | `/podcasts/episodes/:episodeId/playback` | autenticado | Emite URL firmada de reproducción (`6h` TTL) |
| `GET` | `/podcasts/episodes/:episodeId/stream` | firma HMAC | Stream de audio del episodio (`Range`, `206`/`416`) |
| `GET` | `/podcasts/episodes/:episodeId/progress` | autenticado | Consulta el progreso guardado del episodio |
| `PUT` | `/podcasts/episodes/:episodeId/progress` | autenticado | Registra progreso y sesión de escucha (idempotente) |
| `POST` | `/podcasts/episodes/:episodeId/progress` | autenticado | Alias de progreso para `keepalive`/`sendBeacon` |
| `GET` | `/podcasts/stats/summary` | autenticado | Resumen de tiempo, episodios empezados/completados y tasa de finalización |
| `GET` | `/podcasts/stats/top-podcasts` | autenticado | Ranking de podcasts por tiempo escuchado (`limit`) |
| `GET` | `/podcasts/stats/top-episodes` | autenticado | Ranking de episodios por tiempo escuchado (`limit`) |
| `GET` | `/podcasts/stats/timeline` | autenticado | Serie temporal (`granularity=day\|week\|month`) |
| `GET` | `/podcasts/stats/habits` | autenticado | Tiempo por día de la semana y hora |
| `GET` | `/podcasts/stats/categories` | autenticado | Tiempo por categoría (`limit`) |
| `GET` | `/podcasts/stats/recent` | autenticado | Sesiones de escucha recientes (`limit`) |

Errores en formato `{ "error": { "code", "message", "status", "details?" } }`.