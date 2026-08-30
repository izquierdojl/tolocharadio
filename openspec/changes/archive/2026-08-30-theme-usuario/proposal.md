## Why

La interfaz de TolochaRadio está fijada en modo oscuro: los colores tolosacos (pinos y ocres) y el fondo se definen de forma estática y todos los usuarios ven exactamente la misma apariencia. No hay forma de que cada persona elija un tema claro u oscuro, y tampoco se recuerda esa elección entre sesiones ni por usuario.

## What Changes

- **Cambio de tema claro/oscuro en la web**: se añade un control (icono sol/luna) que alterna entre tema oscuro (por defecto, acorde a un reproductor de audio) y tema claro, aplicando la paleta Tolocha correspondiente en todas las superficies, fondos y textos. Con sesión abierta, el control se encuentra dentro del menú desplegable del avatar/nombre del usuario; sin sesión, se muestra directamente en la cabecera.
- **Preferencia por usuario**: cuando hay sesión abierta, la elección de tema se guarda en el perfil del usuario en el servidor (nueva columna `theme` en `users`) y se recupera al iniciar sesión o restaurar la sesión.
- **Preferencia para invitados**: cuando no hay sesión, la elección se persiste localmente (localStorage) y se aplica en el dispositivo. Al iniciar sesión, la preferencia del servidor tiene prioridad.
- **API**: `PublicUser` y los endpoints `/users/me` (GET y PATCH) exponen y permiten actualizar la preferencia de tema.

## Capabilities

### New Capabilities
<!-- Ninguna: la funcionalidad se integra en capacidades existentes (auth y web). -->

### Modified Capabilities
- `auth`: el perfil de usuario incluye ahora una preferencia de tema (`light` | `dark`) consultable y actualizable por el propio usuario autenticado.
- `web-ui`: se sustituye el modo oscuro fijo por un selector de tema claro/oscuro con la preferencia persistida por usuario (y por dispositivo para invitados). La temática Tolocha se adapta a ambos modos y el oscuro sigue siendo el predeterminado.

## Impact

- **API** (`apps/api`): nueva columna `theme` en `users` (`db/schema.ts`), migración Drizzle, inclusión/actualización de `theme` en `PublicUser` y en `AuthService` (login/register/me/patch), y endpoint `PATCH /users/me` ampliado para actualizar el tema.
- **Web** (`apps/web`): `lib/types.ts` (campo `theme` en `User`), `lib/api.ts`, nuevo `stores/theme.ts` (Zustand) o extensión de un store existente, nuevo componente de alternancia en `components/AppShell.tsx` (cabecera), y ajuste de `index.css` para soportar clases/variables de tema claro y oscuro.
- **Especificaciones**: deltas de `auth` y `web-ui`.
- Sin cambios en los proxies de playback, favoritos o historial. Despliegue monolítico en un paso (API + web en el mismo contenedor).
