## MODIFIED Requirements

### Requirement: Búsqueda y filtros
El sistema SHALL ofrecer en la interfaz una barra de búsqueda por nombre y filtros de país, idioma y género (tipo de emisora) mediante controles combobox con búsqueda directa, que muestran las opciones disponibles del catálogo y permiten escribir para filtrarlas y seleccionarlas, actualizando la rejilla con los resultados obtenidos de la API.

#### Scenario: Búsqueda por texto
- **WHEN** un usuario escribe un término en la barra de búsqueda
- **THEN** la rejilla se actualiza con las emisoras que coinciden

#### Scenario: Filtros combinados
- **WHEN** un usuario combina búsqueda, país, idioma y género
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