## Context

Proyecto greenfield (sin código). Ver `proposal.md` Why para la motivación. Decisiones de stack ya pactadas con el usuario: monorepo TypeScript, backend Node.js + Express, frontend React + Vite, SQLite como única base de datos (dev y prod), despliegue en contenedor único publicando la imagen en GitHub Packages (GHCR). No existen specs previas; todas las capacidades son nuevas (ver carpeta `specs/`).

## Goals / Non-Goals

**Goals:**
- Una única imagen Docker que sirva la API y el build estático del frontend en el mismo puerto, con el SQLite persistido en un volumen.
- API REST consumible tanto por el frontend (mismo origen) como por aplicaciones externas vía JWT Bearer, documentada con OpenAPI.
- Diseño defensivo frente a fallos del origen externo (radio-browser.info): caché con TTL, datos saneados y degradación a 503.
- Reproducción fiable en el navegador mediante proxy de stream por el backend (evita mixed-content/CORS).
- Frontend reactivo con reproductor persistente y temática visual de la Sierra de Tolocha.

**Non-Goals:**
- Escalado multiusuario ni alta concurrencia (proyecto personal; SQLite de un solo proceso).
- Migración a otra base de datos en este cambio (solo se prepara el modelo con un ORM portable).
- Envío de correos reales en un primer momento (el entregable de recuperación de contraseña se resuelve por ahora sin SMTP).
- Reescritura del reproductor o listeners externos de radio (solo reproducción directa de emisoras).
- Aplicaciones móviles nativas (solo API consumible por ellas).

## Decisions

### D1. Monorepo con npm workspaces
Estructura `apps/api` y `apps/web`, workspaces npm (sin tooling extra como Lerna/Turborepo, innecesario para dos apps). Scripts raíz: `dev`, `build`, `test`, `lint`, `typecheck`.
- **Alternativas**: pnpm workspaces (más ahorro de disco y estricto en dependencias) — valorado, pero npm reduce herramientas a instalar; Turborepo — sobrecarga para dos paquetes.

### D2. Backend: Express con `tsx` en dev y compilación `tsc` en prod
Express 5 (rutas async nativas y manejo mejorado de errores). Dev con `tsx watch`, build con `tsc` a `dist/`. Node 22 LTS como runtime.
- **Alternativas**: Fastify (más rápido y realmente más moderno que Express); se eligió Express por ecosistema amplio y por petición del usuario, asumiendo la diferencia de rendimiento como irrelevante a esta escala.

### D3. SQLite con `better-sqlite3` + Drizzle ORM
`better-sqlite3` (drivers precompilados, síncrono y rápido) + Drizzle ORM (tipado, esquema declarativo, esquemas/`migrate` sencillos, y abstracción del dialecto para una hipotética migración futura). WAL activado y `busy_timeout` para coexistencia dev/herramientas.
- **Alternativas**: Prisma (gran DX pero binario pesado y más opinado), TypeORM (maduro pero verboso), `node:sqlite` (experimental en Node 22). Drizzle ofrece lo mínimo suficiente con tipado fuerte y sin peso.
- **Learned**: `better-sqlite3` publica prebuilds para linux/musl; si faltara la prebuild en la imagen, el escenario de build incluirá `python3 make g++`.

### D4. Tokens JWT con `jose` y almacenamiento de refresh tokens con hash
`jose` para firmar/verificar JWT HS256 (sin dependencias nativas, compatible ESM/TS). Tokens: `access` corto (configurable, p. ej. 15m) y `refresh` largo (p. ej. 14d). Los refresh tokens se guardan como **hash** en SQLite (columna `token_hash`), lo que permite revocación y rotación: cada refresh invalida el anterior. El access token es stateless y solo vive en memoria del cliente.
- **Alternativas**: `jsonwebtoken` (clásico, pero con más superficie de mantenimiento y sin soporte moderno de ESM); bcrypt nativo — requeriría toolchain de compilación en Docker (ver D5).
- **Anexo — contraseñas**: `bcryptjs` (puro JS, cero compilación nativa en la imagen). Alternativa `argon2` (OWASP favorito) se descarta por necesidad de binarios nativos; se documenta como mejora futura.

### D5. Entrega de tokens al frontend: refresh en cookie httpOnly, access en memoria
El login/registro devuelve `accessToken` y `refreshToken` en el cuerpo (necesario para apps externas) y además fija el refresh como **cookie `httpOnly` + `SameSite=Lax`**. El frontend mantiene el access token en memoria (no `localStorage`) y lo reinyecta en cada petición; renueva con el refresh de la cookie antes de expirar. Esto mitiga robo por XSS del refresco. Para apps externas, el endpoint de refresh acepta también el refresh token en el cuerpo.
- **Riesgo residual**: CSRF en endpoints con cookie. Mitigado con `SameSite=Lax`, métodos restrictivos (solo JSON en body para refresh), y prefijo `/api/v1`. Fine para alcance personal.

