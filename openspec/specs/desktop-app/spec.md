# Desktop App Specification

## Purpose

Cliente de escritorio nativo de TolochaRadio para Windows y Linux (con macOS previsto): una ventana de aplicación que consume un servidor TolochaRadio autoalojado y añade integración con el sistema operativo (bandeja, controles multimedia, atajos globales y autoactualización) reutilizando la interfaz web existente.

## Requirements

### Requirement: Cliente de escritorio en ventana propia
La aplicación SHALL ofrecer una ventana de escritorio nativa que muestre la interfaz de un servidor TolochaRadio, con título e icono propios, en Windows y Linux. La ventana NO SHALL mostrar una barra de menú superior propia; las acciones de la aplicación se ofrecen desde la bandeja del sistema. La ventana SHALL cargar la interfaz desde el propio servidor configurado para mantener el mismo origen.

#### Scenario: Arranque con servidor configurado
- **WHEN** el usuario abre la aplicación con una URL de servidor válida guardada
- **THEN** la ventana carga la interfaz de ese servidor en una ventana de aplicación propia, sin barra de menú ni chrome de navegador

#### Scenario: Reproducción dentro de la ventana
- **WHEN** el usuario reproduce una emisora desde la ventana de escritorio
- **THEN** la reproducción y el proxy de audio funcionan igual que en el navegador, sin requerir cambios en el servidor

### Requirement: Configuración de la URL del servidor
En el primer arranque, si no hay servidor configurado, la aplicación SHALL mostrar una pantalla local que solicite la URL del servidor TolochaRadio y la SHALL validar antes de guardarla. La configuración SHALL persistir en el dispositivo y SHALL poder modificarse posteriormente desde la propia aplicación.

#### Scenario: Primer arranque sin configuración
- **WHEN** el usuario abre la aplicación por primera vez
- **THEN** ve una pantalla local que le pide la URL de su servidor TolochaRadio y no se carga ninguna interfaz remota hasta guardarla

#### Scenario: URL no válida
- **WHEN** el usuario introduce una URL mal formada o un servidor que no responde
- **THEN** la aplicación muestra un mensaje de error comprensible en español y no guarda la configuración

#### Scenario: Cambio de servidor
- **WHEN** el usuario abre la configuración y guarda otra URL de servidor
- **THEN** la aplicación carga la interfaz del nuevo servidor y conserva la elección para próximos arranques

### Requirement: Sesión y datos compartidos con el servidor
La aplicación SHALL autenticar al usuario contra el servidor configurado usando el mismo mecanismo de sesión que la web (cookies httpOnly emitidas por el servidor), de modo que la cuenta, los favoritos, el historial y las estadísticas sean los mismos que en navegador, PWA y la app Android. La aplicación NO SHALL crear ni mantener una base de datos local de datos de usuario.

#### Scenario: Inicio de sesión
- **WHEN** el usuario inicia sesión en la ventana de escritorio
- **THEN** accede a su cuenta del servidor y ve sus favoritos, historial y estadísticas

#### Scenario: Sesión persistente entre reinicios
- **WHEN** el usuario cierra y vuelve a abrir la aplicación con una sesión vigente en el servidor
- **THEN** recupera su sesión sin volver a introducir credenciales

#### Scenario: Datos coherentes con otros clientes
- **WHEN** el usuario guarda una emisora como favorita desde la ventana de escritorio
- **THEN** esa emisora aparece también como favorita en su cuenta desde navegador, PWA o la app Android

### Requirement: Bandeja del sistema
La aplicación SHALL mostrar un icono en la bandeja del sistema con un menú que incluya: mostrar/ocultar la ventana, el submenú de la emisora en reproducción, los submenús de secciones y favoritos, y salir. El icono SHALL usar el nombre de la emisora en reproducción como información (tooltip). Cerrar la ventana SHALL mantener la aplicación activa en la bandeja, salvo cuando el usuario elija salir explícitamente.

#### Scenario: Cerrar a la bandeja
- **WHEN** el usuario cierra la ventana de la aplicación
- **THEN** la reproducción continúa y la aplicación permanece accesible desde el icono de la bandeja del sistema

#### Scenario: Control desde la bandeja
- **WHEN** el usuario elige reproducir/pausar, detener, subir volumen, bajar volumen o silenciar en el submenú de la emisora en reproducción
- **THEN** el reproductor de la interfaz responde a esa acción y el submenú refleja el nuevo estado (nivel de volumen y texto de silencio)

#### Scenario: Emisora actual en la bandeja
- **WHEN** hay una emisora en reproducción
- **THEN** el icono de la bandeja muestra el nombre de esa emisora como información o tooltip

#### Scenario: Salir desde la bandeja
- **WHEN** el usuario elige salir en el menú de la bandeja
- **THEN** la aplicación se cierra por completo y deja de reproducir

