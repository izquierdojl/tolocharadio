## MODIFIED Requirements

### Requirement: Cliente de escritorio en ventana propia
La aplicación SHALL ofrecer una ventana de escritorio nativa que muestre la interfaz de un servidor TolochaRadio, con título e icono propios, en Windows y Linux. La ventana NO SHALL mostrar una barra de menú superior propia; las acciones de la aplicación se ofrecen desde la bandeja del sistema. La ventana SHALL cargar la interfaz desde el propio servidor configurado para mantener el mismo origen.

#### Scenario: Arranque con servidor configurado
- **WHEN** el usuario abre la aplicación con una URL de servidor válida guardada
- **THEN** la ventana carga la interfaz de ese servidor en una ventana de aplicación propia, sin barra de menú ni chrome de navegador

#### Scenario: Reproducción dentro de la ventana
- **WHEN** el usuario reproduce una emisora desde la ventana de escritorio
- **THEN** la reproducción y el proxy de audio funcionan igual que en el navegador, sin requerir cambios en el servidor

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

## ADDED Requirements

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
