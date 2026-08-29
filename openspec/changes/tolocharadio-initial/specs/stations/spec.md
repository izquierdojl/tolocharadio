## Purpose

Provee el catálogo de emisoras de radio de TolochaRadio, obteniéndolo de la API pública de radio-browser.info con un identificador fijo de aplicación, normalizando los datos y aportando búsqueda, filtrado y detalle con caché y degradación ante fallos.

## ADDED Requirements

### Requirement: Identificación ante radio-browser.info
Todas las llamadas del sistema a la API pública de radio-browser.info SHALL identificarse con un nombre o user-agent de aplicación fijo (`TolochaRadio`), como exige el servicio externo.

#### Scenario: Llamadas identificadas
- **WHEN** el sistema realiza cualquier petición a la API de radio-browser.info
- **THEN** dicha petición incluye la identificación fija de la aplicación TolochaRadio

### Requirement: Búsqueda y listado de emisoras
El sistema SHALL permitir buscar y listar emisoras mediante filtros: texto (nombre), país, idioma, etiquetas (tags) y unicidad (excluir duplicados). Los resultados SHALL llegar paginados, ordenados y saneados.

#### Scenario: Búsqueda por nombre
- **WHEN** un cliente consulta el catálogo con un texto de búsqueda
- **THEN** el sistema devuelve una página de emisoras cuyo nombre coincide con el texto, con sus datos normalizados

#### Scenario: Filtrado combinado
- **WHEN** un cliente aplica varios filtros (p. ej. país e idioma) a la búsqueda
- **THEN** el sistema devuelve únicamente emisoras que cumplen todos los filtros

#### Scenario: Paginación
- **WHEN** los resultados superan el tamaño de página
- **THEN** el sistema devuelve una página de tamaño fijo junto con metadatos de paginación para poder obtener las siguientes

### Requirement: Detalle de emisora
El sistema SHALL permitir consultar el detalle de una emisora concreta por su identificador, incluyendo nombre, URL del stream, imagen, país, idioma, etiquetas y estado de disponibilidad si el origen lo facilita.

#### Scenario: Consulta de detalle
- **WHEN** un cliente solicita el detalle de una emisora existente
- **THEN** el sistema devuelve sus datos completos y normalizados

#### Scenario: Emisora inexistente
- **WHEN** un cliente solicita una emisora que no existe en el catálogo
- **THEN** el sistema responde con un error 404

### Requirement: Normalización de datos externos
El sistema SHALL normalizar y sanear los datos recibidos de radio-browser.info antes de exponerlos: campos obligatorios presentes, valores seguros (sin contenido inyectable) y tipos coherentes. Emisoras sin URL de stream válida SHALL excluirse de los resultados de reproducción.

#### Scenario: Datos saneados
- **WHEN** el sistema recibe datos de una emisora desde radio-browser.info
- **THEN** expone únicamente campos normalizados, con texto saneado y URLs válidas y seguras

#### Scenario: Emisora sin stream válido
- **WHEN** una emisora devuelta por el origen carece de URL de stream válida
- **THEN** el sistema no la ofrece para reproducción y puede excluirla u ocultarla en el listado

### Requirement: Caché y degradación ante fallos del origen
El sistema SHALL cachear las respuestas de radio-browser.info durante un período configurable. Cuando el origen no esté disponible SHALL devolver datos en caché si existen, y si no existen responder con un error 503 con mensaje claro indicando que el catálogo no está disponible temporalmente.

#### Scenario: Respuesta cacheada
- **WHEN** el sistema recibe una respuesta exitosa del origen
- **THEN** la almacena en caché con una TTL configurable y las consultas posteriores dentro de esa ventana pueden servirse desde caché

#### Scenario: Origen no disponible con caché
- **WHEN** radio-browser.info no responde pero existe una copia en caché
- **THEN** el sistema sirve los resultados desde caché, sin interrumpir el servicio

#### Scenario: Origen no disponible sin caché
- **WHEN** radio-browser.info no responde y no existe caché
- **THEN** el sistema responde con un error 503 indicando que el catálogo no está disponible