## Why

Al desplegar en el VPS, el contenedor arranca como usuario no privilegiado (`node`, uid 1000) pero el volumen nombrado `tolocharadio_data` montado en `/data` queda propiedad de `root`, por lo que `better-sqlite3` falla con `SQLITE_CANTOPEN` ("unable to open database file"). Además, el `docker-compose.yml` del repo referencia la imagen local `tolocharadio:latest` (con `build`), lo que en el VPS intenta una pull de Docker Hub inexistente en vez de usar la imagen ya publicada en GHCR.

## What Changes

- Añadir un entrypoint en el `Dockerfile` que, antes de arrancar la app, cree `/data` y ajuste su propietario a `node:node` (uid 1000), garantizando que el volumen funciona con cualquier imagen publicada sin pasos manuales.
- Cambiar el runtime del `Dockerfile` para que el entrypoint arranque como root y baje privilegios a `node` con `su-exec` tras fijar permisos.
- Actualizar `docker-compose.yml`: `image: ghcr.io/izquierdojl/tolocharadio:latest`, eliminando el bloque `build` para desplegar directamente la imagen publicada.
- Documentar en `docs/despliegue.md` el despliegue vía Compose con la imagen GHCR.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. Es una corrección de despliegue/infraestructura: no cambia comportamiento observable de la aplicación ni requisitos. Por ello el change declara `skip_specs: true`.

## Impact

- `Dockerfile`: nuevo `docker-entrypoint.sh`, ajuste del stage `runtime` (instalación de `su-exec`, `ENTRYPOINT`, cambio de `USER node` a bajada de privilegios en el entrypoint).
- `docker-compose.yml`: eliminado `build`, `image` apuntando a `ghcr.io/izquierdojl/tolocharadio:latest`.
- `docs/despliegue.md`: sección de despliegue con Compose + imagen GHCR.
- Sin cambios de API ni dependencias de la aplicación.