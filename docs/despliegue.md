# Despliegue con Docker

> [← Volver al README](../README.md)

## Build local

```bash
# build local
docker build -t tolocharadio .

# o con docker compose (volumen nombrado, persiste el SQLite)
JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... docker compose up -d
```

El contenedor expone la API y la web en el puerto `3000`, guarda la base en el volumen `/data` y arranca como usuario no privilegiado con `HEALTHCHECK`.

## Imagen publicada en GHCR

Con la imagen publicada en GitHub Container Registry (ver [docs/desarrollo.md](desarrollo.md)):

```bash
docker run -d --name tolocharadio -p 127.0.0.1:3000:3000 \
  -e JWT_ACCESS_SECRET='...' -e JWT_REFRESH_SECRET='...' \
  -v tolocharadio_data:/data \
  ghcr.io/izquierdojl/tolocharadio:latest
```

## Recordatorio de variables críticas

Los secretos `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` son obligatorios en producción (`NODE_ENV=production`). La tabla completa está en [docs/instalacion.md](instalacion.md).