# Design

## Context

Ver `proposal.md` para la motivación. Tras los changes 1 y 2, el backend ya ingesta feeds y transmite episodios con progreso, y el reproductor web ya soporta audio bajo demanda. Falta la biblioteca de usuario (cola sincronizada y favoritos), el panel de inicio de podcasts, la navegación dual `Radio | Podcasts` en `AppShell`, la preferencia `defaultSection` y la activación por defecto (`PODCASTS_ENABLED=true`).

## Goals / Non-Goals

**Goals:**
- Sincronizar la cola de episodios entre dispositivos usando el servidor como fuente de verdad con control optimista (`revision` + `409`).
- Separar claramente Suscripciones (programas), Favoritos (episodios) y Cola (episodios pendientes).
- Introducir la navegación de primer nivel `Radio | Podcasts` sin romper las rutas cortas (`/explorar`, `/favoritos`, `/historial`, `/estadisticas`, `/mis-emisoras`) que usa el cliente de escritorio Tauri (`tray.rs`).
- Conectar las teclas `Next`/`Previous` del cliente de escritorio Tauri a la cola de podcasts.

**Non-Goals:**
- Sincronización *offline-first* con IndexedDB/outbox o WebSockets en tiempo real.
- Proxy de portadas en servidor (se usa hotlink con `referrerPolicy="no-referrer"`).

## Decisions

### D1. Cola con revisión optimista (`podcast_queue_state` + `podcast_queue_items`)
- **Decisión**: mantener una fila por usuario en `podcast_queue_state(user_id, revision, updated_at)` e ítems ordenados en `podcast_queue_items(user_id, episode_id, position, added_at)`. Cualquier mutación incrementa `revision` en la misma transacción. `PUT /podcasts/queue/order` exige `baseRevision`; si `baseRevision !== state.revision`, devuelve `409 QUEUE_CONFLICT` con el estado actual.
- **Al finalizar un episodio**: el cliente elimina el episodio terminado de la cola (`DELETE /podcasts/queue/:episodeId`) y reproduce el primer ítem restante.

### D2. Rutas canónicas de Radio intactas + subárbol `/podcasts/*`
- **Decisión**: conservar `/explorar`, `/favoritos`, `/historial`, `/mis-emisoras` y `/estadisticas` como rutas canónicas de Radio (añadiendo `<Navigate>` desde `/radio/*` hacia ellas), y montar Podcasts en `/podcasts`, `/podcasts/descubrir`, `/podcasts/suscripciones`, `/podcasts/:podcastId`, `/podcasts/cola` y `/podcasts/favoritos`.
- **Por qué**: `apps/desktop/src-tauri/src/tray.rs` y `apps/web/src/lib/desktop.ts` validan literalmente `["/explorar", "/favoritos", "/historial", "/estadisticas"]`. Mantenerlas garantiza compatibilidad total con binarios de escritorio ya publicados y con los tests existentes.

### D3. `defaultSection` aditivo a `defaultView`
- **Decisión**: añadir columna `default_section TEXT NOT NULL DEFAULT 'radio'` en `users`. En el frontend, `defaultEntryPath(user)` devuelve `/podcasts` cuando `user.defaultSection === "podcasts"` (y `features.podcasts` está activo), o `defaultViewPath(user.defaultView)` en caso contrario.

### D4. Importación OPML parseada en cliente contra `/subscriptions/bulk`
- **Decisión**: en `/podcasts/descubrir`, el archivo `.opml`/`.xml` seleccionado por el usuario se parsea en el navegador con `DOMParser` extrayendo los atributos `xmlUrl`, y se envía en lotes al endpoint `POST /api/v1/podcasts/subscriptions/bulk` (creado en el Change 1). Evita subir XML pesados ni ampliar el límite de `express.json`.

### D5. Ampliación retrocompatible del puente de escritorio (`bridge.rs` y `media.rs`)
- **Decisión**: añadir campos opcionales `#[serde(default)]` (`kind`, `duration_sec`, `position_sec`) a `PlayerUpdate` en `apps/desktop/src-tauri/src/bridge.rs`, y emitir los comandos `"next"` y `"previous"` desde `media.rs` hacia la webview para que `usePlayerStore` salte en la cola de podcasts.

## Risks / Trade-offs

- **[Colisión de cola con varias pestañas abiertas]** → Usar `refetchOnWindowFocus` de TanStack Query y manejar el `409` recargando la cola del servidor y mostrando un aviso suave (`toast.info("La cola se actualizó en otra sesión")`).
- **[Espacio en la cabecera en pantallas pequeñas]** → En móvil (`< 640px`), el selector `Radio | Podcasts` y las rutas contextuales se integran de forma compacta en el menú desplegable de `AppShell.tsx`.

## Migration Plan

1. Migración Drizzle con `podcast_favorites`, `podcast_queue_state`, `podcast_queue_items` y columna `default_section` en `users`.
2. Cambiar el valor por defecto de `PODCASTS_ENABLED` a `true` en `apps/api/src/config/env.ts`.
