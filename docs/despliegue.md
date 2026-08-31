# Despliegue con Docker

> [← Volver al README](../README.md)

## Imagen publicada en GHCR (recomendado)

La imagen se publica automáticamente en GitHub Container Registry al crear un tag `v*` (ver [docs/desarrollo.md](desarrollo.md)). El `docker-compose.yml` del repo ya apunta a ella:

```bash
docker compose pull
docker compose up -d
```

El contenedor expone la API y la web en el puerto `3000`, guarda la base en el volumen nombrado `/data` y arranca con `HEALTHCHECK`. El entrypoint de la imagen ajusta automáticamente los permisos del volumen (lo crea y lo deja propiedad del usuario `node`), por lo que no hay pasos manuales de `chown` ni configuración extra.

Sin Compose:

```bash
docker run -d --name tolocharadio -p 127.0.0.1:3000:3000 \
  -e JWT_ACCESS_SECRET='...' -e JWT_REFRESH_SECRET='...' \
  -v tolocharadio_data:/data \
  ghcr.io/izquierdojl/tolocharadio:latest
```

Para actualizar a una versión nueva: `docker compose pull && docker compose up -d`.

## Build local (desarrollo)

```bash
docker build -t tolocharadio .
```

## Recordatorio de variables críticas

Los secretos `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` son obligatorios en producción (`NODE_ENV=production`). La tabla completa está en [docs/instalacion.md](instalacion.md).