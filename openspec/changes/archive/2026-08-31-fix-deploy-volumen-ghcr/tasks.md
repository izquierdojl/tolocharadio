## 1. Entrypoint en la imagen

- [x] 1.1 Crear `docker-entrypoint.sh` que cree `/data`, aplique `chown -R node:node /data` y lance la app con `su-exec node:node "$@"`, y verificar que el archivo es ejecutable y arranca el comando correcto.
- [x] 1.2 Actualizar el stage `runtime` del `Dockerfile`: instalar `su-exec`, copiar el entrypoint, definir `ENTRYPOINT ["docker-entrypoint.sh"]` y eliminar `USER node` (la bajada de privilegios la hace el entrypoint).

## 2. Compose apuntando a GHCR

- [x] 2.1 Actualizar `docker-compose.yml`: reemplazar el bloque `build` + `image: tolocharadio:latest` por `image: ghcr.io/izquierdojl/tolocharadio:latest`, y verificar que `docker compose config` valida sin errores.

## 3. Documentación y validación

- [x] 3.1 Actualizar `docs/despliegue.md` con el flujo Compose + imagen GHCR (`docker compose pull && docker compose up -d`).
- [x] 3.2 Validar en local: `docker build -t tolocharadio:test .` y arrancar con un volumen nombrado limpio verificando que `/api/v1/health` responde y que la base se crea dentro de `/data` con permisos de `node`.
- [x] 3.3 Ejecutar los controles de calidad (`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`) y verificar que pasan.