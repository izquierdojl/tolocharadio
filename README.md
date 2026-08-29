# TolochaRadio

Reproductor de radio por internet de uso personal (self-hosted), con una idea clara: escucha y guarda tus emisoras favoritas para siempre. Exploración del catálogo de [radio-browser.info](https://www.radio-browser.info), reproductor flotante continuo, favoritos, historial y autenticación con cuentas propias. Todo en español, con una estética inspirada en la Sierra de Tolocha (bosque de pinares, verdes y ocres).

## Características

- **Catálogo global**: búsqueda de emisoras por nombre, país e idioma con paginación, a través de la API pública de radio-browser.
- **Reproductor flotante persistente**: `<audio>` gestionado por Zustand, la música no se interrumpe al navegar; controles de reproducir/pausar, siguiente, volumen y quitar emisora.
- **Cuentas propias**: registro (desactivable), inicio de sesión, perfil, cambio de contraseña y restablecimiento con token de un solo uso.
- **Favoritos e historial**: snapshot de cada emisora guardada o escuchada, aislamiento por usuario, limpieza completa.
- **Proxy de streaming autenticado**: la API retransmite el stream con tus credenciales; nunca se expone el token en la URL.
- **API REST documentada** con OpenAPI 3.1 y Swagger UI incluidos.
- **Tema Tolocha**: modo oscuro por defecto, paleta verde-bosque/ocre-montaña y silueta de sierra en la interfaz.

## Arquitectura

Monorepo npm con workspaces:

```
apps/
├── api/    API REST Express 5 (TypeScript, zod, drizzle-orm + better-sqlite3, jose, bcryptjs)
└── web/    Interfaz React 19 (Vite, Tailwind 4, React Router, TanStack Query, Zustand)
```

La API sirve también el frontend compilado (`STATIC_DIR`). En desarrollo, Vite hace proxy de `/api` a la API.

- **Almacenamiento**: SQLite vía Drizzle (`users`, `refresh_tokens`, `password_reset_tokens`, `favorites`, `history`).
- **Sesiones**: access token JWT (15 min) en memoria + cookie httpOnly `tolocha-refresh` rotatoria; refuerzo con cookie httpOnly `tolocha-access` para que el `<audio>` del reproductor pueda autenticarse.
- **Catálogo**: cliente con caché en memoria, `User-Agent`/`appname` `TolochaRadio`, degradación con servidor caído (caché si existe, 503 si no).

## Requisitos

- Node.js >= 22 (se usa `.nvmrc`)
- npm >= 10
- (Opcional) Docker >= 24 para el despliegue en contenedor

## Desarrollo local

```bash
npm install          # instala todos los workspaces
cp .env.example .env # crea tu .env local (la API lo carga automaticamente)
# opcional: genera secretos reales con `openssl rand -hex 32` y edita JWT_ACCESS_SECRET/JWT_REFRESH_SECRET

npm run dev          # arranca API (puerto 3000) y web (puerto 5173, proxy /api) a la vez
```

> El fichero `.env` de la raíz está ignorado por git (no se publica). La API lo carga al
> arrancar (`npm run dev`/`npm start`) y `docker compose up -d` también lo lee para
> interpolar las variables; en producción usa variables de entorno reales o un `.env` propio.

Comandos raíz:

```bash
npm run typecheck    # typecheck de todos los workspaces
npm run lint         # eslint de todos los workspaces
npm test             # tests de la API (vitest + supertest)
npm run build        # compila API (dist/) y web (dist/)
npm start            # arranca la API compilada (sirviendo la web si STATIC_DIR apunta a ella)
```

Migraciones de la base de datos (dentro del workspace `@tolocharadio/api`):

```bash
npm run db:generate   # genera una nueva migración desde el esquema de Drizzle
npm run db:migrate    # aplica las migraciones pendientes
```

Las migraciones se aplican automáticamente al arrancar la API (`npm start` / `npm run dev`).

### Variables de entorno

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto del servidor HTTP |
| `NODE_ENV` | `development` | `production` exige secretos y cookies `Secure` |
| `DATABASE_PATH` | `./data/tolocharadio.db` | Ruta del fichero SQLite |
| `STATIC_DIR` | — | Directorio del frontend compilado para servirlo con fallback SPA |
| `JWT_ACCESS_SECRET` | *dev* | Secreto del access token (≥32 caracteres en producción) |
| `JWT_REFRESH_SECRET` | *dev* | Secreto del refresh token (≥32 caracteres en producción) |
| `JWT_ACCESS_TTL` | `15m` | Duración del access token |
| `JWT_REFRESH_TTL` | `30d` | Duración del refresh token |
| `REGISTRATION_ENABLED` | `true` | Permite usuarios nuevos |
| `CORS_ORIGINS` | `-` | Orígenes permitidos (coma-separados; vacío desactiva CORS) |
| `RADIOBROWSER_BASE_URL` | `https://all.api.radio-browser.info` | Origen del catálogo |
| `RADIOBROWSER_APP_NAME` | `TolochaRadio` | Identificador enviado al catálogo |
| `CACHE_TTL_MS` | `300000` | TTL de la caché del catálogo |
| `CACHE_MAX_ENTRIES` | `100` | Máximo de claves en caché |
| `HISTORY_LIMIT` | `100` | Máximo de entradas de historial por usuario |

## Despliegue con Docker

```bash
# build local
docker build -t tolocharadio .

# o con docker compose (volumen nombrado, persiste el SQLite)
JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... docker compose up -d
```

El contenedor expone la API y la web en el puerto `3000`, guarda la base en el volumen `/data` y arranca como usuario no privilegiado con `HEALTHCHECK`.

Con la imagen publicada en GHCR (ver sección siguiente):

```bash
docker run -d --name tolocharadio -p 127.0.0.1:3000:3000 \
  -e JWT_ACCESS_SECRET='...' -e JWT_REFRESH_SECRET='...' \
  -v tolocharadio_data:/data \
  ghcr.io/izquierdojl/tolocharadio:latest
```

## Integración continua y publicación (GitHub)

- **`ci`**: en `push`/`pull_request` ejecuta `npm ci`, typecheck, lint, tests y build, y además compila la imagen Docker y hace un smoke test en contenedor (`/api/v1/health` y servido de la web).
- **`release`**: al crear un tag `v*` (`git tag v0.1.0 && git push --tags`) construye la imagen y la publica en GitHub Container Registry (GHCR) con tags semVer y `latest`.

## Versionado automático

La versión sube **sola al archivar una especificación** (flujo OpenSpec): al finalizar el archivo de un change, se ejecuta automáticamente `node scripts/bump.js minor`, que sincroniza la versión en la raíz y en todos los workspaces, crea el commit `chore: release vX.Y.Z` y el tag `vX.Y.Z`, y lo empuja a GitHub. El tag dispara de forma automática el workflow `release` → GHCR.

Regla semver mientras la versión principal sea `0`:

| Situación | Bump | Ejemplo |
| --- | --- | --- |
| Nueva especificación archivada (feature, infraestructura, etc.) | `minor` (automático) | `0.1.0 → 0.2.0` |
| Bugfix / hotfix | `patch` | `0.2.0 → 0.2.1` |
| Primera versión estable (decisión tuya) | `major` | `0.2.0 → 1.0.0` |

Comandos manuales equivalentes (por si quieres lanzar un release sin archivar nada):

```bash
npm run release:spec   # minor (0.1.0 -> 0.2.0)
npm run release:fix    # patch (0.1.0 -> 0.1.1)
npm run release:major  # major (0.1.0 -> 1.0.0)
git push && git push --tags
```

## Uso de la API

La especificación OpenAPI está publicada por el propio servidor:

- `GET /api/v1/openapi.json` — spec OpenAPI 3.1
- `GET /api/v1/docs` — Swagger UI interactiva

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

## Licencia

MIT. Consulta [LICENSE](LICENSE).