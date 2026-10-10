# Tasks

## 1. Scaffolding del cliente de escritorio

- [x] 1.1 Crear `apps/desktop` como workspace npm mínimo (scripts `dev`/`build`/`tauri` y `@tauri-apps/cli` como devDependency) con el proyecto Tauri 2 en `apps/desktop/src-tauri`; verificar que `npm install` en la raíz instala el workspace y que `npm run typecheck && npm run lint && npm run test && npm run build` de la raíz siguen pasando.
- [x] 1.2 Configurar `tauri.conf.json` (identificador, iconos Tolocha, `app.withGlobalTauri: true`) y crear la ventana principal en Rust con guard de navegación; verificar con `npm run tauri dev --workspace @tolocharadio/desktop` que se abre una ventana propia (requiere toolchain Rust + WebKitGTK en Linux).
- [x] 1.3 Añadir al `package.json` raíz el workspace `apps/desktop` si no queda cubierto por `apps/*` y verificar que `scripts/bump.js` no rompe con el nuevo workspace (revisar que la versión se escribe en su `package.json`).

## 2. Arranque local: configuración, salud y errores

- [x] 2.1 Implementar la persistencia de la URL del servidor con `tauri-plugin-store` y la validación (HTTPS por defecto, `http://localhost` permitido para desarrollo); verificar con pruebas unitarias Rust que una URL mal formada o no permitida se rechaza y no se guarda.
- [x] 2.2 Crear la página local de configuración de primer arranque (textos en español) y conectarla al arranque del shell cuando no hay servidor guardado; verificar abriendo la app sin configuración previa: no carga ninguna interfaz remota hasta guardar.
- [x] 2.3 Crear la página local de salud/error: comprobar `GET /api/v1/health` del servidor configurado, navegar a la interfaz si responde y mostrar reintentar/cambiar URL si no; verificar arrancando con el servidor apagado y levantándolo después para reintentar sin reiniciar la app.
- [x] 2.4 Verificar el cambio de servidor: guardar una segunda URL desde la configuración y comprobar que la ventana carga el nuevo servidor y que la elección persiste tras reiniciar la app.

## 3. Puente web↔shell (integración en la web)

