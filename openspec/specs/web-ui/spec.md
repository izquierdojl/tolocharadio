# Web UI Specification

## Purpose

Interfaz web de TolochaRadio: portada pública con temática de la Sierra de Tolocha y gestión autenticada de la exploración de emisoras (rejilla, búsqueda y filtros), favoritos e historial, consumiendo la API del proyecto.

## Requirements

### Requirement: Interfaz en español
Todos los textos visibles de la interfaz SHALL estar en español, incluidos menús, botones, estados de error y mensajes de la aplicación.

#### Scenario: Textos de la aplicación
- **WHEN** un usuario navega por cualquier pantalla de la aplicación
- **THEN** todos los textos y mensajes de la interfaz se muestran en español

### Requirement: Portada de inicio temática
La pantalla de inicio de la aplicación (`/`) SHALL ser pública y mostrar la temática de la Sierra de TolochaRadio: titular, ilustración/fono de la sierra (montañas y radio), botones hacia el inicio de sesión y el registro, y, si el usuario ya tiene sesión, un acceso directo a la exploración de emisoras.

#### Scenario: Invitado en la portada
- **WHEN** un usuario sin sesión abre la aplicación
- **THEN** ve la portada temática con llamadas a la acción de iniciar sesión o registrarse

#### Scenario: Acceso desde la portada
- **WHEN** un usuario en la portada pulsa el acceso a iniciar sesión o a registrarse
- **THEN** se muestra la pantalla correspondiente de autenticación

#### Scenario: Usuario autenticado en la portada
- **WHEN** un usuario con sesión abierta está en la portada
- **THEN** puede ir directamente a explorar emisoras

### Requirement: Exploración de emisoras en rejilla
La exploración de emisoras en rejilla SHALL estar disponible únicamente para usuarios con sesión abierta. La pantalla muestra las emisoras en tarjetas responsive (adaptable a móvil y escritorio), cada una con imagen, nombre y acciones rápidas (reproducir y añadir a favoritos). Un usuario sin sesión que intente acceder a la exploración SHALL ser conducido a la portada o al inicio de sesión, sin ver la rejilla.

#### Scenario: Rejilla de tarjetas
- **WHEN** un usuario autenticado está en la pantalla de exploración
- **THEN** ve las emisoras dispuestas en tarjetas que se reorganizan según el tamaño de pantalla

#### Scenario: Acciones rápidas en la tarjeta
- **WHEN** un usuario pasa el cursor o toca una tarjeta de emisora
- **THEN** puede reproducirla o añadirla a favoritos sin salir de la rejilla

#### Scenario: Invitado no ve la rejilla
- **WHEN** un usuario sin sesión intenta acceder a la exploración
- **THEN** no ve la lista de emisoras ni la búsqueda y es redirigido a la portada o al inicio de sesión

### Requirement: Búsqueda y filtros
El sistema SHALL ofrecer en la interfaz una barra de búsqueda por nombre y filtros de país, idioma y género (tipo de emisora) mediante controles combobox con búsqueda directa, que muestran las opciones disponibles del catálogo y permiten escribir para filtrarlas y seleccionarlas, actualizando la rejilla con los resultados obtenidos de la API. La búsqueda y los filtros SHALL estar disponibles únicamente para usuarios autenticados, SIN permitir tampoco que un invitado busque ni filtre.

#### Scenario: Búsqueda por texto
- **WHEN** un usuario autenticado escribe un término en la barra de búsqueda
- **THEN** la rejilla se actualiza con las emisoras que coinciden

#### Scenario: Filtros combinados
- **WHEN** un usuario autenticado combina búsqueda, país, idioma y género
- **THEN** la rejilla muestra las emisoras que cumplen todos los criterios

#### Scenario: Sin resultados
- **WHEN** una búsqueda o filtro no devuelve emisoras
- **THEN** la interfaz muestra un estado vacío comprensible con acción para reintentar o quitar filtros

#### Scenario: Selección de opción en el combobox
- **WHEN** un usuario abre el combobox de país, idioma o género y escribe para buscar una opción
- **THEN** la lista desplegable filtra las opciones disponibles del catálogo y el usuario puede seleccionar una

#### Scenario: Filtrado por género
- **WHEN** un usuario selecciona un género en el filtro
- **THEN** la rejilla muestra únicamente emisoras de ese género

