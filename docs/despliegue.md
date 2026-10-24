# Despliegue con Docker

> [← Volver al README](../README.md)

## Imagen publicada en GHCR (recomendado)

La imagen se publica automáticamente en GitHub Container Registry al crear un tag `v*` (ver [docs/desarrollo.md](desarrollo.md)). El release espera a que el CI del commit esté en verde, construye y escanea la imagen una sola vez y solo entonces la publica. Además del tag `latest`, cada imagen lleva su versión (`0.28.0`) y `node<versión>` con el Node con el que se construyó (por ejemplo, `node22.23.4`). `latest` solo se mueve al publicar una release o al reconstruir la última release con una base Node/Alpine nueva; nunca desde `main`. El `docker-compose.yml` del repo ya apunta a ella:

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

GHCR conserva los tags de las releases. La política recomendada es mantener las últimas 10 versiones (`X.Y.Z`) y borrar las anteriores desde la configuración del paquete; `latest` y `node<versión>` se conservan siempre. No hay borrado automático configurado en el repositorio.

## Build local (desarrollo)

```bash
docker build -t tolocharadio .
```

## Recordatorio de variables críticas

Los secretos `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` son obligatorios en producción (`NODE_ENV=production`). La tabla completa está en [docs/instalacion.md](instalacion.md).