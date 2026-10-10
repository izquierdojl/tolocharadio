# Proposal

## Why

La barra de menú superior de la aplicación de escritorio duplica acciones que ya están en la bandeja y no encaja con la interfaz web. Al mismo tiempo, la bandeja solo ofrece mostrar/ocultar, reproducir/pausar, detener y salir: faltan control de volumen, silencio, acceso directo a las secciones principales y a las emisoras favoritas, y las teclas multimedia no cubren el volumen. Se quiere cerrar esas carencias y verificar que los controles funcionan de forma real en Linux y Windows.

## What Changes

- **BREAKING (UI de escritorio)**: se elimina la barra de menú superior de la aplicación (`build_app_menu`). Las acciones de reproducción y sus atajos pasan a mostrarse en el menú de la bandeja.
- La bandeja del sistema añade:
  - Reproducir / pausar, detener (ya existentes).
  - Submenú de la emisora en reproducción, con su nombre como cabecera, los controles de reproducción, subir y bajar volumen, silenciar / reactivar y el nivel de volumen actual. Se actualiza con el estado del reproductor.
  - Submenús de navegación: Explorar (búsqueda), Favoritos, Historial y Estadísticas, que abren la sección correspondiente en la ventana.
  - Submenú **Favoritos** con las emisoras del usuario; al seleccionar una, se inicia su reproducción.
  - Mostrar/ocultar ventana y salir (ya existentes).
- Las teclas multimedia (reproducir/pausar, detener, siguiente/anterior cuando aplique) y los atajos globales ya existentes siguen funcionando con la ventana oculta; se añaden atajos globales propios para subir/bajar volumen (`Ctrl+Alt+Flecha arriba/abajo`) y silenciar (`Ctrl+Alt+M`). Las teclas multimedia de volumen del sistema no se capturan.
- La interfaz web expone al shell de escritorio el volumen y el estado de silencio del reproductor, y la lista de favoritos del usuario, sin que el shell persista datos de usuario.
- Se verifica el funcionamiento en Linux (MPRIS/tray) y Windows (SMTC/tray) como parte de la aceptación.

Fuera de alcance: controlar el volumen del sistema operativo (solo se controla el volumen del reproductor de TolochaRadio); cualquier persistencia local de favoritos o historial en el cliente de escritorio.

## Capabilities

### New Capabilities

Ninguna. Las acciones de bandeja, controles multimedia y atajos ya pertenecen a la capacidad existente de escritorio.

### Modified Capabilities

- `desktop-app`: los requisitos de bandeja del sistema, controles multimedia del sistema y atajos globales cambian (nuevas acciones de volumen y silencio, submenús de secciones y favoritos, desaparición de la barra de menú superior y reubicación de los atajos mostrados).

## Impact

- `apps/desktop/src-tauri/src/tray.rs`: construcción del menú de bandeja con submenús dinámicos; eliminación de `build_app_menu`.
- `apps/desktop/src-tauri/src/lib.rs`: eliminación de `set_menu`, registro de atajos de volumen/silencio, reenvío de eventos.
- `apps/desktop/src-tauri/src/media.rs`: manejo de eventos de control multimedia disponibles en souvlaki (play, pause, toggle, stop, siguiente/anterior si aplica).
- `apps/desktop/src-tauri/src/bridge.rs`: nuevos comandos hacia la web (volumen, silencio, reproducir emisora, navegar a sección) y nuevo estado (volumen, silencio, favoritos).
- `apps/web`: escucha de comandos del shell de escritorio y publicación de volumen, silencio y favoritos mediante el mismo canal de eventos que `player:update`.
- Sin cambios en `apps/api` ni en el esquema de base de datos.
- Dependencias: sin nuevas dependencias previstas; souvlaki y el plugin de atajos globales de Tauri se reutilizan.
