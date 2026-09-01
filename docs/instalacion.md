# Instalación y arranque local

> [← Volver al README](../README.md)

## Requisitos

- Node.js >= 22 (se usa `.nvmrc`)
- npm >= 10
- (Opcional) Docker >= 24 para el despliegue en contenedor

## Puesta en marcha

```bash
npm install          # instala todos los workspaces
cp .env.example .env # crea tu .env local (la API lo carga automaticamente)
# opcional: genera secretos reales con `openssl rand -hex 32` y edita JWT_ACCESS_SECRET/JWT_REFRESH_SECRET

npm run dev          # arranca API (puerto 3000) y web (puerto 5173, proxy /api) a la vez
```

> El fichero `.env` de la raíz está ignorado por git (no se publica). La API lo carga al
> arrancar (`npm run dev`/`npm start`) y `docker compose up -d` también lo lee para
> interpolar las variables; en producción usa variables de entorno reales o un `.env` propio.

## Comandos raíz

```bash
npm run typecheck    # typecheck de todos los workspaces
npm run lint         # eslint de todos los workspaces
npm test             # tests de la API (vitest + supertest)
npm run build        # compila API (dist/) y web (dist/)
npm start            # arranca la API compilada (sirviendo la web si STATIC_DIR apunta a ella)
```

## Migraciones de la base de datos

Las migraciones se aplican automáticamente al arrancar la API (`npm start` / `npm run dev`). Para gestionarlas a mano, dentro del workspace `@tolocharadio/api`:

```bash
npm run db:generate   # genera una nueva migración desde el esquema de Drizzle
npm run db:migrate    # aplica las migraciones pendientes
```

## Variables de entorno

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
| `REFRESH_ROTATE_THRESHOLD` | `24h` | Vida mínima del refresh token para no rotarlo al renovar (se desliza) |
| `REFRESH_GRACE_MS` | `60000` | Gracia del token anterior tras la rotación final (ms) |
| `REGISTRATION_ENABLED` | `true` | Permite usuarios nuevos |
| `CORS_ORIGINS` | `-` | Orígenes permitidos (coma-separados; vacío desactiva CORS) |
| `RADIOBROWSER_BASE_URL` | `https://all.api.radio-browser.info` | Origen del catálogo |
| `RADIOBROWSER_APP_NAME` | `TolochaRadio` | Identificador enviado al catálogo |
| `CACHE_TTL_MS` | `300000` | TTL de la caché del catálogo |
| `CACHE_MAX_ENTRIES` | `100` | Máximo de claves en caché |
| `HISTORY_LIMIT` | `100` | Máximo de entradas de historial por usuario |