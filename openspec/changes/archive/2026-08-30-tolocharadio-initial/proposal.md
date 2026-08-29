## Why

TolochaRadio es un servicio personal de reproductor de radio por navegador: gestiona usuarios con emisoras guardadas, expone una API interna (también útil para otras aplicaciones propias) y se despliega con Docker distribuido vía GitHub Packages. Hoy no existe nada; hay que sentar las bases del proyecto completo: backend API, interfaz web reactiva, despliegue contenedorizado y publicación en GitHub.

## What Changes

- Crear un **monorepo** TypeScript con `apps/api` (backend) y `apps/web` (frontend) usando workspaces de npm (pnpm/npm).
- **Backend Node.js + Express (TypeScript)**: API REST con autenticación JWT completa (registro, login, refresh tokens, logout, perfil).
- **Base de datos SQLite** (única para todo el proyecto, dev y prod) con ORM tipado; esquema para usuarios y emisoras favoritas.
- **Búsqueda y catálogo de emisoras** consumiendo la API pública de `radio-browser.info` con un identificador fijo de app (`TolochaRadio`), con caché y saneado de datos.
- **Favoritos por usuario** (añadir/listar/eliminar) e **historial de reproducción** por usuario.
- **Proxy de streaming** en el backend para reproducir emisoras evitando problemas de mixed-content y CORS desde el navegador.
- **Documentación pública de la API** (OpenAPI/Swagger) accesible en el propio despliegue, consumible por apps externas con tokens JWT.
- **Frontend React + Vite + TypeScript** con interfaz reactiva en español: grid/cards de emisoras, búsqueda y filtros, reproductor flotante persistente, pantalla de favoritos e historial.
- **Temática visual Tolocha**: fondos sutiles de montaña/bosque de pinos y paleta de verdes y ocres inspirada en la Sierra de Tolocha (Bajo Aragón).
- **Despliegue en un único contenedor Docker** (Node sirviendo API + build estático del frontend), con `docker-compose` para desarrollo.
- **Publicación en GitHub Packages** (GHCR): Dockerfile multi-stage, CI en GitHub Actions que construye y publica las imágenes, y `README` con instrucciones.
- **Registro de usuarios abierto pero con flag desactivable** mediante variable de entorno (como otros proyectos de referencia).

## Capabilities

### New Capabilities
- `auth`: registro (con flag desactivable), login, refresh de tokens JWT, logout, perfil de usuario y cambio/cambio/reset de contraseña.
- `stations`: proxy del catálogo de radio-browser.info — búsqueda, listado, detalle y filtrado de emisoras con identificador de app fijo y caché.
- `favorites`: gestión de emisoras favoritas por usuario (añadir, listar, eliminar).
- `history`: registro del historial de reproducción por usuario (registrar, listar, limpiar, preferencias de límite).
- `playback`: proxy de streaming de audio por la API y comportamiento del reproductor en el navegador.
- `public-api`: contrato público de la API — OpenAPI/Swagger disponible, formato de errores, límites y acceso de aplicaciones externas con JWT.
- `web-ui`: interfaz web en español — grid de emisoras, búsqueda/filtros, reproductor flotante persistente, vistas de favoritos e historial, y temática visual de la Sierra de Tolocha.

### Modified Capabilities
- Ninguna (proyecto nuevo, sin specs previas).

## Impact

- **Nuevo código**: `apps/api/*`, `apps/web/*`, config de workspaces, `Dockerfile`, `docker-compose.yml`, GitHub Actions (`docs/pipeline*`), README.
- **Dependencias nuevas**: Express, ORM (Prisma o TypeORM con SQLite o mejoras), `jsonwebtoken`, `bcrypt`/argon2, `zod` (validación), `better-sqlite3`, Swagger (`swagger-ui-express`/OpenAPI 3), React 18+/Vite, Tailwind CSS, reproductor de audio (HTML5 `Audio` / hook propio).
- **Servicios externos**: API pública de `radio-browser.info` (solo lectura, identificador `TolochaRadio`).
- **Infraestructura**: contenedor único (build estático + API), puerto configurable, volúmenes para la base de datos SQLite; publicación en GHCR con tags semVer y `latest`.
- **Repositorio**: se deberá inicializar `git` y un repositorio público en GitHub para el despliegue de contenedores.