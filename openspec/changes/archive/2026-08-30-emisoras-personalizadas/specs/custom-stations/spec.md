## Purpose

Permite a cada usuario autenticado crear, listar y eliminar sus propias emisoras de radio personalizadas a partir de un nombre y una URL de stream, aisladas por cuenta y reproducibles a través del proxy de playback de TolochaRadio sin imagen propia (se usa el emblema de la aplicación).

## ADDED Requirements

### Requirement: Crear emisora personalizada
Un usuario autenticado SHALL poder crear una emisora personalizada aportando un nombre y una URL de stream válida. El nombre SHALL ser no vacío y la URL SHALL ser una URL HTTP(S) válida. El sistema SHALL asignar un identificador único a la emisora y devolverla creada. El nombre y la URL SHALL sanearse antes de almacenarse (sin contenido inyectable) y la URL SHALL normalizarse.

#### Scenario: Creación exitosa
- **WHEN** un usuario autenticado envía un nombre no vacío y una URL de stream HTTP(S) válida
- **THEN** el sistema crea la emisora personalizada, le asigna un identificador único y la devuelve con sus datos

#### Scenario: Nombre vacío
- **WHEN** un usuario envía un nombre vacío o solo con espacios
- **THEN** el sistema responde con un error de validación y no crea la emisora

#### Scenario: URL inválida
- **WHEN** un usuario envía una URL de stream no HTTP(S) o malformada
- **THEN** el sistema responde con un error de validación y no crea la emisora

#### Scenario: Sin autenticación
- **WHEN** una solicitud sin sesión intenta crear una emisora personalizada
- **THEN** el sistema responde con un error 401

### Requirement: Listar emisoras personalizadas
Un usuario autenticado SHALL poder listar todas sus emisoras personalizadas. Cada emisora SHALL incluir su identificador, nombre, URL de stream y un marcador que indique que es personalizada (no posee imagen propia). Las emisoras SHALL devolverse en orden de creación (más recientes primero).

#### Scenario: Listado de mis emisoras
- **WHEN** un usuario autenticado consulta sus emisoras personalizadas
- **THEN** el sistema devuelve únicamente las suyas, con sus datos y el marcado de personalizada, ordenadas por creación

#### Scenario: Sin emisoras personalizadas
- **WHEN** un usuario autenticado que aún no ha creado emisoras consulta su lista
- **THEN** el sistema devuelve una lista vacía

#### Scenario: Aislamiento entre cuentas
- **WHEN** un usuario consulta sus emisoras personalizadas
- **THEN** nunca aparecen emisoras personalizadas de otros usuarios

### Requirement: Eliminar emisora personalizada
Un usuario autenticado SHALL poder eliminar una de sus emisoras personalizadas por su identificador. Eliminar una emisora que no es suya o que no existe SHALL tratarse como éxito (sin error) sin revelar datos ajenos. Al eliminar una emisora personalizada, el sistema SHALL quitarla también de los favoritos e historial asociados a la cuenta.

#### Scenario: Emisora eliminada
- **WHEN** un usuario autenticado elimina una de sus emisoras personalizadas
- **THEN** el sistema la elimina y devuelve confirmación, y la retira de sus favoritos e historial

#### Scenario: Emisora ajena o inexistente
- **WHEN** un usuario intenta eliminar una emisora personalizada que no es suya o que no existe
- **THEN** el sistema responde como éxito sin modificar nada

### Requirement: Reproducción de emisora personalizada
Una emisora personalizada SHALL poder reproducirse a través del proxy de playback de la aplicación del mismo modo que las emisoras del catálogo, usando su URL de stream como origen.

#### Scenario: Reproducción de mi emisora
- **WHEN** un usuario autenticado reproduce una de sus emisoras personalizadas vía el proxy de playback
- **THEN** el proxy reenvía el stream de la emisora usando su URL almacenada

#### Scenario: Reproducción de emisora ajena
- **WHEN** un usuario intenta reproducir una emisora personalizada de otra cuenta
- **THEN** el sistema responde como si no existiera (sin revelar la emisora ajena)

### Requirement: Integración con favoritos e historial
Una emisora personalizada SHALL poder añadirse a los favoritos y aparecer en el historial del usuario, igual que una emisora del catálogo, y su representación SHALL usar el emblema de TolochaRadio al no disponer de imagen propia.

#### Scenario: Añadir mi emisora a favoritos
- **WHEN** un usuario autenticado añade una de sus emisoras personalizadas a favoritos
- **THEN** la emisora se guarda en sus favoritos y se muestra con el emblema Tolocha en lugar de una imagen propia

#### Scenario: Captura de reproducción en historial
- **WHEN** un usuario reproduce una de sus emisoras personalizadas
- **THEN** la emisora se registra en su historial igual que cualquier otra
