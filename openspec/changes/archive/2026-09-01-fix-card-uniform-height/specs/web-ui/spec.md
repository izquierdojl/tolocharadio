## MODIFIED Requirements

### Requirement: Exploración de emisoras en rejilla
La exploración de emisoras en rejilla SHALL estar disponible únicamente para usuarios con sesión abierta. La pantalla muestra las emisoras en tarjetas responsive (adaptable a móvil y escritorio), cada una con imagen, nombre y acciones rápidas (reproducir y añadir a favoritos). El botón de reproducción SHALL ser siempre visible sobre la imagen de la tarjeta con un fondo semi-transparente, sin depender del hover del ratón. Un usuario sin sesión que intente acceder a la exploración SHALL ser conducido a la portada o al inicio de sesión, sin ver la rejilla. En pantallas de smartphones (menores de 640px), la navegación principal SHALL ocultarse tras un menú hamburguesa para maximizar el espacio disponible para el contenido. Todas las tarjetas en la rejilla SHALL tener altura uniforme, autoajustándose al contenido más alto de la fila, para mantener un diseño visual consistente.

#### Scenario: Rejilla de tarjetas
- **WHEN** un usuario autenticado está en la pantalla de exploración
- **THEN** ve las emisoras dispuestas en tarjetas que se reorganizan según el tamaño de pantalla

#### Scenario: Acciones rápidas en la tarjeta
- **WHEN** un usuario ve una tarjeta de emisora
- **THEN** puede reproducirla o añadirla a favoritos sin salir de la rejilla, siendo el botón de reproducción siempre visible

#### Scenario: Botón de reproducción siempre visible
- **WHEN** un usuario ve una tarjeta o fila de emisora en cualquier dispositivo (desktop o móvil)
- **THEN** el botón de reproducción se muestra siempre sobre la imagen con fondo semi-transparente, sin necesidad de hover

#### Scenario: Invitado no ve la rejilla
- **WHEN** un usuario sin sesión intenta acceder a la exploración
- **THEN** no ve la lista de emisoras ni la búsqueda y es redirigido a la portada o al inicio de sesión

#### Scenario: Navegación con menú hamburguesa en móvil
- **WHEN** un usuario autenticado visualiza la aplicación en una pantalla menor a 640px de ancho
- **THEN** la cabecera muestra únicamente el logotipo a la izquierda y un icono de menú hamburguesa a la derecha, y la navegación (Explorar, Favoritos, Historial, Mis emisoras) se oculta tras el menú hamburguesa

#### Scenario: Apertura del menú hamburguesa
- **WHEN** un usuario toca el icono de menú hamburguesa en la cabecera
- **THEN** se despliega un panel lateral o dropdown con las rutas de navegación, el enlace de GitHub, el control de tema y las acciones de sesión (Perfil, Cerrar sesión)

#### Scenario: Cierre del menú hamburguesa
- **WHEN** el usuario toca fuera del menú hamburguesa o selecciona una opción del menú
- **THEN** el panel se cierra y se muestra la vista seleccionada

#### Scenario: Tarjetas con altura uniforme
- **WHEN** un usuario autenticado ve la rejilla de emisoras con tarjetas que tienen diferente cantidad de tags o texto descriptivo
- **THEN** todas las tarjetas de la fila tienen la misma altura, autoajustándose al contenido más alto, sin que unas tarjetas sean más grandes que otras
