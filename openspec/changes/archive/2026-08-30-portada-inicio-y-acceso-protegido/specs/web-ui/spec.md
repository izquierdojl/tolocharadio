## ADDED Requirements

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

## MODIFIED Requirements

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
La barra de búsqueda por nombre y los filtros de país, idioma y género SHALL estar disponibles únicamente para usuarios autenticados, SIN permitir tampoco que un invitado busque ni filtre. La rejilla se actualiza con los resultados obtenidos de la API.

#### Scenario: Búsqueda por texto
- **WHEN** un usuario autenticado escribe un término en la barra de búsqueda
- **THEN** la rejilla se actualiza con las emisoras que coinciden

#### Scenario: Filtros combinados
- **WHEN** un usuario autenticado combina búsqueda, país, idioma y género
- **THEN** la rejilla muestra las emisoras que cumplen todos los criterios

#### Scenario: Sin resultados
- **WHEN** una búsqueda o filtro no devuelve emisoras
- **THEN** la interfaz muestra un estado vacío comprensible con acción para reintentar o quitar filtros

#### Scenario: Invitado sin búsqueda
- **WHEN** un usuario sin sesión está en la aplicación
- **THEN** no se le muestra la barra de búsqueda ni los filtros de emisoras