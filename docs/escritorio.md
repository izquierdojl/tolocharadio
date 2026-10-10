# Cliente de escritorio

> [← Volver al README](../README.md)

TolochaRadio tiene un cliente de escritorio nativo (Tauri 2) para **Windows y Linux**
(con macOS previsto) que se conecta a tu servidor TolochaRadio autoalojado. Es un
**cliente ligero**: la interfaz y los datos viven en tu servidor, así que la cuenta,
los favoritos, el historial y las estadísticas son los mismos que en la web, la PWA o
la app Android. No guarda ninguna base de datos local.

## Requisitos

- Tener un servidor TolochaRadio accesible (ver [Instalación](instalacion.md) o
  [Despliegue](despliegue.md)).
- Windows 10/11 o una distribución Linux de escritorio.

## Instalación

Descarga el instalador de la última release en
[github.com/izquierdojl/tolocharadio/releases](https://github.com/izquierdojl/tolocharadio/releases):

- **Linux**: `.deb` (Debian/Ubuntu) o AppImage. Para la AppImage:
  ```bash
  chmod +x TolochaRadio_*.AppImage
  ./TolochaRadio_*.AppImage
  ```
- **Windows**: instalador `.exe` (NSIS) o `.msi`.

## Primer arranque

1. Abre TolochaRadio: verás una pantalla local de configuración.
2. Escribe la **URL de tu servidor** (por ejemplo `https://radio.ejemplo.com`).
   Debe ser la raíz del servidor y usar `https://`; solo se permite `http://localhost`
   para desarrollo.
3. Pulsa **Guardar y conectar**. El cliente comprueba que el servidor responde y carga
   la interfaz.

Si el servidor no está disponible verás una pantalla de error con **Reintentar** y
**Cambiar servidor**; no hace falta reiniciar la aplicación.

## Uso

- **Inicio de sesión**: idéntico a la web (mismo usuario y contraseña). La sesión se
  mantiene entre reinicios.
- **Bandeja del sistema**: el icono muestra la emisora en curso y su menú permite
  mostrar u ocultar la ventana, reproducir/pausar, detener y salir.
- **Cerrar la ventana** no cierra la aplicación: sigue reproduciendo en la bandeja.
  Usa **Salir** para cerrarla por completo.
- **Controles multimedia del sistema**: teclas multimedia y centro de medios (MPRIS en
  Linux, SMTC en Windows) con el nombre y la carátula de la emisora.
- **Atajos globales** (funcionan con la ventana oculta):
  - `Ctrl+Alt+P`: reproducir / pausar
  - `Ctrl+Alt+S`: detener
- **Enlaces externos** (por ejemplo, el repositorio) se abren en el navegador del
  sistema.

## Actualizaciones

Hay dos flujos independientes:

- **Cliente (shell)**: se actualiza solo mediante releases firmadas. Al arrancar, si
  hay una versión nueva, la aplicación avisa y ofrece descargarla e instalarla.
- **Interfaz web**: se actualiza con cada despliegue de tu servidor, sin reinstalar el
  cliente.

La versión del cliente aparece en el diálogo **Acerca de** de la interfaz.

## Desinstalación

- **Linux (.deb)**: `sudo apt remove tolocharadio` (o elimina la AppImage).
- **Windows**: desinstala desde Configuración → Aplicaciones.

## Desarrollo

¿Quieres compilar el cliente tú mismo? Consulta la sección
[Cliente de escritorio (Tauri)](desarrollo.md#cliente-de-escritorio-tauri) en la guía de
desarrollo.
