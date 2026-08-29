## Purpose

Es la interfaz web de TolochaRadio en español: exploración de emisoras en rejilla con búsqueda y filtros, reproductor flotante persistente, vistas de favoritos e historial y una temática visual inspirada en la Sierra de Tolocha (bosque de pinos, montaña, verdes y ocres).

## ADDED Requirements

### Requirement: Interfaz en español
Todos los textos visibles de la interfaz SHALL estar en español, incluidos menús, botones, estados de error y mensajes de la aplicación.

#### Scenario: Textos de la aplicación
- **WHEN** un usuario navega por cualquier pantalla de la aplicación
- **THEN** todos los textos y mensajes de la interfaz se muestran en español

### Requirement: Exploración de emisoras en rejilla
La pantalla principal SHALL mostrar las emisoras en una rejilla de tarjetas responsive (adaptable a móvil y escritorio), cada tarjeta con imagen, nombre y acciones rápidas (reproducir y añadir a favoritos).

#### Scenario: Rejilla de tarjetas
- **WHEN** un usuario está en la pantalla de exploración
- **THEN** ve las emisoras dispuestas en tarjetas que se reorganizan según el tamaño de pantalla

#### Scenario: Acciones rápidas en la tarjeta
- **WHEN** un usuario pasa el cursor o toca una tarjeta de emisora
- **THEN** puede reproducirla o añadirla a favoritos sin salir de la rejilla

### Requirement: Búsqueda y filtros
El sistema SHALL ofrecer en la interfaz una barra de búsqueda por nombre y filtros de país e idioma, actualizando la rejilla con los resultados obtenidos de la API.

#### Scenario: Búsqueda por texto
- **WHEN** un usuario escribe un término en la barra de búsqueda
- **THEN** la rejilla se actualiza con las emisoras que coinciden

#### Scenario: Filtros combinados
- **WHEN** un usuario combina búsqueda, país e idioma
- **THEN** la rejilla muestra las emisoras que cumplen todos los criterios

#### Scenario: Sin resultados
- **WHEN** una búsqueda o filtro no devuelve emisoras
- **THEN** la interfaz muestra un estado vacío comprensible con acción para reintentar o quitar filtros

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