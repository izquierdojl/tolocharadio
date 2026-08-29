## 1. Repositorio y monorepo

- [x] 1.1 Inicializar el monorepo: `git init`, `package.json` raíz con workspaces (`apps/*`), `.gitignore` (node_modules, dist, .env, *.db) y `.nvmrc`/`engines` con Node 22; verificar que `npm install` en la raíz resuelve los workspaces
- [x] 1.2 Crear `apps/api` (scaffold TypeScript: `tsconfig`, `package.json` con Express, `tsx`, `vitest`, `eslint`) y `apps/web` (scaffold Vite + React + TypeScript), con scripts raíz `dev`, `build`, `test`, `lint`, `typecheck`; verificar con `npm run typecheck` limpio en ambos
- [x] 1.3 Crear `.env.example` en la raíz y `apps/api/src/config/*` (módulo zod): `PORT`, `NODE_ENV`, `DATABASE_PATH`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `REGISTRATION_ENABLED`, `CORS_ORIGINS`, `RADIOBROWSER_BASE_URL`, `RADIOBROWSER_APP_NAME`, `CACHE_TTL_MS`, `CACHE_MAX_ENTRIES`, `HISTORY_LIMIT`; verificar que en prod sin secretos la app no arranca y en dev usa valores por defecto

## 2. Núcleo de la API

- [x] 2.1 Crear el servidor Express 5 (`apps/api/src`) con `json` body, CORS configurable por env, healthcheck `GET /api/v1/health`, prefijo `/api/v1` y middleware de errores central con formato `{ error: { code, message, status } }`; verificar con un test de integración que un 404 usa el formato estándar
- [x] 2.2 Configurar Drizzle + `better-sqlite3`: conexión a `DATABASE_PATH` (WAL + `busy_timeout`), esquema (`users`, `refresh_tokens`, `favorites`, `history`) y migraciones; verificar que una migración limpia (temporal DB) aplica y las tablas existen
- [x] 2.3 Implementar validación de entrada con zod en rutas y helper de errores tipados (`AppError` con `code`); verificar con test que un payload inválido devuelve 400/422 con mensajes detallados
- [x] 2.4 Generar la especificación OpenAPI (3.x) de todos los endpoints y servir `GET /api/v1/openapi.json` + Swagger UI en `/api/v1/docs`; verificar que la spec valida y se carga en Swagger UI

## 3. Capacidad `auth`

- [x] 3.1 Helpers de hashing con bcryptjs y de JWT con `jose` (HS256, access/refresh con TTLs del config); verificar con tests unitarios de signo/verificación y hash/verificación de contraseña
- [x] 3.2 `POST /auth/register`: creación de usuario (email único, política de contraseña), con flag `REGISTRATION_ENABLED` que devuelve 403 cuando está desactivado; devuelve par de tokens + perfil; verificar escenarios de email duplicado, registro deshabilitado y datos inválidos con tests
- [x] 3.3 `POST /auth/login`: autenticación con error 401 genérico para credenciales incorrectas; devuelve access+refresh (refresco también como cookie httpOnly `SameSite=Lax`) y fija cookie; verificar con tests que login incorrecto no filtra qué campo falló
- [x] 3.4 `POST /auth/refresh`: rotación de refresh (hash del token en BD, revoca el anterior) aceptando cookie o body; `POST /auth/logout`: revoca el refresh y limpia la cookie; verificar tests de rotación, token revocado y logout
- [x] 3.5 `GET /users/me`, `PATCH /users/me` (nombre) y `PATCH /users/me/password` (exige contraseña actual y revoca refresh previos); verificar tests de perfil y cambio de contraseña
- [x] 3.6 `POST /auth/forgot-password` (devuelve token de 1 uso en la respuesta) y `POST /auth/reset-password` (consumo del token + contraseña nueva, invalida refresh previos); verificar tests de token expirado/usado/repetido
  
## 4. Capacidad `stations`

- [x] 4.1 Cliente de radio-browser.info con `fetch` global: `User-Agent`/`appname` fijo `TolochaRadio`, base URL configurable, timeouts; verificar con tests que las llamadas incluyen la identificación
- [x] 4.2 Normalización/saneado de emisoras (campos obligatorios, texto saneado, URLs válidas, descarte de emisoras sin stream válido); verificar con tests de datos degradados/maliciosos
- [x] 4.3 Caché en memoria con TTL configurable y límite de entradas; degradación: origen caído → caché si existe, si no 503; verificar con tests usando un mock del origen
- [x] 4.4 Rutas `GET /stations` (búsqueda por name/country/language/tag, paginación, hidebroken/unicidad) y `GET /stations/:id` (por UUID, 404 si no existe); verificar que los endpoints devuelven datos normalizados y test de 404

## 5. Capacidad `favorites`

