## Why

Los usuarios con hábitos distintos (explorar emisoras nuevas frente a ir directo a sus favoritos o repasar su historial) hoy siempre aterrizan en el mismo punto tras entrar a la aplicación, lo que obliga a un clic extra en cada sesión. Permitir elegir la vista inicial por defecto en el perfil mejora la fluidez de uso y la personalización sin cambiar el comportamiento para quien no configure nada.

## What Changes

- Añadir al perfil de usuario una preferencia de vista inicial con tres valores posibles: **Explorar** (`/explorar`), **Favoritos** (`/favoritos`) e **Historial** (`/historial`).
- Persistir la preferencia en el backend como parte del perfil (mismo patrón que la preferencia de tema), con valor por defecto `explorar` para usuarios nuevos y existentes sin preferencia.
- Añadir en la pantalla de perfil (`/perfil`) un selector de vista por defecto que muestre la preferencia actual y la guarde en la API con confirmación visual.
- Al acceder con sesión (tras inicio de sesión/registro y al abrir la raíz `/` con sesión activa), dirigir al usuario a su vista por defecto en lugar de quedarse siempre en la portada.
- Mantener la portada pública (`/`) intacta para invitados; solo los usuarios autenticados son redirigidos según su preferencia.

## Capabilities

### New Capabilities

- Ninguna: se reutilizan las capacidades existentes de perfil y navegación.

### Modified Capabilities

- `auth`: la preferencia de vista inicial (`explorar` | `favoritos` | `historial`) pasa a formar parte del perfil consultable y actualizable por el propio usuario, con valor por defecto `explorar`.
- `web-ui`: el perfil ofrece el selector de vista por defecto y la navegación inicial (tras login/registro y en `/` con sesión) respeta esa preferencia.

## Impact

- Backend (`apps/api`): esquema `users` (nueva columna), servicio de perfil (`PATCH /users/me`, `GET /users/me`), validación con Zod y esquema OpenAPI del usuario.
- Frontend (`apps/web`): pantalla `Profile.tsx`, tipos `User`, redirección inicial en `App.tsx` / pantallas de login-registro y navegación `Home` para autenticados.
- Migración de base de datos SQLite necesaria para la nueva columna con valor por defecto.
- Sin cambios para invitados ni para el resto de vistas; sin cambios en favoritos, historial o reproducción.
