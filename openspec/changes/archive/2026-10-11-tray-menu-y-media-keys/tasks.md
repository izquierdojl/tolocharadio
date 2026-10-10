# Tasks

## 1. Reproductor web: volumen, silencio y órdenes desde el shell

- [x] 1.1 Añadir `muted` al store del reproductor (`apps/web/src/stores/player.ts`) separado del volumen, con `toggleMute()` que no altera `volume`
- [x] 1.2 Hacer que `setVolume(0)` no implique silencio y persistir el estado de silencio en `localStorage` junto al volumen
- [x] 1.3 Ampliar `PlayerSnapshot` en `apps/web/src/lib/desktop.ts` con `muted` y publicarlo en `player:update`
- [x] 1.4 Atender en `desktop.ts` las órdenes `volume_up`, `volume_down` (paso 0,05) y `mute_toggle` desde `player:command`
- [x] 1.5 Atender `play` con `stationId` en `player:command`, buscando la emisora en los favoritos cargados
- [x] 1.6 Escuchar `desktop:navigate` con `path` validado contra `/explorar`, `/favoritos`, `/historial` y `/estadisticas`
- [x] 1.7 Publicar `desktop:favorites` con `[{ id, name, favicon }]` al cargar la sesión y tras cada cambio de favoritos
- [x] 1.8 Tests unitarios en `apps/web/src/lib/desktop.test.ts` para las nuevas órdenes, la validación de rutas y la publicación de favoritos

## 2. Shell de escritorio: bridge y estado

- [x] 2.1 Añadir `muted: bool` (con `serde(default)`) a `PlayerUpdate` en `apps/desktop/src-tauri/src/bridge.rs`
- [x] 2.2 Añadir constructores de comando para `volume_up`, `volume_down`, `mute_toggle` y `play` con `station_id` en `bridge.rs`
- [x] 2.3 Guardar la lista de favoritos recibida en `AppState` (solo memoria) y escuchar `desktop:favorites` validando `caller_is_server`
- [x] 2.4 Escuchar nuevos eventos de navegación emitidos desde la bandeja y emitir `desktop:navigate`

## 3. Bandeja del sistema

- [x] 3.1 Reescribir `build_tray` en `apps/desktop/src-tauri/src/tray.rs` con: mostrar/ocultar, submenú de emisora en reproducción, submenú Explorar/Favoritos/Historial/Estadísticas y salir
- [x] 3.1b Implementar el submenú de emisora en reproducción: cabecera con el nombre, reproducir/pausar, detener, subir volumen, bajar volumen, silenciar/reactivar, "Volumen: N %" y estado deshabilitado sin emisora
- [x] 3.2 Implementar el submenú Favoritos con IDs `fav:<stationId>` y mensaje "Sin favoritos" cuando la lista esté vacía
- [x] 3.3 Reconstruir el menú de bandeja con `TrayIcon::set_menu` al recibir una lista nueva de favoritos
- [x] 3.4 Mostrar en las etiquetas de bandeja los atajos solo cuando se registraron correctamente
- [x] 3.5 Reconstruir el submenú de emisora en reproducción con `set_menu` al recibir cada `player:update` (nombre, estado, volumen y `muted`), con el texto de silenciar/reactivar según `muted`
- [x] 3.6 Eliminar `build_app_menu` y la llamada `app.set_menu` / `on_menu_event` en `tray.rs` y `lib.rs`

## 4. Teclas multimedia y atajos globales

- [x] 4.1 Mapear en `apps/desktop/src-tauri/src/media.rs` Play, Pause, Toggle y Stop (ya existentes) y dejar Next/Previous explícitamente sin acción
- [x] 4.2 Registrar en `lib.rs` los atajos `Ctrl+Alt+Flecha arriba` (subir), `Ctrl+Alt+Flecha abajo` (bajar) y `Ctrl+Alt+M` (silenciar), sin error bloqueante si el registro falla
- [x] 4.3 Ajustar el handler de atajos globales para despachar las nuevas órdenes de volumen y silencio
- [x] 4.4 Verificar que las teclas multimedia de volumen del sistema no quedan capturadas

## 5. Verificación

- [x] 5.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` en la raíz del monorepo
- [x] 5.2 Ejecutar `cargo test` y `cargo clippy` en `apps/desktop/src-tauri`
- [x] 5.3 Verificación manual en Linux: bandeja (todas las acciones), teclas multimedia play/pause/stop con la ventana oculta, MPRIS con metadatos, atajos `Ctrl+Alt` con ventana oculta
- [x] 5.4 Verificación manual en Windows: bandeja (todas las acciones), teclas multimedia play/pause/stop, SMTC con metadatos, atajos `Ctrl+Alt`
- [x] 5.5 Verificar que la barra de menú superior ya no aparece en Linux ni en Windows
- [x] 5.6 Verificar que el submenú Favoritos refleja un favorito añadido desde la web sin reiniciar la aplicación
- [x] 5.7 Verificar que las teclas de volumen del sistema siguen controlando el volumen del sistema con la aplicación abierta

## Workflow follow-up

- Tras implementar, seguir el flujo de release del `AGENTS.md`: commitear todo en la rama feature, fusionar a `main` y ejecutar `node scripts/bump.js minor` (feature) antes de publicar.