- [x] 5.1 `GET /favorites`, `POST /favorites` (body `{ stationId }`), `DELETE /favorites/:stationId`: por usuario autenticado, sin duplicados, snapshot de la emisora, orden cronológico inverso, aislamiento entre usuarios; verificar tests de añadir/duplicado/eliminar/ajeno (404) y 401 sin token

## 6. Capacidad `history`

- [x] 6.1 `GET /history` (reciente primero), `DELETE /history` (limpieza completa) y registro de escucha al reproducir (se guarda/actualiza evento con snapshot y marca de tiempo) con límite `HISTORY_LIMIT` descartando los más antiguos; verificar tests de registro, límite, limpieza y aislamiento entre usuarios

## 7. Capacidad `playback`

- [x] 7.1 `GET /playback/:stationId`: resuelve la emisora por UUID en el catálogo/caché (nunca URL arbitraria del cliente), retransmite el stream del origen (HTTP proxy) preservando `Content-Type`/`Content-Length` y eliminando cabeceras hop-by-hop, siguiendo redirecciones con límite; verificar con test de integración contra un stream HTTP de prueba local (mock) y error claro si el stream falla
- [x] 7.2 `GET /playback/:stationId/status`: verificación de disponibilidad del stream con timeout (HEAD/GET acotado); verificar que una emisora inaccesible devuelve estado no reproducible con motivo

## 8. Capacidad `web-ui`

- [x] 8.1 Base del frontend: React Router (vistas explorar/favoritos/historial/perfil/login/registro), TanStack Query para servidor, Zustand para estado (player y sesión), cliente de API con reinyección de access token en memoria y refresco automático por cookie; verificar typecheck + `vite build` y flujo login→refresh manual en dev
- [x] 8.2 Temática Tolocha: Tailwind con modo oscuro por defecto, paleta verde-bosque/ocre-montaña, fondos y texturas sutiles de pino/Tolocha (SVG/imágenes), layout general con cabecera/navegación y reproductor inferior; verificar visual en dev en móvil y escritorio
- [x] 8.3 Pantalla principal: grid responsive de tarjetas de emisoras (imagen, nombre, reproducir, añadir a favoritos), barra de búsqueda por nombre y filtros país/idioma, paginación/estado vacío y carga; verificar integración con `GET /stations` y el proxy de Vite `/api`
- [x] 8.4 Pantallas auth (login/registro/perfil): formularios con validación, manejo de sesión y logout; el registro se oculta/inhabilita si `REGISTRATION_ENABLED=false`; verificar los estados de error y sesión persistente tras recargar
- [x] 8.5 Favoritos y historial: vistas con reproducción directa, quitar favorito, limpiar historial, estados vacíos; verificar CRUD contra la API y que la UI refleja los cambios
- [x] 8.6 Reproductor flotante persistente: componente fuera de las rutas, `<audio>` gestionado con Zustand, controles play/pausa/volumen, emisora actual en todas las vistas, registro de historia y marcado de favorito rápido; verificar que la música no se corta al navegar y que al reproducir se registra en historial

## 9. Docker, CI y publicación en GitHub

- [x] 9.1 `Dockerfile` multi-etapa (build web, build api, runtime node:22-alpine) sirviendo API + estático con fallback SPA, `HEALTHCHECK`, puerto 3000 y volumen `/data` para SQLite; `docker-compose.yml` para dev y prod con env y volumen; verificar `docker build` y que la imagen arranca y responde `/api/v1/health` y la UI
- [x] 9.2 Secrets y configuración para contenedor: `DATABASE_PATH=/data/tolocharadio.db`, `.dockerignore`, soporte de variables de entorno en runtime; verificar persistencia del SQLite al reiniciar el contenedor
- [x] 9.3 GitHub Actions: workflow `ci` (install, typecheck, lint, test, build) en PR/push; workflow `release` que publica en GHCR con tags semVer + `latest` al crear tag `v*`; verificar que el workflow valida en un repo de pruebas (dry-run) y documentar en README cómo despliegue el usuario — *validado en GitHub real: CI verde (quality+docker smoke) y release `v0.1.0` publicó `ghcr.io/izquierdojl/tolocharadio` (tags `0.1.0` y `latest`)*
- [x] 9.4 Publicar el proyecto en GitHub: crear `README.md` (qué es TolochaRadio, arquitectura, requisitos, dev local, despliegue con Docker, variables de entorno, uso de la API), licencia y primer commit; verificar que el repo público existe y la documentación es coherente con el despliegue real — *repo público https://github.com/izquierdojl/tolocharadio con commit inicial + README + LICENSE MIT; CI y GHCR operativos*

## 10. Pruebas de integración finales

- [x] 10.1 Test E2E/feliz del sistema: registrar → login → buscar emisora → reproducir (proxy) → añadir favorito → ver historial → limpiar → logout; verificar con la app desplegada en Docker (local) que el flujo completo funciona
- [x] 10.2 Pase final de calidad: `npm run typecheck`, `npm run lint` y `npm run test` en verde en raíz y apps, y revisar que toda la funcionalidad de las 7 capacidades responde según sus specs