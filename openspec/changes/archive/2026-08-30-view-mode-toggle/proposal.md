## Why

Todas las secciones que muestran emisoras (explorar/búsqueda, favoritos e historial) usan exclusivamente una rejilla de tarjetas con imagen grande y acciones flotantes. En una sola pantalla cabe poco contenido y no hay forma de ver densa información (más emisoras, nombre y país de un vistazo) en formato de lista, algo habitual en listados de radios y catálogos.

## What Changes

- **Control de modo de vista en la cabecera**: se añade, para usuarios autenticados, un botón/switch en la cabecera que alterna entre el modo **tarjeta** (rejilla actual de `StationCard`) y el modo **lista** (filas densas con favorito, reproducción y metadatos de la emisora).
- **Aplicación global del modo**: el modo elegido se aplica a todas las vistas que listan emisoras — explorar/búsqueda, favoritos e historial — y se mantiene al navegar entre ellas sin repetir la elección.
- **Preferencia recordada en el dispositivo**: la elección se persiste en `localStorage` y se respeta al recargar la página y volver a entrar.
- **Nuevo componente de fila de lista**: se introduce una variante de fila (tipo lista) para representar la misma emisora que la tarjeta, con las mismas acciones (reproducir, añadir/quitar favorito).

**Supuesto (decisión de alcance)**: la preferencia de vista se persiste solo en el dispositivo (localStorage), como el tema para invitados, sin sincronizarla con el perfil del usuario en el servidor. No hay cambios de API. Si en el futuro se quiere sincronizar por usuario, será un cambio aparte.

## Capabilities

### New Capabilities
<!-- Ninguna: la funcionalidad se integra en la capacidad web existente. -->

### Modified Capabilities
- `web-ui`: se añade un control global en la cabecera para alternar entre modo tarjeta (rejilla) y modo lista en todas las vistas que muestran emisoras (explorar, favoritos e historial), con la preferencia recordada en el dispositivo.

## Impact

- **Web** (`apps/web`): nuevo `stores/viewMode.ts` (Zustand con persistencia en `localStorage`), nuevo componente `ViewModeToggle.tsx` integrado en `components/AppShell.tsx` (cabecera, solo con sesión), nuevo `StationListItem.tsx`, y adaptación de las páginas que listan emisoras (`pages/Explore.tsx`, `pages/Favorites.tsx`, `pages/History.tsx`) para renderizar según el modo elegido.
- **Especificaciones**: delta de `web-ui` (requirement nuevo).
- **Sin cambios de API** (`apps/api`): ningún endpoint, esquema o migración se ve afectado.
- **Sin cambios de backend** en favoritos, historial o playback.