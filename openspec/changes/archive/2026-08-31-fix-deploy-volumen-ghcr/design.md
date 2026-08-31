## Context

See `proposal.md` - Why. La imagen publicada en GHCR se construye con el `Dockerfile` del repo; el problema de permisos del volumen aparece en runtime y no se puede resolver desde fuera de la imagen de forma automática. El `docker-compose.yml` actual mezcla `build` + `image: tolocharadio:latest` (nombre local), lo que en un despliegue real intenta una pull de Docker Hub inexistente.

## Goals / Non-Goals

**Goals:**
- Que la imagen publicada funcione con un volumen nombrado (`/data`) sin pasos manuales ni `chown` externos.
- Que el contenedor siga ejecutándose como usuario no privilegiado (no correr la app como root).
- Que `docker compose up -d` despliegue la imagen GHCR directamente (pull, no build).

**Non-Goals:**
- No cambia comportamiento de la aplicación ni de la API.
- No gestiona migraciones de la base de datos (el volume persiste, la DB la crea la app).

## Decisions

- **Entrypoint que fija permisos y baja privilegios**: se añade `docker-entrypoint.sh` que ejecuta `mkdir -p /data && chown -R node:node /data` y luego `exec su-exec node:node "$@"`. El stage `runtime` instala `su-exec` (paquete Alpine ligero) y define `ENTRYPOINT`. Se elimina `USER node` para que el entrypoint corra como root y delegue a `node` al arrancar la app.
  - *Alternativas descartadas*: ejecutar la app como root (`USER` root) — evita el problema pero degrada seguridad, en contra del diseño actual; `chown` vía servicio init en Compose — funcionaba pero es configuración extra que cada despliegue debe recordar, y el arreglo debe viajar en la propia imagen.
- **Compose con imagen GHCR**: `image: ghcr.io/izquierdojl/tolocharadio:latest` y eliminación del bloque `build`. El flujo de release ya publica esa imagen con el tag `latest` (workflow `release.yml`), así que `docker compose up -d` = `pull` + `up`.
  - *Alternativa descartada*: mantener `build` + `image` y añadir `pull_policy: build` — sigue exigiendo el código fuente en el servidor; el objetivo es desplegar solo el compose.

## Risks / Trade-offs

- [El `chown -R` en cada arranque es una operación sobre todo el volumen] → Solo afecta a `/data` (base SQLite + WAL), ligero; se ejecuta una vez por arranque.
- [Run como root hasta que el entrypoint baja privilegios] → Ventana mínima; el entrypoint baja a `node` antes de lanzar la app, y no hay red/lectura de secretos en ese instante.
- [Imagen GHCR desactualizada si el usuario no hace `docker compose pull`] → Es el flujo habitual de despliegue; se documenta el paso de `pull` en `docs/despliegue.md`.

## Migration Plan

1. Implementar `Dockerfile` + `docker-entrypoint.sh` + `docker-compose.yml` + docs.
2. Validar imagen localmente: `docker build` + arranque con volumen nombrado y usuario no root.
3. Publicar nueva versión (release) → GHCR actualiza `latest`.
4. En el VPS: `docker compose pull && docker compose up -d`. El entrypoint corrige los permisos del volumen existente automáticamente.
5. Rollback: `docker compose pull` de una versión anterior en GHCR (`ghcr.io/izquierdojl/tolocharadio:vX.Y.Z`).