- [x] 3.1 Añadir `apps/web/src/lib/desktop.ts` con detección de `window.__TAURI__` y emisión de `player:update` (`stationId`, `name`, `favicon`, `isPlaying`, `isBuffering`, `volume`) al cambiar el store del reproductor; verificar con tests de Vitest (mock de `window.__TAURI__`) que se emite el estado correcto y que con el mock ausente no se registra nada.
- [x] 3.2 Manejar `player:command` (`toggle`, `stop`, `volume`) llamando a las acciones existentes del store y exponiendo `desktopMode`/versión del shell al frontend; verificar con tests que un comando sin emisora seleccionada no produce errores ni estados inconsistentes.
- [x] 3.3 Ocultar el aviso de versión web cuando `desktopMode` está activo y mostrar la versión del shell en el diálogo "Acerca de"; verificar en navegador que el aviso de versión y el diálogo se comportan como antes (sin regresión) y que `npm run test` de `apps/web` pasa.
- [x] 3.4 Definir la capability de Tauri (`remote.urls` https://* + localhost) con solo `core:event` para el puente de eventos, validar en Rust el origen real antes de procesar cada mensaje y restringir la navegación al servidor configurado; verificar con la app en ejecución que el puente funciona con el servidor real y que un origen distinto no obtiene respuesta.
- [x] 3.5 Verificar la suite completa de la web (`npm run typecheck && npm run lint && npm run test` en `apps/web`) y confirmar en un navegador normal que la app no depende de APIs nativas.

## 4. Integración nativa (Rust)

- [x] 4.1 Implementar el icono de bandeja con `TrayIconBuilder`: mostrar/ocultar ventana, reproducir/pausar, detener, salir y nombre de la emisora en el tooltip a partir de `player:update`; verificar en Linux que cerrar la ventana mantiene la reproducción y que las acciones del menú responden en la interfaz.
- [x] 4.2 Integrar `souvlaki` (MPRIS en Linux, SMTC en Windows) con callbacks de reproducir/pausar y detener y metadatos de la emisora; verificar en Linux con `playerctl play-pause`/`playerctl metadata` que el estado y el título reflejan la emisora.
- [x] 4.3 Registrar atajos globales (`tauri-plugin-global-shortcut`) para reproducir/pausar y detener y exponerlos en el menú de la aplicación; verificar que funcionan con la ventana oculta y que el menú los muestra.
- [x] 4.4 Añadir `tauri-plugin-single-instance`; verificar que un segundo lanzamiento enfoca la ventana existente sin duplicar reproducción.
- [x] 4.5 Abrir enlaces externos (p. ej. GitHub) en el navegador del sistema con `tauri-plugin-opener` e impedir la navegación fuera del origen del servidor; verificar que pulsar el enlace del repositorio abre el navegador y que la ventana permanece en la interfaz.
- [x] 4.6 Verificar los controles nativos en Windows (máquina virtual): bandeja, SMTC (`playerctl` equivalente o panel de medios de Windows), atajos globales y single-instance.

## 5. Autoactualización y release

- [x] 5.1 Integrar `tauri-plugin-updater` con endpoint en las releases de GitHub y clave pública configurada; verificar con una versión local anterior que la app detecta la nueva, se descarga e instala y reinicia, y que un fallo de red no bloquea el arranque.
- [x] 5.2 Extender `scripts/bump.js` para escribir la versión en `apps/desktop/src-tauri/tauri.conf.json` y `Cargo.toml`; verificar en una copia temporal del repo que `node scripts/bump.js minor` actualiza los cuatro sitios (raíz, workspaces, `tauri.conf.json`, `Cargo.toml`) de forma coherente.
- [x] 5.3 Añadir al workflow de release un job con `tauri-action` (matriz Ubuntu/Windows) que firme y publique `.deb`/AppImage, MSI/NSIS y `latest.json` como assets del tag `vX.Y.Z`; verificar ejecutando el workflow en un tag de prueba (`vX.Y.Z-rc1` o rama de prueba) y comprobando los assets publicados.
- [x] 5.4 Documentar la generación y custodia de las claves del updater (secretos del repositorio) y verificar que una release de prueba se instala y autoactualiza desde la release anterior.

## 6. Documentación

- [x] 6.1 Crear `docs/escritorio.md` (instalación, primer arranque, configuración de servidor, bandeja/atajos/actualizaciones) y enlazarla desde `README.md` y `docs/instalacion.md`; verificar que todos los enlaces y comandos documentados funcionan tal cual.
- [x] 6.2 Documentar en `docs/desarrollo.md` los requisitos de desarrollo (toolchain Rust, WebKitGTK en Linux, Windows) y el flujo de build/release del cliente; verificar siguiendo los pasos en una máquina Linux limpia o contenedor.

## 7. Verificación integral

- [x] 7.1 Smoke completo en Linux: primer arranque, configurar servidor, login, reproducir, bandeja, teclas multimedia, atajos, cierre a bandeja, salir, servidor caído y recuperación.
- [x] 7.2 Comprobar reutilización y no regresión: `git diff --stat` no toca `apps/api/`, la base de datos ni `docker-compose.yml`, y `docker compose up --build -d` + smoke de la web y la API siguen correctos.
- [x] 7.3 Ejecutar la verificación de calidad del monorepo (`npm run typecheck && npm run lint && npm run test && npm run build`) y confirmar que `apps/desktop` no rompe ninguno de los pasos.

## Workflow follow-up

- Commitear todo el código del change en la rama feature antes de archivar (verificar con `git status`).
- Archivar el change y, tras el archivado, ejecutar `node scripts/bump.js minor` + push de rama y tags para publicar la release con los instaladores (regla de versionado de `AGENTS.md`).
