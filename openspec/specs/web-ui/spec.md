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
La exploración de emisoras en rejilla SHALL estar disponible únicamente para usuarios con sesión abierta. La pantalla muestra las emisoras en tarjetas responsive (adaptable a móvil y escritorio), cada una con imagen, nombre y acciones rápidas (reproducir y añadir a favoritos). El botón de reproducción SHALL ser siempre visible sobre la imagen de la tarjeta con un fondo semi-transparente, sin depender del hover del ratón. Un usuario sin sesión que intente acceder a la exploración SHALL ser conducido a la portada o al inicio de sesión, sin ver la rejilla. En pantallas de smartphones (menores de 640px), la navegación principal SHALL ocultarse tras un menú hamburguesa para maximizar el espacio disponible para el contenido.

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

### Requirement: Reproductor flotante persistente
La interfaz SHALL mostrar un reproductor fijo en la parte inferior, visible en todas las vistas mientras haya una sesión abierta, que muestre la emisora en reproducción (o la última seleccionada) con controles de reproducir/pausar, siguiente, volumen y eliminar/cambiar emisora. Cuando haya una emisora seleccionada, el reproductor SHALL mostrar la información técnica de la emisora (bitrate y formato/códec de audio, cuando estén disponibles) y SHALL ofrecer un botón para copiar el enlace de emisión al portapapeles. La reproducción SHALL continuar al cambiar de vista. En pantallas de smartphones (menores de 640px), el reproductor SHALL simplificarse: se oculta el botón de copiar enlace y la información técnica (bitrate/codec), mostrando únicamente la miniatura, el nombre de la emisora, país/idioma, y los controles de play/pause, siguiente y stop. El control de volumen ya se oculta en este rango de pantalla.

#### Scenario: Reproductor siempre disponible
- **WHEN** un usuario navega entre secciones con el reproductor activo
- **THEN** el reproductor permanece visible y la música no se interrumpe

#### Scenario: Controles del reproductor
- **WHEN** un usuario usa reproducir, pausar, siguiente o el control de volumen
- **THEN** el reproductor responde de inmediato reflejando el nuevo estado

#### Scenario: Sin nada que reproducir
- **WHEN** el usuario no ha seleccionado ninguna emisora en la sesión
- **THEN** el reproductor aparece en estado vacío o minimizado sin reproducir nada, sin mostrar información técnica

#### Scenario: Información técnica disponible
- **WHEN** una emisora seleccionada en el reproductor tiene bitrate y formato/códec de audio
- **THEN** el reproductor muestra tanto el bitrate (p. ej. "128 kbps") como el formato de audio (p. ej. "MP3", "AAC")

#### Scenario: Información técnica ausente
- **WHEN** la emisora seleccionada en el reproductor no dispone de bitrate o de formato/códec
- **THEN** el reproductor omite el dato faltante y sigue mostrando el resto de la información sin romper el diseño

#### Scenario: Copiar enlace de emisión
- **WHEN** un usuario pulsa el botón de copiar enlace de emisión en el reproductor
- **THEN** la aplicación copia al portapapeles la URL pública del stream de la emisora (`station.url`) y confirma visualmente que se ha copiado

#### Scenario: Reproductor simplificado en móvil
- **WHEN** un usuario ve el reproductor en una pantalla menor a 640px de ancho
- **THEN** el reproductor muestra únicamente la miniatura de la emisora, el nombre, país/idioma, y los controles play/pause, siguiente y stop, sin botón de copiar enlace ni información técnica (bitrate/codec)

#### Scenario: Estado vacío del reproductor en móvil
- **WHEN** el usuario no ha seleccionado ninguna emisora y ve la aplicación en una pantalla menor a 640px
- **THEN** el reproductor muestra un mensaje conciso de una línea invitando a elegir una emisora

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
La interfaz SHALL ofrecer secciones de favoritos e historial que muestren las emisoras del usuario, con acciones de reproducción directa, eliminación de favorito y limpieza de historial, y estados vacíos adecuados. En la vista de historial en modo tarjeta, el botón de eliminar SHALL mostrarse como un overlay fijo en la esquina superior derecha de la tarjeta con un icono de papelera (Trash2), sin deformar el layout de la tarjeta. En modo lista, el botón de eliminar SHALL mostrarse inline a la derecha de la fila.

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

#### Scenario: Botón de eliminar en historial modo tarjeta
- **WHEN** un usuario autenticado ve el historial en modo tarjeta
- **THEN** cada tarjeta muestra un botón con icono de papelera (Trash2) como overlay fijo en la esquina superior derecha, sin deformar la imagen ni el layout de la tarjeta

#### Scenario: Botón de eliminar en historial modo lista
- **WHEN** un usuario autenticado ve el historial en modo lista
- **THEN** cada fila muestra un botón con icono de papelera (Trash2) inline a la derecha

### Requirement: Temática visual de la Sierra de Tolocha
La interfaz SHALL aplicar una identidad visual inspirada en la Sierra de Tolocha: paleta de verdes bosque y ocres de montaña, fondos sutiles con imágenes de bosque de pinos o montañas (sin interferir con la legibilidad), y elementos decorativos discretos coherentes con el tema. La interfaz SHALL ofrecer al usuario un control para alternar entre un tema claro y un tema oscuro, y SHALL aplicar la temática Tolocha de forma coherente y legible en ambos temas. El tema oscuro SHALL ser el predeterminado.