### Requirement: Controles multimedia del sistema operativo
La aplicación SHALL integrarse con los controles multimedia del sistema (MPRIS en Linux, SMTC en Windows) exponiendo reproducir/pausar y detener, y SHALL reflejar el estado y los metadatos de la emisora actual (nombre e imagen cuando estén disponibles) en el centro de medios del sistema. Las teclas multimedia de reproducir/pausar y detener SHALL actuar sobre el reproductor aunque la ventana esté oculta o no tenga el foco.

#### Scenario: Reproducir desde teclas multimedia
- **WHEN** el usuario usa la tecla multimedia de reproducir/pausar con la aplicación en segundo plano o con la ventana oculta
- **THEN** la emisora se reproduce o se pausa, el estado se refleja en la ventana y en la bandeja

#### Scenario: Metadatos en el centro de medios
- **WHEN** hay una emisora en reproducción
- **THEN** el centro de medios del sistema muestra el nombre y, si está disponible, la imagen de la emisora

### Requirement: Atajos globales
La aplicación SHALL ofrecer atajos de teclado globales para reproducir/pausar, detener, subir volumen, bajar volumen y silenciar, operativos aunque la ventana no tenga el foco. Los atajos SHALL mostrarse junto a su acción en el menú de la bandeja. Si el entorno no permite registrar un atajo (por ejemplo, Wayland), la aplicación SHALL seguir funcionando sin error bloqueante y el atajo NO SHALL aparecer como disponible.

#### Scenario: Atajo con la ventana oculta
- **WHEN** el usuario pulsa el atajo global de reproducir/pausar con la ventana oculta
- **THEN** la reproducción cambia de estado y la bandeja refleja el nuevo estado

#### Scenario: Atajo de volumen
- **WHEN** el usuario pulsa el atajo global de subir o bajar volumen
- **THEN** el volumen del reproductor de la aplicación cambia en un paso y se refleja en la interfaz

#### Scenario: Consulta de atajos
- **WHEN** el usuario abre el menú de la bandeja
- **THEN** ve las acciones de reproducción y volumen con sus atajos asociados cuando estén disponibles

#### Scenario: Atajo no disponible
- **WHEN** el entorno no permite registrar un atajo global
- **THEN** la aplicación arranca sin error y la acción sigue disponible desde el menú de la bandeja

### Requirement: Autoactualización del cliente
La aplicación SHALL comprobar actualizaciones firmadas de su propio binario en las releases del proyecto, informar al usuario cuando haya una versión nueva, descargarla e instalarla a petición suya y reiniciar la aplicación. Un fallo al comprobar actualizaciones NO SHALL impedir el uso normal de la aplicación.

#### Scenario: Actualización disponible
- **WHEN** existe una versión más reciente del cliente publicada
- **THEN** la aplicación avisa al usuario y le ofrece descargar e instalar la actualización, reiniciando al completarse

#### Scenario: Cliente al día
- **WHEN** el usuario tiene la última versión del cliente
- **THEN** la aplicación no muestra ningún aviso de actualización

#### Scenario: Fallo de comprobación
- **WHEN** la comprobación de actualizaciones falla por falta de red o error del servicio
- **THEN** la aplicación sigue funcionando con normalidad y no muestra un error bloqueante

### Requirement: Gestión de servidor no disponible
La aplicación SHALL mostrar una pantalla local de error, en lugar de una ventana en blanco, cuando el servidor configurado no esté accesible, ofreciendo reintentar la conexión y cambiar la URL del servidor. La pantalla SHALL indicar el estado en español.

#### Scenario: Servidor caído al arrancar
- **WHEN** la aplicación se abre y el servidor configurado no responde
- **THEN** se muestra una pantalla local de error con acciones de reintentar y cambiar la URL

#### Scenario: Servidor recuperado
- **WHEN** el usuario pulsa reintentar tras restablecerse el servidor
- **THEN** la aplicación carga la interfaz del servidor sin necesidad de reiniciarla

### Requirement: Instancia única
La aplicación SHALL permitir una sola instancia en ejecución. Si el usuario intenta abrirla de nuevo, SHALL enfocar la ventana existente en lugar de iniciar otra instancia.

#### Scenario: Segundo lanzamiento
- **WHEN** el usuario abre la aplicación estando ya en ejecución
- **THEN** se muestra y enfoca la ventana existente, sin abrir una segunda ventana ni duplicar la reproducción

### Requirement: Enlaces externos en el navegador del sistema
La aplicación SHALL abrir los enlaces a sitios externos (por ejemplo, el repositorio del proyecto) en el navegador predeterminado del sistema, en lugar de navegar dentro de la ventana de la aplicación.

