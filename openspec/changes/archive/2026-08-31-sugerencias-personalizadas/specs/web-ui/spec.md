## MODIFIED Requirements

### Requirement: Búsqueda y filtros
El sistema SHALL ofrecer en la interfaz una barra de búsqueda por nombre y filtros de país, idioma y género (tipo de emisora) mediante controles combobox con búsqueda directa, que muestran las opciones disponibles del catálogo y permiten escribir para filtrarlas y seleccionarlas, actualizando la rejilla con los resultados obtenidos de la API. La búsqueda y los filtros SHALL estar disponibles únicamente para usuarios autenticados, SIN permitir tampoco que un invitado busque ni filtre. La interfaz SHALL mostrar, junto a la búsqueda, una fila de sugerencias de género personalizadas del usuario: cada sugerencia es una chip con un género que al pulsarla aplica el filtro de género y actualiza la rejilla. El usuario autenticado SHALL poder añadir una sugerencia eligiendo un género del catálogo y eliminar cualquiera de sus sugerencias desde la propia fila. Si el usuario aún no tiene sugerencias, la fila SHALL mostrarse en un estado que invite a añadir la primera.

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

#### Scenario: Sugerencia que aplica el filtro de género
- **WHEN** un usuario autenticado pulsa una chip de sugerencia de género
- **THEN** la rejilla se actualiza mostrando únicamente las emisoras de ese género

#### Scenario: Añadir una sugerencia de género
- **WHEN** un usuario autenticado añade una sugerencia eligiendo un género del catálogo
- **THEN** la sugerencia aparece en la fila de sugerencias y queda guardada en su cuenta

#### Scenario: Eliminar una sugerencia
- **WHEN** un usuario autenticado elimina una de sus sugerencias de género
- **THEN** la sugerencia desaparece de la fila y queda eliminada de su cuenta

#### Scenario: Sin sugerencias guardadas
- **WHEN** un usuario autenticado sin sugerencias guardadas ve la exploración
- **THEN** la fila de sugerencias muestra un estado que invita a añadir su primera sugerencia

#### Scenario: Opciones del catálogo no disponibles
- **WHEN** no es posible cargar los países, idiomas o géneros disponibles del catálogo
- **THEN** el filtro correspondiente permanece utilizable (permite indicar un valor) y la interfaz comunica el problema sin romper la búsqueda

#### Scenario: Invitado sin búsqueda
- **WHEN** un usuario sin sesión está en la aplicación
- **THEN** no se le muestra la barra de búsqueda, los filtros de emisoras ni la fila de sugerencias