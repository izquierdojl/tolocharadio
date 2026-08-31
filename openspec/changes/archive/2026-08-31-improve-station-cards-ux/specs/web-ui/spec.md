## MODIFIED Requirements

### Requirement: Exploracion de emisoras en rejilla
La exploracion de emisoras en rejilla SHALL estar disponible unicamente para usuarios con sesion abierta. La pantalla muestra las emisoras en tarjetas responsive (adaptable a movil y escritorio), cada una con imagen, nombre y acciones rapidas (reproducir y anadir a favoritos). El boton de reproduccion SHALL ser siempre visible sobre la imagen de la tarjeta con un fondo semi-transparente, sin depender del hover del raton. Un usuario sin sesion que intente acceder a la exploracion SHALL ser conducido a la portada o al inicio de sesion, sin ver la rejilla. En pantallas de smartphones (menores de 640px), la navegacion principal SHALL ocultarse tras un menu hamburguesa para maximizar el espacio disponible para el contenido.

#### Scenario: Rejilla de tarjetas
- **WHEN** un usuario autenticado esta en la pantalla de exploracion
- **THEN** ve las emisoras dispuestas en tarjetas que se reorganizan segun el tamano de pantalla

#### Scenario: Acciones rapidas en la tarjeta
- **WHEN** un usuario ve una tarjeta de emisora
- **THEN** puede reproducirla o anadirla a favoritos sin salir de la rejilla, siendo el boton de reproduccion siempre visible

#### Scenario: Boton de reproduccion siempre visible
- **WHEN** un usuario ve una tarjeta o fila de emisora en cualquier dispositivo (desktop o movil)
- **THEN** el boton de reproduccion se muestra siempre sobre la imagen con fondo semi-transparente, sin necesidad de hover

#### Scenario: Invitado no ve la rejilla
- **WHEN** un usuario sin sesion intenta acceder a la exploracion
- **THEN** no ve la lista de emisoras ni la busqueda y es redirigido a la portada o al inicio de sesion

#### Scenario: Navegacion con menu hamburguesa en movil
- **WHEN** un usuario autenticado visualiza la aplicacion en una pantalla menor a 640px de ancho
- **THEN** la cabecera muestra unicamente el logotipo a la izquierda y un icono de menu hamburguesa a la derecha, y la navegacion (Explorar, Favoritos, Historial, Mis emisoras) se oculta tras el menu hamburguesa

#### Scenario: Apertura del menu hamburguesa
- **WHEN** un usuario toca el icono de menu hamburguesa en la cabecera
- **THEN** se despliega un panel lateral o dropdown con las rutas de navegacion, el enlace de GitHub, el control de tema y las acciones de sesion (Perfil, Cerrar sesion)

#### Scenario: Cierre del menu hamburguesa
- **WHEN** el usuario toca fuera del menu hamburguesa o selecciona una opcion del menu
- **THEN** el panel se cierra y se muestra la vista seleccionada

### Requirement: Vistas de favoritos e historial
La interfaz SHALL ofrecer secciones de favoritos e historial que muestren las emisoras del usuario, con acciones de reproduccion directa, eliminacion de favorito y limpieza de historial, y estados vacios adecuados. En la vista de historial en modo tarjeta, el boton de eliminar SHALL mostrarse como un overlay fijo en la esquina superior derecha de la tarjeta con un icono de papelera (Trash2), sin deformar el layout de la tarjeta. En modo lista, el boton de eliminar SHALL mostrarse inline a la derecha de la fila.

#### Scenario: Ver favoritos
- **WHEN** un usuario autenticado abre la seccion de favoritos
- **THEN** ve sus emisoras guardadas con accion de reproducir y de quitar de favoritos

#### Scenario: Sin favoritos
- **WHEN** un usuario no tiene favoritos
- **THEN** la seccion muestra un estado vacio con invitacion a explorar emisoras

#### Scenario: Ver historial
- **WHEN** un usuario autenticado abre la seccion de historial
- **THEN** ve su historial reciente con reproduccion directa y opcion de limpiarlo

#### Scenario: Sin historial
- **WHEN** un usuario no tiene historial
- **THEN** la seccion muestra un estado vacio indicando que aun no ha escuchado nada

#### Scenario: Boton de eliminar en historial modo tarjeta
- **WHEN** un usuario autenticado ve el historial en modo tarjeta
- **THEN** cada tarjeta muestra un boton con icono de papelera (Trash2) como overlay fijo en la esquina superior derecha, sin deformar la imagen ni el layout de la tarjeta

#### Scenario: Boton de eliminar en historial modo lista
- **WHEN** un usuario autenticado ve el historial en modo lista
- **THEN** cada fila muestra un boton con icono de papelera (Trash2) inline a la derecha