### D6. Cliente de radio-browser.info: `fetch` global + caché en memoria
Cliente propio sobre `fetch` (Node 22) llamando a `https://de1.api.radio-browser.info` (base configurable). Identificación fija `TolochaRadio` como `User-Agent` y parámetro `appname`. Endpoints usados: `json/stations/search` (name, country, language, tag, hidebroken, order, limit, offset), `json/stations/byuuid`, y listados auxiliares (countries/languages/tags) para los filtros de la UI. Caché en memoria tipo `Map` con TTL configurable y límite de entradas; respuesta redundante para datos con mucho uso (filtros).
- **Alternativas**: bibliotecas de cliente de radio-browser (API inestable/abandonadas) — se descartan; el contrato vía HTTP propio es controlable y estable.

### D7. Snapshots de emisora en favoritos e historial
Favoritos e historial guardan `station_uuid` + **snapshot** (JSON normalizado de la emisora: nombre, URL de stream, imagen, país, idioma, tags). Así quedan funcionales aunque radio-browser esté caído o la emisora desaparezca del origen. Un proceso ligero de refresco opcional re-sincroniza el snapshot si el UUID sigue existiendo.
- **Alternativa**: guardar solo UUID y resolver en cada lectura — frágil si el origen falla (contradice la resiliencia exigida en `stations`).

### D8. Proxy de streaming con SSRF controlado
`GET /api/v1/playback/:id` retransmite el stream desde la URL **resuelta a partir del catálogo** (la URL de la emisora se obtiene por UUID del snapshot/datos de radio-browser, nunca de una URL arbitraria enviada por el cliente). Se establecen `Content-Type`/`Content-Length` del origen, se eliminan cabeceras hop-by-hop y se siguen redirecciones (con límite). El cliente reproduce con `<audio src="/api/v1/playback/:id">` (mismo origen → sin CORS).
- **Riesgo**: SSRF si el proxy aceptase URLs arbitrarias — prohibido por diseño: solo se permite reproducir emisoras del catálogo conocido.

### D9. Frontend: Vite + React + React Router + TanStack Query + Zustand + Tailwind
- **Vite** con proxy de dev `/api → localhost:3000` para desarrollo sin CORS.
- **React Router** (modo librería) para vistas: exploración, favoritos, historial, perfil, login/registro.
- **TanStack Query** para estado servidor (caché de búsquedas/favoritos/historial).
- **Zustand** para estado de UI (reproductor: emisora actual, playing, volumen) — el `Audio` vive en un componente persistente fuera del árbol de rutas, así la música no se corta al navegar.
- **Tailwind CSS** (dark mode por defecto) para la temática Tolocha: paleta verde-bosque y ocre-montaña, fondo con texturas/imágenes sutiles de pino, formas redondeadas y brillos discretos.
- **i18n**: textos en español hardcodeados (sin framework de i18n; no-goal añadir EN ahora).
- Iconos con `lucide-react`, toasts con `sonner`.

### D10. Despliegue en contenedor único + GHCR
`Dockerfile` multi-etapa:
1. `build-web`: npm ci + `build` de `apps/web` → estático.
2. `build-api`: npm ci (con deps nativas de `better-sqlite3` disponibles via prebuilds) + `build` de `apps/api` → `dist`.
3. `runtime` (node:22-alpine): copia API compilada, dependencias de producción y estático del frontend; Express sirve `/api/v1` y, además, el estático del frontend en `/*` (fallback SPA). Puerto 3000, `HEALTHCHECK` con `/api/v1/health`, volumen en `/data` para el SQLite.
`docker-compose.yml` para desarrollo y para producción (volumen + variables de entorno: secretos JWT, `REGISTRATION_ENABLED`, `CORS_ORIGINS`, `DATABASE_PATH`, TTLs, límite de historial).
CI en GitHub Actions: workflow `ci` (install, typecheck, lint, test, build) + workflow `release` que publica en GHCR cuando se crea un tag `v*`, con tags semVer y `latest`.
- **Alternativa**: nginx + API en dos contenedores — el contenedor único simplifica el despliegue personal sin perder funcionalidad (estático pequeño).

