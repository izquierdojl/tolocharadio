# Proposal

## Why

Con el catálogo y el motor de reproducción de episodios listos, el usuario necesita gestionar su biblioteca de podcasts (cola sincronizada entre dispositivos, episodios favoritos y panel principal de novedades/continuar escuchando) y navegar entre Radio y Podcasts desde la interfaz web y el cliente de escritorio. Este change completa la experiencia funcional de podcasts y activa `PODCASTS_ENABLED=true` por defecto.

## What Changes

- **Cola sincronizada con control optimista de concurrencia**: tablas `podcast_queue_state` y `podcast_queue_items`, y endpoints `GET /api/v1/podcasts/queue`, `POST /api/v1/podcasts/queue`, `DELETE /api/v1/podcasts/queue/:episodeId` y `PUT /api/v1/podcasts/queue/order` (con `baseRevision` y respuesta `409 Conflict` ante colisiones entre dispositivos). Al terminar un episodio, se retira de la cola y el reproductor avanza automáticamente al siguiente.
- **Favoritos de episodios**: tabla `podcast_favorites` y endpoints `GET /api/v1/podcasts/favorites`, `POST /api/v1/podcasts/favorites` y `DELETE /api/v1/podcasts/favorites/:episodeId`.
- **Dashboard agregado de podcasts**: endpoint `GET /api/v1/podcasts/home` con episodios en curso para continuar escuchando, últimos episodios publicados de las suscripciones y resumen de cola.
- **Preferencia `defaultSection` en el perfil de usuario**: añade `defaultSection: "radio" | "podcasts"` (`"radio"` por defecto) en `users`, `PATCH /api/v1/users/me` y pantalla `/perfil`.
- **Navegación de primer nivel y vistas web de Podcasts**:
  - Selector **Radio | Podcasts** en `AppShell.tsx` (oculto si `features.podcasts === false`), manteniendo las rutas cortas de radio (`/explorar`, `/favoritos`, `/historial`, `/mis-emisoras`, `/estadisticas`) más alias `/radio/*`, y añadiendo `/podcasts`, `/podcasts/descubrir`, `/podcasts/suscripciones`, `/podcasts/:podcastId`, `/podcasts/cola` y `/podcasts/favoritos`.
  - Portadas de podcasts/episodios mediante hotlink con `referrerPolicy="no-referrer"` y `loading="lazy"`.
  - Activación de `PODCASTS_ENABLED=true` por defecto.
- **Mandos `Next`/`Previous` y metadatos en el cliente de escritorio (Tauri)**: ampliación de `bridge.rs` y `media.rs` para habilitar pista siguiente/anterior sobre la cola de podcasts y publicar duración/posición en el centro de medios del sistema.

## Capabilities

### New Capabilities
- `podcast-library`: cola de reproducción de episodios sincronizada con control de revisión (`409`), gestión de episodios favoritos, endpoint de portada de podcasts (`/podcasts/home`) y pantallas web de navegación y gestión de podcasts (`Inicio`, `Descubrir`, `Suscripciones`, `Ficha de podcast`, `Cola` y `Favoritos`).

### Modified Capabilities
- `web-ui`: añade el selector de sección de primer nivel (`Radio | Podcasts`) en la cabecera, la preferencia `defaultSection` en el perfil y en la redirección de `/`, y el comportamiento del reproductor persistente cuando reproduce un episodio o una cola de podcasts.
- `desktop-app`: amplía la integración del reproductor con el contenedor de escritorio para soportar los comandos `Next` y `Previous` de la cola de podcasts y reportar metadatos de episodio (duración, posición y tipo).

## Impact

- **Backend (`apps/api`)**:
  - Nuevas tablas `podcast_favorites`, `podcast_queue_state`, `podcast_queue_items` y columna `default_section` en `users`.
  - Nuevos servicios `src/services/podcasts/queue.ts`, `src/services/podcasts/favorites.ts` y `home` en `catalog.ts`.
  - Cambio de valor por defecto `PODCASTS_ENABLED=true` en `src/config/env.ts`.
  - Actualización de `src/routes/users.ts`, `src/routes/podcasts.ts` y `src/openapi.ts`.
- **Frontend (`apps/web`)**:
  - Nuevas páginas en `src/pages/podcasts/` (`PodcastHome.tsx`, `PodcastSearch.tsx`, `PodcastSubscriptions.tsx`, `PodcastShow.tsx`, `PodcastQueue.tsx`, `PodcastFavorites.tsx`) y componentes en `src/components/podcasts/`.
  - Actualización de `src/App.tsx`, `src/components/AppShell.tsx`, `src/pages/Profile.tsx`, `src/lib/defaultView.ts` y `src/lib/desktop.ts`.
- **Desktop (`apps/desktop`)**:
  - Actualización de `src-tauri/src/bridge.rs` y `src-tauri/src/media.rs`.
