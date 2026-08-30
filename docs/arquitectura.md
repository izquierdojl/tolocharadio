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

## Referencia rápida

| Tema | Documento |
| --- | --- |
| Instalación y arranque | [docs/instalacion.md](instalacion.md) |
| Despliegue con Docker | [docs/despliegue.md](despliegue.md) |
| API REST | [docs/api.md](api.md) |
| Desarrollo y release | [docs/desarrollo.md](desarrollo.md) |
| Licencia | [docs/licencia.md](licencia.md) |