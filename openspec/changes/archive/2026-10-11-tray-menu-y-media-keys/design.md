# Design

## Context

- El shell (`apps/desktop/src-tauri`) no tiene datos de usuario: la reproducción vive en el store Zustand de la web (`apps/web/src/stores/player.ts`) y el shell se entera mediante eventos Tauri (`player:update`, `player:command`) validados con `caller_is_server`.
- `tray.rs` construye el icono con show/hide, play/pause, stop y salir, y `build_app_menu` define la barra superior que se elimina.
- `media.rs` atiende `MediaControlEvent` de souvlaki en un hilo propio (MPRIS en Linux, SMTC en Windows). souvlaki expone Play/Pause/Toggle/Stop/Next/Previous, pero no eventos de volumen ni de silencio.
- El reproductor ya tiene `setVolume` y guarda el volumen en `localStorage`; no tiene estado de silencio separado (hoy silenciar equivale a volumen 0).
- Rutas web relevantes en `apps/web/src/App.tsx`: `/explorar`, `/favoritos`, `/historial`, `/estadisticas` (y `/mis-emisoras`).

## Goals / Non-Goals

**Goals:**
- Controles de reproducción, volumen y silencio desde la bandeja, con paridad en Linux y Windows.
- Accesos a secciones y submenú de favoritos que reproduce al seleccionar.
- Eliminar la barra de menú superior sin perder los atajos visibles.
- Mantener la regla de no persistir datos de usuario en el shell.

**Non-Goals:**
- Controlar el volumen del sistema operativo.
- Soporte de macOS (sigue sin media controls, como hoy).
- Cambios en `apps/api` o en el esquema de base de datos.

## Decisions

### 1. Eliminar la barra de menú y reubicar las acciones en la bandeja
`build_app_menu` y la llamada `app.set_menu` se eliminan, junto con el `on_menu_event` asociado. Las acciones de reproducción y sus atajos se muestran solo en el menú de la bandeja. Motivo: la barra duplica la bandeja y no encaja con la UI web. Alternativa descartada: ocultar la barra sólo en Windows, que dejaría comportamientos distintos entre plataformas.

### 2. Menú de bandeja construido en Rust y reconstruido al cambiar favoritos
`tray.rs` construye un `Menu` con: mostrar/ocultar, separador, submenú de emisora en reproducción, submenú "Explorar", "Favoritos", "Historial", "Estadísticas" (ver decisión 4), separador y salir. El submenú de emisora en reproducción muestra como cabecera (ítem deshabilitado) el nombre de la emisora, seguido de reproducir/pausar, detener, separador, subir volumen, bajar volumen, silenciar/reactivar y un ítem deshabilitado "Volumen: N %". Si no hay emisora, el submenú queda deshabilitado con el texto "Ninguna emisora en reproducción". El submenú Favoritos se reconstruye con `TrayIcon::set_menu` cuando llega una lista nueva, y el submenú de emisora se reconstruye cada vez que cambia `player:update` (nombre, estado, volumen o silencio).

**Rueda del ratón sobre el icono: descartada.** Tauri 2.12.3 y tray-icon 0.25.1 solo emiten `Click`, `DoubleClick`, `Enter`, `Move` y `Leave` en el icono de bandeja, sin evento de rueda. Mantener el control de volumen en el submenú y en los atajos `Ctrl+Alt`. Los IDs de menú llevan prefijo (`fav:<stationId>`, `nav:<path>`) para despachar sin tablas paralelas.

### 3. Volumen y silencio en el reproductor web
- `PlayerUpdate` gana `muted: bool` (con `serde(default)`, compatible con clientes antiguos).
- El store de la web gana `muted` separado del volumen: `toggleMute()` no modifica `volume`, de modo que al reactivar se recupera el valor previo. `setVolume(0)` deja de implicar silencio.
- `desktop.ts` atiende nuevas órdenes en `player:command`: `volume_up`, `volume_down` (paso fijo, p. ej. 0,05) y `mute_toggle`.
- Como el shell no conoce el volumen actual, el paso se calcula en la web a partir del `volume` del store.

### 4. Navegación a secciones
El shell muestra la ventana y emite `desktop:navigate` con `{ path }`. La web escucha el evento y navega con el router (`/explorar`, `/favoritos`, `/historial`, `/estadisticas`). Se valida que el `path` sea uno de esos valores en la web antes de navegar.

### 5. Favoritos en la bandeja: sin persistencia en el shell
La web publica `desktop:favorites` con `[{ id, name, favicon }]` al cargar la sesión y tras cada cambio de favoritos (mismo patrón que `player:update`). El shell guarda la lista solo en `AppState` (memoria) y reconstruye el submenú. Al cerrar la aplicación la lista se pierde, y se vuelve a recibir en el siguiente arranque. Alternativa descartada: que el shell consulte `/api/...` con cookies; implicaría duplicar lógica de sesión y cookies en Rust y viola la regla de no mantener datos de usuario fuera del servidor (aunque sea en memoria, sigue siendo la fuente del servidor).

Seleccionar un favorito emite `player:command` con `{ action: "play", stationId }`. La web busca la emisora en la lista de favoritos ya cargada y llama a `play(station)`. Si la emisora ya no existe, no hace nada.

### 6. Teclas multimedia y atajos globales
- **Play/pause, stop**: ya llegan por souvlaki y por el atajo `Ctrl+Alt+P/S`. Se mantienen y se verifican.
- **Siguiente/anterior**: souvlaki los expone, pero las emisoras no tienen cola. Se ignoran explícitamente (no se mapean) y se documentan como no soportados.
- **Volumen y silencio**: MPRIS y SMTC no envían eventos de volumen a la aplicación, y las teclas multimedia de volumen del sistema NO se capturan (decisión del usuario: solo bandeja y atajos propios). Se registran atajos globales propios con `tauri-plugin-global-shortcut`: `Ctrl+Alt+Flecha arriba` (subir), `Ctrl+Alt+Flecha abajo` (bajar) y `Ctrl+Alt+M` (silenciar). Así las teclas de volumen del sistema siguen funcionando igual.
- Si el registro falla (Wayland u otro entorno), se ignora y la acción queda disponible sólo desde la bandeja.

### 7. Atajos visibles en la bandeja
Las etiquetas del menú muestran el atajo solo si el registro tuvo éxito. Se guarda en `AppState` qué atajos quedaron registrados.

## Risks / Trade-offs

- **Captura de teclas de volumen del sistema** (decisión 6): riesgo de UX alto. Mitigación: pregunta abierta 1 antes de implementar.
- **Reconstrucción del menú de bandeja**: en Linux, algunos entornos (AppIndicator) no refrescan el menú al instante. Mitigación: la verificación manual en Linux cubre esta casuística.
- **Lista de favoritos desactualizada** si la web no está cargada (por ejemplo, la ventana se ha cerrado al estar en la pantalla de configuración). Mitigación: el submenú muestra la última lista recibida y un mensaje si está vacía.
- **Acoplamiento de eventos** entre web y shell: se añaden nuevos nombres de evento. Mitigación: validar `caller_is_server` en cada listener nuevo, igual que los existentes.
- **Cambio de comportamiento de atajos**: quitar la barra elimina el único lugar donde se listaban; el spec de `desktop-app` se modifica en consecuencia.

## Resolved Questions

1. Teclas de volumen del sistema: resuelto por el usuario. No se capturan; volumen y silencio solo desde la bandeja y atajos propios `Ctrl+Alt+Flecha arriba/abajo` y `Ctrl+Alt+M`.
2. Nombre de la sección "Explorar" en la bandeja: coincide con la navegación web actual.