#### Scenario: Opciones del catálogo no disponibles
- **WHEN** no es posible cargar los países, idiomas o géneros disponibles del catálogo
- **THEN** el filtro correspondiente permanece utilizable (permite indicar un valor) y la interfaz comunica el problema sin romper la búsqueda

#### Scenario: Invitado sin búsqueda
- **WHEN** un usuario sin sesión está en la aplicación
- **THEN** no se le muestra la barra de búsqueda ni los filtros de emisoras

### Requirement: Reproductor flotante persistente
La interfaz SHALL mostrar un reproductor fijo en la parte inferior, visible en todas las vistas mientras haya una sesión abierta, que muestre la emisora en reproducción (o la última seleccionada) con controles de reproducir/pausar, siguiente, volumen y eliminar/cambiar emisora. La reproducción SHALL continuar al cambiar de vista.

#### Scenario: Reproductor siempre disponible
- **WHEN** un usuario navega entre secciones con el reproductor activo
- **THEN** el reproductor permanece visible y la música no se interrumpe

#### Scenario: Controles del reproductor
- **WHEN** un usuario usa reproducir, pausar, siguiente o el control de volumen
- **THEN** el reproductor responde de inmediato reflejando el nuevo estado

#### Scenario: Sin nada que reproducir
- **WHEN** el usuario no ha seleccionado ninguna emisora en la sesión
- **THEN** el reproductor aparece en estado vacío o minimizado sin reproducir nada

### Requirement: Autenticación desde la interfaz
La interfaz SHALL ofrecer pantallas de registro e inicio de sesión, gestionar la persistencia de la sesión con tokens (acceso y refresco) y permitir cerrar sesión y ver el perfil. Cuando el registro esté deshabilitado en el servidor, la interfaz SHALL ocultar o indicar la indisponibilidad del registro.

#### Scenario: Registro e inicio de sesión
- **WHEN** un usuario no autenticado accede a la aplicación
- **THEN** puede registrarse o iniciar sesión y al hacerlo obtiene acceso a sus funcionalidades personales

#### Scenario: Sesión persistente
- **WHEN** un usuario recarga la página con una sesión activa o reutiliza un token de refresco vigente
- **THEN** recupera su sesión sin volver a introducir credenciales

#### Scenario: Cierre de sesión
- **WHEN** un usuario autenticado cierra sesión
- **THEN** la interfaz revoca la sesión y muestra el estado de invitado

#### Scenario: Registro deshabilitado
- **WHEN** el servidor tiene el registro desactivado
- **THEN** la interfaz no ofrece registro funcional y lo comunica si el usuario lo intenta

### Requirement: Vistas de favoritos e historial
La interfaz SHALL ofrecer secciones de favoritos e historial que muestren las emisoras del usuario, con acciones de reproducción directa, eliminación de favorito y limpieza de historial, y estados vacíos adecuados.

#### Scenario: Ver favoritos
- **WHEN** un usuario autenticado abre la sección de favoritos
- **THEN** ve sus emisoras guardadas con acción de reproducir y de quitar de favoritos

#### Scenario: Sin favoritos
- **WHEN** un usuario no tiene favoritos
- **THEN** la sección muestra un estado vacío con invitación a explorar emisoras

#### Scenario: Ver historial
- **WHEN** un usuario autenticado abre la sección de historial
- **THEN** ve su historial reciente con reproducción directa y opción de limpiarlo

#### Scenario: Sin historial
- **WHEN** un usuario no tiene historial
- **THEN** la sección muestra un estado vacío indicando que aún no ha escuchado nada

### Requirement: Temática visual de la Sierra de Tolocha
La interfaz SHALL aplicar una identidad visual inspirada en la Sierra de Tolocha: paleta de verdes bosque y ocres de montaña, fondos sutiles con imágenes de bosque de pinos o montañas (sin interferir con la legibilidad), y elementos decorativos discretos coherentes con el tema. SHALL además adoptar un modo oscuro como opción por defecto acorde a un reproductor de audio.

#### Scenario: Paleta y fondos temáticos
- **WHEN** un usuario ve la aplicación
- **THEN** las superficies y fondos utilizan la paleta y las imágenes de montaña/bosque de forma sutil y legible

#### Scenario: Identidad coherente
- **WHEN** un usuario navega por la aplicación
- **THEN** los colores, iconos y detalles decorativos mantienen una coherencia visual con el tema Tolocha en todas las secciones y estados