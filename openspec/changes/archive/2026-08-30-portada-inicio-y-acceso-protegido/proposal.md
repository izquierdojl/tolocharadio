## Why

Un visitante sin sesión puede explorar la rejilla y buscar emisoras, pero al pulsar reproducir no suena nada: el stream exige autenticación (`/playback/*` devuelve 401). Eso da la sensación de un fallo en vez de una invitación. Como la reproducción por diseño requiere sesión (registra historial), la exploración también debería requerirla, mostrando antes una portada atractiva con la temática de TolochaRadio que conduzca al registro o al inicio de sesión.

## What Changes

- **Nueva portada de inicio en `/`** (pública): pantalla temática de la Sierra de Tolocha con ilustración/fono (mockup, montañas, radio), titular y llamadas a la acción hacia `/login` y `/registro`.
- **Explorar se traslada a `/explorar`** y queda reservada a usuarios con sesión: un invitado que acceda a `/explorar` es redirigido a la portada `/` (y `RequireAuth` lleva al login). Un usuario invitado **no ve la lista de emisoras ni puede buscar**.
- La navegación y los flujos de sesión se adaptan al nuevo mapa de rutas (logo → `/`, nav «Explorar» → `/explorar`).

## Capabilities

### New Capabilities

(none: todo el comportamiento es de la interfaz web, que ya tiene capacidad propia)

### Modified Capabilities
- `web-ui`: la pantalla principal deja de ser la exploración y pasa a ser la portada; la exploración queda tras autenticación y se añade el requisito de acceso restringido (sin rejilla ni búsqueda para invitados) y de una portada temática.

## Impact

- **Web** (`apps/web`): nueva página de portada (`pages/`), mapa de rutas en `App.tsx` (portada en `/`, exploración en `/explorar` con guarda), navegación del `AppShell`.
- **API**: sin cambios (la reproducción sigue exigiendo sesión y registrando historial como está).
- **Especificaciones**: delta de `web-ui`.
- Sin cambios de esquema de base de datos ni de despliegue.