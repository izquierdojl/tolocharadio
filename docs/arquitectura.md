# Arquitectura

> [← Volver al README](../README.md)

## Requisitos

- Node.js >= 22 (se usa `.nvmrc`)
- npm >= 10
- (Opcional) Docker >= 24 para el despliegue en contenedor

## Vista general

Monorepo npm con workspaces:

```
apps/
├── api/    API REST Express 5 (TypeScript, zod, drizzle-orm + better-sqlite3, jose, bcryptjs)
└── web/    Interfaz React 19 (Vite, Tailwind 4, React Router, TanStack Query, Zustand)
```

La API sirve también el frontend compilado (`STATIC_DIR`). En desarrollo, Vite hace proxy de `/api` a la API.

## Componentes clave

- **Almacenamiento**: SQLite vía Drizzle (`users`, `refresh_tokens`, `password_reset_tokens`, `favorites`, `history`).
- **Sesiones**: access token JWT (15 min) en memoria + cookie httpOnly `tolocha-refresh` rotatoria; refuerzo con cookie httpOnly `tolocha-access` para que el `<audio>` del reproductor pueda autenticarse.
- **Catálogo**: cliente con caché en memoria, `User-Agent`/`appname` `TolochaRadio`, degradación con servidor caído (caché si existe, 503 si no).

## Reproducción

El cliente mantiene un único `<audio>` gestionado por `PlaybackEngine` (`apps/web/src/lib/playbackEngine.ts`) y el store de Zustand; así la reproducción sobrevive a la navegación. El motor vigila el progreso, reconecta con espera creciente (0, 1, 2, 4, 8 y 15 s), refresca la sesión antes de reconectar y expone estados de conexión, reconexión y error.

El endpoint `GET /api/v1/playback/{stationId}/live` entrega siempre audio continuo:

- **Stream directo**: proxy transparente del origen.
- **Lista M3U/PLS**: resolución server-side y proxy del primer candidato reproducible.
- **HLS concatenable** (AAC-ADTS o MP3): el servidor resuelve el master, elige la variante y encadena los segmentos; renueva la sesión de origen cuando caduca (`404`/`410`) y alinea por `EXT-X-PROGRAM-DATE-TIME`. Si el contenedor no es concatenable (fMP4, MPEG-TS, cifrado) responde `415 HLS_UNSUPPORTED_CONTAINER`.
- **Atajo progresivo**: si la URL HLS es de StreamTheWorld (`/livestream-redirect/<MOUNT>.m3u8`), se prueba primero su variante `.aac`, que evita el HLS por completo.

Las rutas anteriores (`/playback/{id}`, `/playback/{id}/hls` y `/playback/{id}/status`) se mantienen intactas para clientes externos (por ejemplo la app Android).

## Referencia rápida

| Tema | Documento |
| --- | --- |
| Instalación y arranque | [docs/instalacion.md](instalacion.md) |
| Despliegue con Docker | [docs/despliegue.md](despliegue.md) |
| API REST | [docs/api.md](api.md) |
| Desarrollo y release | [docs/desarrollo.md](desarrollo.md) |
| Licencia | [docs/licencia.md](licencia.md) |