### D11. Configuración por variables de entorno
Módulo `config` tipado que valida las vars con `zod`: `PORT`, `NODE_ENV`, `DATABASE_PATH`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `REGISTRATION_ENABLED` (flag desactivable de registro), `CORS_ORIGINS`, `RADIOBROWSER_BASE_URL`, `RADIOBROWSER_APP_NAME` (fija en prod), `CACHE_TTL_MS`, `CACHE_MAX_ENTRIES`, `HISTORY_LIMIT`. Valores por defecto aptos para dev; secretos sin valor por defecto en prod (la app falla al arrancar si faltan en `NODE_ENV=production`).

### D12. Formato de errores y validación unificados
`zod` como única fuente de validación de entrada. Middleware central de errores que traduce cualquier error a `{ error: { code, message, status } }` (ver spec `public-api`). Errores de Express async se propagan al middleware sin try/catch manual.

### D13. Testing con Vitest
Vitest + supertest para la API (registro/login/rotación de tokens, favoritos, historial, búsqueda con origen mockeado) usando una base SQLite temporal. El frontend se verifica con `tsc`, `eslint` y `vite build` (se omiten tests de componentes en este cambio para acotar alcance).

### D14. Recuperación de contraseña sin SMTP (resuelto con el usuario)
Para el primer lanzamiento **no** hay envío de correo: `POST /auth/forgot-password` devuelve el token de recuperación en el cuerpo de la respuesta (endpoint pensado como modo de desarrollo), y `POST /auth/reset-password` lo consume junto con la contraseña nueva. El flujo queda desacoplado de SMTP: añadir envío por correo en un cambio futuro equivale a conectar un "transport" al propio endpoint, sin tocar el spec `auth`.

### D15. Entorno de desarrollo en WSL2 (resuelto con el usuario)
El desarrollo, las pruebas y los comandos de npm/docker se ejecutan en **WSL2** (p. ej. Ubuntu), con Docker Desktop en modo WSL2 (motor en Linux). Razones: rendimiento de volúmenes y `node_modules` en Linux, paridad con el runtime del contenedor, y ausencia de fricción con scripts bash y binarios nativos (`better-sqlite3`) durante el desarrollo y el CI. El editor puede seguir siendo el de Windows (VS Code con extensión "WSL") y el repositorio puede vivir en la ruta Windows (`C:\soft\tolocharadio`, accesible desde WSL como `/mnt/c/soft/tolocharadio`) **o** idealmente en el filesystem de WSL (`~/dev/tolocharadio`) para mejor rendimiento de E/S. Regla de oro: elegir una ubicación única y trabajar siempre desde el mismo lado (evitar mezclar escrituras Windows↔WSL sobre los mismos ficheros).
- **Alternativa**: Windows nativo como terminal de desarrollo — viable para lógica pura pero con penalización en Docker (bind-mount a través de la VM), riesgo de CRLF en scripts del contenedor y bloqueos de fichero en SQLite.

## Risks / Trade-offs

- [radio-browser.info inestable o con rate-limit] → caché TTL, estado `hidebroken` filtrado, respuesta 503 clara y snapshots propios en favoritos/historial.
- [Streams de emisoras caídos o con formatos no soportados por el navegador] → endpoint de verificación de disponibilidad con timeout; la UI marca emisoras no reproducibles y muestra error al fallar.
- [SQLite con acceso concurrente] → WAL + `busy_timeout`; siendo proceso único y uso personal, límite ampliamente aceptable.
- [Natividad de `better-sqlite3` en alpine] → prebuilds disponibles para musl; si no, toolchain de build en la etapa de compilación.
- [Secretos JWT expuestos en el repo] → `.env`/`.dockerignore`, CI inyecta secrets de GitHub, la app no arranca en prod sin ellos.
- [SSRF en el proxy de streaming] → restricción por diseño: solo se proxya la URL asociada a un UUID válido del catálogo.
- [XSS en el frontend] → textos saneados en backend (spec `stations`), React escapa por defecto; refresh token jamás llega a `localStorage`.

## Migration Plan

Proyecto verde, sin datos previos ni esquema anterior: la "migración" es la propia puesta en marcha.
1. Publicar el repositorio en GitHub (primera vez, empujando el monorepo).
2. CI valida (typecheck/lint/test/build) y el workflow `release` sube la imagen a GHCR etiquetada.
3. Despliegue: `docker pull ghcr.io/<owner>/tolocharadio:<tag>` y `docker run` (o compose) con volumen y variables de entorno.
4. Rollback: reejecutar con el tag de la imagen anterior; el SQLite en volumen no se toca (compatible con versiones nuevas mientras el esquema no rompa — Drizzle se encarga de migraciones incrementales del esquema).

## Open Questions

Ninguna pendiente.