#### Scenario: Paleta y fondos temáticos
- **WHEN** un usuario ve la aplicación
- **THEN** las superficies y fondos utilizan la paleta y las imágenes de montaña/bosque de forma sutil y legible

#### Scenario: Identidad coherente
- **WHEN** un usuario navega por la aplicación
- **THEN** los colores, iconos y detalles decorativos mantienen una coherencia visual con el tema Tolocha en todas las secciones y estados

#### Scenario: Alternancia de tema
- **WHEN** un usuario pulsa el control de tema (sol/luna) en la interfaz
- **THEN** la interfaz alterna entre el tema claro y el oscuro conservando la identidad Tolocha y la legibilidad

#### Scenario: Tema por defecto oscuro
- **WHEN** un usuario sin preferencia guardada abre la aplicación
- **THEN** la interfaz se muestra en tema oscuro

### Requirement: Preferencia de tema recordada
La interfaz SHALL recordar la preferencia de tema del usuario: si hay sesión abierta, la preferencia guardada en el perfil del usuario (proporcionada por la API) SHALL aplicarse y mantenerse al navegar, recargar y volver a entrar; si no hay sesión, la preferencia elegida SHALL persistir en el dispositivo (localStorage) y aplicarse también tras recargar la página. La preferencia del perfil de un usuario con sesión SHALL tener prioridad sobre la del dispositivo.

#### Scenario: Preferencia con sesión abierta
- **WHEN** un usuario autenticado con una preferencia de tema guardada en su perfil abre o recarga la aplicación
- **THEN** la interfaz se muestra en ese tema sin volver a elegir

#### Scenario: Preferencia como invitado
- **WHEN** un usuario sin sesión elige un tema y recarga la página
- **THEN** la interfaz conserva el tema elegido en ese dispositivo

#### Scenario: La preferencia del perfil tiene prioridad
- **WHEN** un usuario inicia sesión y su preferencia de perfil difiere de la guardada en el dispositivo
- **THEN** la interfaz aplica la preferencia del perfil

#### Scenario: Guardado al cambiar con sesión
- **WHEN** un usuario autenticado cambia de tema desde la interfaz
- **THEN** la nueva preferencia se envía a la API y se aplica inmediatamente

### Requirement: Modo de vista de emisoras (tarjeta/lista)
La interfaz SHALL ofrecer, para usuarios autenticados, un control en la cabecera que alterna entre dos modos de presentación de las emisoras: el modo tarjeta (rejilla responsive de tarjetas, el modo actual por defecto) y el modo lista (filas densas con los datos y acciones de la emisora). El modo seleccionado SHALL aplicarse globalmente a todas las vistas que listan emisoras del usuario — exploración/búsqueda, favoritos e historial — y SHALL mantenerse al navegar entre ellas. La aplicación SHALL recordar el modo elegido en el dispositivo (localStorage) y aplicarlo al recargar la página. El modo tarjeta SHALL ser el predeterminado cuando no exista una preferencia guardada.

#### Scenario: Alternar modo desde la cabecera
- **WHEN** un usuario autenticado pulsa el control de modo de vista en la cabecera
- **THEN** la presentación de las emisoras alterna entre tarjeta (rejilla) y lista en todas las vistas que la usan

#### Scenario: Aplicación global entre secciones
- **WHEN** un usuario cambia al modo lista y navega entre explorar, favoritos e historial
- **THEN** las tres secciones muestran las emisoras en modo lista sin repetir la elección

#### Scenario: Vista de tarjeta
- **WHEN** un usuario autenticado está en modo tarjeta
- **THEN** las emisoras se muestran en la rejilla responsive de tarjetas con imagen, nombre y acciones rápidas

#### Scenario: Vista de lista
- **WHEN** un usuario autenticado está en modo lista
- **THEN** cada emisora se muestra como una fila con sus datos (nombre, país, idioma, géneros) y las mismas acciones que la tarjeta (reproducir y añadir/quitar favorito)

#### Scenario: Preferencia recordada
- **WHEN** un usuario autenticado elige un modo de vista y recarga la página o vuelve a entrar en ese dispositivo
- **THEN** la aplicación conserva y aplica el modo elegido

#### Scenario: Modo por defecto
- **WHEN** un usuario sin preferencia de vista guardada abre la aplicación
- **THEN** las emisoras se muestran en modo tarjeta

#### Scenario: Invitado sin control de modo
- **WHEN** un usuario sin sesión ve la aplicación
- **THEN** no ve el control de modo de vista (las emisoras solo se muestran a usuarios autenticados)

### Requirement: Enlace al repositorio de GitHub
La interfaz SHALL mostrar, de forma visible y accesible desde todas las vistas, un enlace con el icono de GitHub que dirija al repositorio del proyecto (`https://www.github.com/izquierdojl/tolocharadio`). El enlace SHALL estar disponible tanto para usuarios con sesión abierta como para invitados, y SHALL abrir el repositorio en una pestaña nueva. El icono y su enlace SHALL mantener el estilo y la coherencia visual del resto de la interfaz.

#### Scenario: Enlace visible en la cabecera
- **WHEN** un usuario ve la aplicación desde cualquier vista
- **THEN** la cabecera muestra el icono de GitHub como enlace al repositorio del proyecto

#### Scenario: Abrir el repositorio
- **WHEN** un usuario pulsa el icono de GitHub
- **THEN** el repositorio se abre en una pestaña nueva del navegador

#### Scenario: Disponible sin sesión
- **WHEN** un usuario sin sesión abierta ve la aplicación
- **THEN** el enlace al repositorio de GitHub sigue visible y operativo