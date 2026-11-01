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

## Proxy inverso (Apache)

El contenedor publica en `127.0.0.1:3000`, así que en producción lo habitual es poner un proxy inverso delante (Apache, nginx, Caddy…). El audio en directo usa conexiones HTTP de larga duración: conviene darles timeouts holgados y no comprimirlas.

Configuración recomendada para **Apache 2.4** con `mod_proxy` y `mod_proxy_http`:

```apache
# Conexiones largas de audio: no cerrar por inactividad antes de tiempo
ProxyTimeout 3600

# flushpackets evita acumular audio en el proxy antes de enviarlo al cliente
ProxyPass        /api/v1/playback/ http://127.0.0.1:3000/api/v1/playback/ timeout=3600
ProxyPassReverse /api/v1/playback/ http://127.0.0.1:3000/api/v1/playback/

# El audio nunca se comprime
SetEnvIf Request_URI "^/api/v1/playback/" no-gzip dont-vary
```

Notas:

- `Timeout` y `ProxyTimeout` afectan a conexiones **ociosas**. Un `ProxyTimeout 1800` (30 minutos) explicaría cortes de stream a los 30 minutos; con `3600` hay margen de sobra.
- Si `mod_http2` está activo (los navegadores modernos hablan HTTP/2 con Apache), revisa también `H2StreamTimeout`.
- `mod_proxy_http` reenvía el audio según llega, sin acumularlo; `flushpackets` solo tiene efecto en AJP y FastCGI, así que no hace falta para este caso.
- `mod_deflate` no debe tocar `audio/*`; la regla `no-gzip` lo garantiza solo para las rutas de reproducción.
- El cliente reconecta automáticamente aunque el proxy corte, pero ajustar estos valores evita cortes innecesarios y mejora la continuidad.
- Tras editar el virtual host: `sudo apachectl configtest && sudo systemctl reload apache2`.

Equivalencia orientativa en nginx: `proxy_read_timeout 3600s;`, `proxy_buffering off;` y `proxy_request_buffering off;` en la ubicación de `/api/v1/playback/`.

## Recordatorio de variables críticas

Los secretos `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` son obligatorios en producción (`NODE_ENV=production`). La tabla completa está en [docs/instalacion.md](instalacion.md).