#### Scenario: Apertura de enlace externo
- **WHEN** el usuario pulsa un enlace a un sitio externo en la interfaz
- **THEN** el enlace se abre en el navegador predeterminado del sistema y la ventana de la aplicación permanece en la interfaz del servidor

### Requirement: Distribución e instaladores
El proyecto SHALL publicar instaladores oficiales del cliente para Linux (`.deb`/AppImage) y Windows (MSI/NSIS) en las releases de GitHub, junto con los artefactos que permiten la autoactualización, y el frontend SHALL actualizarse con cada despliegue del servidor sin requerir recompilar ni reinstalar el cliente.

#### Scenario: Instalación en Linux y Windows
- **WHEN** un usuario descarga la release en Linux o Windows
- **THEN** dispone de un instalador o paquete para su sistema que instala la aplicación

#### Scenario: Actualización del frontend sin reinstalar
- **WHEN** el servidor configura un nuevo despliegue de la interfaz web
- **THEN** la aplicación muestra la interfaz actualizada sin necesidad de actualizar el cliente

#### Scenario: Versión coherente
- **WHEN** se publica una release del proyecto
- **THEN** la versión del cliente de escritorio queda sincronizada con la versión del monorepo y visible en la interfaz

### Requirement: Secciones principales en el menú de la bandeja
La bandeja del sistema SHALL ofrecer accesos directos a las secciones principales de la interfaz (explorar/búsqueda, favoritos, historial y estadísticas). Al elegir una sección, la aplicación SHALL mostrar la ventana y navegar a esa sección del servidor configurado.

#### Scenario: Abrir una sección desde la bandeja
- **WHEN** el usuario elige "Historial" en el menú de la bandeja
- **THEN** la ventana se muestra y la interfaz navega a la sección de historial del servidor configurado

#### Scenario: Ventana oculta
- **WHEN** el usuario elige una sección estando la ventana oculta
- **THEN** la ventana se muestra y enfoca la sección elegida

### Requirement: Submenú de favoritos en la bandeja
La bandeja del sistema SHALL incluir un submenú "Favoritos" que lista las emisoras favoritas de la cuenta del usuario. Seleccionar una emisora SHALL iniciar su reproducción. La lista SHALL actualizarse cuando el usuario cambie sus favoritos desde la interfaz. La aplicación NO SHALL persistir la lista de favoritos en el dispositivo fuera de la sesión en memoria.

#### Scenario: Listado de favoritos
- **WHEN** el usuario abre el submenú Favoritos de la bandeja
- **THEN** ve el nombre de cada una de sus emisoras favoritas

#### Scenario: Reproducir un favorito
- **WHEN** el usuario selecciona una emisora en el submenú Favoritos
- **THEN** la emisora comienza a reproducirse y el icono de la bandeja muestra su nombre

#### Scenario: Sin favoritos
- **WHEN** el usuario no tiene emisoras favoritas o no ha iniciado sesión
- **THEN** el submenú Favoritos muestra un mensaje indicándolo en español y no contiene emisoras

#### Scenario: Favorito añadido desde la interfaz
- **WHEN** el usuario añade una emisora a favoritos desde la ventana de escritorio
- **THEN** la emisora aparece en el submenú Favoritos de la bandeja sin reiniciar la aplicación

### Requirement: Control de volumen y silencio del reproductor
La interfaz del reproductor SHALL exponer su volumen y su estado de silencio al shell de escritorio, y SHALL aceptar órdenes de subir volumen, bajar volumen y silenciar/reactivar desde el shell. El control SHALL afectar solo al volumen del reproductor de TolochaRadio, no al volumen del sistema operativo.

#### Scenario: Subir y bajar volumen
- **WHEN** el usuario elige subir o bajar volumen en el submenú de la emisora en reproducción de la bandeja
- **THEN** el volumen del reproductor cambia en un paso, el nuevo valor se muestra en la interfaz y en el submenú "Volumen: N %"

#### Scenario: Submenú sin emisora
- **WHEN** no hay ninguna emisora en reproducción
- **THEN** el submenú de la emisora aparece deshabilitado con el texto "Ninguna emisora en reproducción"

#### Scenario: Silenciar y reactivar
- **WHEN** el usuario elige silenciar y después reactivar el sonido
- **THEN** la reproducción se silencia sin detenerse y al reactivarse recupera el volumen previo

### Requirement: Verificación en Linux y Windows
Las acciones de bandeja, teclas multimedia, controles del centro de medios y atajos globales SHALL verificarse manualmente en Linux y Windows antes de publicar una release, y los resultados SHALL registrarse en la verificación del change.

#### Scenario: Verificación previa a release
- **WHEN** se prepara una release del cliente de escritorio
- **THEN** existe una lista de verificación completada para Linux y Windows que cubre bandeja, teclas multimedia, centro de medios y atajos
