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
La pantalla de inicio de la aplicación (`/`) SHALL ser pública y mostrar la temática de la Sierra de TolochaRadio: titular, ilustración/fono de la sierra (montañas y radio), botones hacia el inicio de sesión y el registro, y, si el usuario ya tiene sesión, SHALL redirigir automáticamente a su vista inicial por defecto (exploración, favoritos o historial) sin mostrar la portada.

#### Scenario: Invitado en la portada
- **WHEN** un usuario sin sesión abre la aplicación
- **THEN** ve la portada temática con llamadas a la acción de iniciar sesión o registrarse

#### Scenario: Acceso desde la portada
- **WHEN** un usuario en la portada pulsa el acceso a iniciar sesión o a registrarse
- **THEN** se muestra la pantalla correspondiente de autenticación

#### Scenario: Usuario autenticado en la portada
- **WHEN** un usuario con sesión abierta abre la raíz (`/`)
- **THEN** es redirigido automáticamente a su vista inicial por defecto (`/explorar`, `/favoritos` o `/historial`) en lugar de ver la portada

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
La interfaz SHALL mostrar un reproductor fijo en la parte inferior, visible en todas las vistas mientras haya una sesión abierta, que muestre la emisora en reproducción (o la última seleccionada) con controles de reproducir/pausar, volumen y eliminar/cambiar emisora. Cuando haya una emisora seleccionada, el reproductor SHALL mostrar la información técnica de la emisora (bitrate y formato/códec de audio, cuando estén disponibles) y SHALL ofrecer un botón para copiar el enlace de emisión al portapapeles. La reproducción SHALL continuar al cambiar de vista. Cuando exista un título actual de la emisora en reproducción, el reproductor SHALL mostrarlo bajo el nombre de la emisora precedido de "Ahora suena", en lugar de país/idioma; los mensajes de estado (reconexión o error) SHALL tener prioridad sobre él. En pantallas de smartphones (menores de 640px), el reproductor SHALL simplificarse: se oculta el botón de copiar enlace y la información técnica (bitrate/codec), mostrando únicamente la miniatura, el nombre de la emisora, país/idioma (o el título actual cuando exista), y los controles de play/pause y stop. El control de volumen ya se oculta en este rango de pantalla.

#### Scenario: Reproductor siempre disponible
- **WHEN** un usuario navega entre secciones con el reproductor activo
- **THEN** el reproductor permanece visible y la música no se interrumpe

#### Scenario: Controles del reproductor
- **WHEN** un usuario usa reproducir, pausar o el control de volumen
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
- **THEN** el reproductor muestra únicamente la miniatura de la emisora, el nombre, país/idioma (o el título actual cuando exista), y los controles play/pause y stop, sin botón de copiar enlace ni información técnica (bitrate/codec)

#### Scenario: Estado vacío del reproductor en móvil
- **WHEN** el usuario no ha seleccionado ninguna emisora y ve la aplicación en una pantalla menor a 640px
- **THEN** el reproductor muestra un mensaje conciso de una línea invitando a elegir una emisora

#### Scenario: Título actual disponible
- **WHEN** la emisora en reproducción tiene un título actual válido
- **THEN** el reproductor muestra bajo el nombre "Ahora suena" seguido del título, recortado con puntos suspensivos si no cabe y con el texto completo accesible al pasar el ratón

#### Scenario: Sin título actual
- **WHEN** la emisora en reproducción no tiene título actual
- **THEN** el reproductor muestra país/idioma como hasta ahora

#### Scenario: Estado prioritario sobre el título
- **WHEN** el reproductor está reconectando o ha fallado y existe un título actual
- **THEN** el reproductor muestra el mensaje de estado en lugar del título

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
La interfaz SHALL ofrecer, para usuarios autenticados, un control en la cabecera que alterna entre dos modos de presentación de las emisoras: el modo tarjeta (rejilla responsive de tarjetas, el modo actual por defecto) y el modo lista (filas densas con los datos y acciones de la emisora). El modo seleccionado SHALL aplicarse globalmente a todas las vistas que listan emisoras del usuario — exploración/búsqueda, favoritos e historial — y SHALL mantenerse al navegar entre ellas. La aplicación SHALL recordar el modo elegido en el dispositivo (localStorage) y aplicarlo al recargar la página. El modo tarjeta SHALL ser el predeterminado cuando no exista una preferencia guardada. El control de modo de vista SHALL estar visible y accesible tanto en pantallas de escritorio (>= 640px) como en pantallas de smartphones (< 640px). En dispositivos móviles, el control SHALL mostrarse en la cabecera de forma accesible, ya sea directamente visible junto al logotipo o integrado en el menú hamburguesa de manera que el usuario pueda alternar entre modos sin salir de la pantalla actual.

#### Scenario: Alternar modo desde la cabecera
- **WHEN** un usuario autenticado pulsa el control de modo de vista en la cabecera
- **THEN** la presentación de las emisoras alterna entre tarjeta (rejilla) y lista en todas las vistas que la usan

#### Scenario: Alternar modo en móvil
- **WHEN** un usuario autenticado visualiza la aplicación en una pantalla menor a 640px de ancho y pulsa el control de modo de vista
- **THEN** la presentación de las emisoras alterna entre tarjeta y lista en todas las vistas que la usan

#### Scenario: Control accesible en móvil
- **WHEN** un usuario autenticado visualiza la aplicación en una pantalla menor a 640px de ancho
- **THEN** el control de modo de vista es visible y accesible sin necesidad de desplazarse fuera de la pantalla actual

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

### Requirement: Modo de vista de podcasts (tarjeta/lista)

Los listados de podcasts (`/podcasts` y `/podcasts/suscripciones`) SHALL respetar el modo global tarjeta/lista. En `/podcasts`, «Tus podcasts», «Continuar escuchando» y «Novedades» SHALL cambiar de presentación: tarjeta usa rejilla responsive (episodios en dos columnas en pantallas anchas) y lista usa una sola columna densa. En modo lista, cada podcast muestra portada, título, autor, episodios, estado de suscripción y la acción contextual. El modo tarjeta SHALL ser el predeterminado.

#### Scenario: Alternar modo desde la cabecera en podcasts
- **WHEN** un usuario autenticado está en una vista de podcasts y pulsa el control de modo de vista de la cabecera
- **THEN** los listados de podcasts alternan entre la rejilla de tarjetas y las filas de lista

#### Scenario: Aplicación global entre radio y podcasts
- **WHEN** un usuario cambia al modo lista en las vistas de radio y navega a cualquiera de los listados de podcasts
- **THEN** dichos listados muestran los podcasts en modo lista sin repetir la elección

#### Scenario: Vista de tarjeta de podcasts
- **WHEN** un usuario autenticado está en modo tarjeta
- **THEN** los podcasts se muestran en la rejilla responsive de tarjetas con portada, título, autor y número de episodios, y «Continuar escuchando» y «Novedades» usan dos columnas en pantallas anchas

#### Scenario: Vista de lista de podcasts
- **WHEN** un usuario autenticado está en modo lista
- **THEN** cada podcast se muestra como una fila densa con portada, título, autor, número de episodios y estado de suscripción, y «Continuar escuchando» y «Novedades» usan una sola columna

#### Scenario: Portada completa en modo lista
- **WHEN** un usuario autenticado abre `/podcasts` en modo lista
- **THEN** «Tus podcasts» muestra filas y «Continuar escuchando» y «Novedades» muestran sus episodios en una sola columna

#### Scenario: Acción contextual en ambos modos
- **WHEN** un usuario autenticado ve sus suscripciones en modo tarjeta o en modo lista
- **THEN** cada podcast ofrece la misma acción de cancelar suscripción en ambas presentaciones

#### Scenario: Coherencia entre portada y suscripciones
- **WHEN** un usuario autenticado alterna el modo de vista y recorre `/podcasts` y `/podcasts/suscripciones`
- **THEN** ambos listados usan el mismo modo elegido sin desincronizarse entre sí

#### Scenario: Preferencia recordada en podcasts
- **WHEN** un usuario autenticado elige un modo de vista en una vista de podcasts y recarga la página o vuelve a entrar en ese dispositivo
- **THEN** la aplicación conserva y aplica el modo elegido a los listados de podcasts

#### Scenario: Modo por defecto en podcasts
- **WHEN** un usuario sin preferencia de vista guardada abre una vista de podcasts
- **THEN** los podcasts se muestran en modo tarjeta

### Requirement: Descarte de episodios en «Continuar escuchando»

En `/podcasts`, cada episodio de «Continuar escuchando» SHALL ofrecer una acción de descarte accesible. Al descartarlo, SHALL desaparecer de la sección sin marcarlo como completado ni alterar su progreso, y SHALL mantenerse oculto tras recargar y en otros dispositivos. Si el usuario vuelve a escuchar el episodio y se registra nuevo progreso, SHALL volver a aparecer.

#### Scenario: Descartar un episodio en progreso
- **WHEN** un usuario autenticado pulsa la acción de descarte de un episodio de «Continuar escuchando»
- **THEN** el episodio desaparece de la sección y la portada se actualiza sin recargar

#### Scenario: Descarte persistente entre dispositivos
- **WHEN** un usuario descarta un episodio y abre `/podcasts` en otro dispositivo o tras recargar la página
- **THEN** el episodio sigue sin aparecer en «Continuar escuchando»

#### Scenario: El descarte no altera el progreso
- **WHEN** un usuario descarta un episodio en progreso
- **THEN** su posición, duración y estado de completado se conservan, y el episodio sigue disponible en la ficha del podcast

#### Scenario: Reaparición al reanudar la escucha
- **WHEN** un usuario descarta un episodio y después reproduce y registra nuevo progreso en él
- **THEN** el episodio vuelve a aparecer en «Continuar escuchando»

#### Scenario: Error al descartar
- **WHEN** el descarte falla por un error de red o del servidor
- **THEN** la interfaz muestra un mensaje en español y el episodio permanece en la sección

### Requirement: Indicador de cola en la navegación

Cuando la funcionalidad de podcasts esté activa, el ítem «Cola» de la navegación de Podcasts SHALL mostrar un badge con el número de episodios en cola. El badge SHALL ocultarse cuando el conteo sea cero y SHALL actualizarse al añadir, quitar o avanzar automáticamente la cola. La portada `/podcasts` NO SHALL mostrar una tarjeta de resumen de cola.

#### Scenario: Badge con episodios en cola
- **WHEN** un usuario autenticado tiene episodios en la cola y navega por cualquier vista de podcasts
- **THEN** el ítem «Cola» del menú muestra un badge pequeño con el número de episodios

#### Scenario: Badge oculto con la cola vacía
- **WHEN** la cola del usuario está vacía
- **THEN** el ítem «Cola» no muestra badge

#### Scenario: Actualización del badge
- **WHEN** un usuario añade, quita o deja avanzar automáticamente un episodio de la cola
- **THEN** el badge refleja el nuevo conteo sin recargar la página

#### Scenario: Sin tarjeta de resumen en la portada
- **WHEN** un usuario autenticado abre `/podcasts`
- **THEN** no se muestra el bloque «Cola de reproducción» y el acceso a la cola sigue disponible desde la navegación

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

### Requirement: Vista inicial por defecto configurable
La interfaz SHALL ofrecer en el perfil (`/perfil`) un selector de vista inicial por defecto con las opciones Explorar, Favoritos e Historial, que muestre el valor guardado en el perfil del usuario y permita cambiarlo con confirmación visual. Tras iniciar sesión o registrarse, la interfaz SHALL dirigir al usuario a su vista por defecto. La preferencia guardada en el perfil SHALL ser la única fuente de verdad (sin copia en localStorage) y el valor `explorar` SHALL aplicarse cuando no exista preferencia guardada. Todos los textos del selector SHALL estar en español.

#### Scenario: Selector visible en el perfil
- **WHEN** un usuario autenticado abre su perfil
- **THEN** ve un selector de vista por defecto con las opciones Explorar, Favoritos e Historial marcando su valor actual

#### Scenario: Cambio de vista por defecto
- **WHEN** un usuario autenticado elige otra opción en el selector y la guarda
- **THEN** la preferencia se envía a la API, se confirma visualmente que se ha guardado y el selector refleja el nuevo valor

#### Scenario: Error al guardar la preferencia
- **WHEN** el guardado de la nueva vista por defecto falla (error de red o de validación)
- **THEN** la interfaz muestra un mensaje de error comprensible en español y mantiene el valor anterior en el selector

#### Scenario: Redirección tras iniciar sesión
- **WHEN** un usuario inicia sesión con una vista por defecto de Favoritos o Historial
- **THEN** la aplicación lo dirige directamente a `/favoritos` o `/historial` en lugar de a la portada o a la exploración

#### Scenario: Redirección tras registrarse
- **WHEN** un usuario completa el registro (con vista por defecto `explorar`)
- **THEN** la aplicación lo dirige a `/explorar`

#### Scenario: Vista por defecto sin preferencia guardada
- **WHEN** un usuario autenticado sin preferencia de vista guardada accede o abre la aplicación
- **THEN** la aplicación lo dirige a `/explorar`

### Requirement: Integración con el cliente de escritorio
La interfaz SHALL detectar cuándo se ejecuta dentro del cliente de escritorio de TolochaRadio y, en ese caso, SHALL publicar el estado del reproductor (emisora actual, reproducción/pausa, carga y volumen) y SHALL obedecer comandos de reproducción (reproducir/pausar, detener, volumen) enviados por el contenedor. Fuera del cliente de escritorio, la interfaz SHALL comportarse igual que en navegador y PWA, sin requerir las APIs nativas.

#### Scenario: Publicación del estado del reproductor
- **WHEN** la interfaz se ejecuta dentro del cliente de escritorio y cambia la emisora o el estado de reproducción
- **THEN** comunica el nuevo estado al contenedor para que la bandeja y el centro de medios lo reflejen

#### Scenario: Obediencia de comandos del contenedor
- **WHEN** el contenedor envía un comando de reproducir/pausar, detener o cambiar el volumen
- **THEN** el reproductor de la interfaz aplica ese comando y actualiza su estado visible

#### Scenario: Comportamiento intacto fuera del cliente de escritorio
- **WHEN** la interfaz se abre en un navegador o como PWA instalada
- **THEN** funciona igual que antes, sin depender de APIs nativas ni mostrar errores por su ausencia

#### Scenario: Comando sin emisora seleccionada
- **WHEN** el contenedor envía un comando de reproducción sin que haya una emisora seleccionada
- **THEN** la interfaz ignora el comando de forma segura, sin errores visibles ni cambios de estado inconsistentes

### Requirement: Estado de error y reintento en el reproductor
El reproductor SHALL comunicar en español cuando una emisora no se puede reproducir, SHALL ofrecer una acción para reintentar y SHALL mostrar un estado de reconexión mientras lo intenta. NO SHALL mostrar un indicador de buffering indefinido cuando la reproducción ha fallado.

#### Scenario: Error de reproducción
- **WHEN** una emisora no se puede reproducir
- **THEN** el reproductor muestra un mensaje en español y un botón para reintentar

#### Scenario: Reconexión en curso
- **WHEN** el reproductor está reintentando tras una interrupción
- **THEN** la barra muestra un estado de reconexión distinto del de reproducción normal

#### Scenario: Recuperación
- **WHEN** la emisora vuelve a sonar tras un reintento
- **THEN** el mensaje de error desaparece y el reproductor vuelve al estado normal

#### Scenario: Reintento manual
- **WHEN** el usuario pulsa reintentar tras agotar los reintentos automáticos
- **THEN** el reproductor vuelve a intentar la emisora seleccionada

#### Scenario: Emisora no disponible antes de reproducir
- **WHEN** la comprobación de disponibilidad indica que la emisora no es reproducible
- **THEN** la interfaz lo comunica antes de iniciar la reproducción

### Requirement: Navegación de primer nivel entre Radio y Podcasts
Cuando `features.podcasts` esté activo en `/api/v1/config`, `AppShell` SHALL mostrar un selector `Radio | Podcasts` en escritorio y móvil. En `Radio` SHALL mostrar las vistas de radio (`/explorar`, `/favoritos`, `/historial`, `/estadisticas`, `/mis-emisoras`, con alias `/radio/*`); en `Podcasts`, las de podcasts (`/podcasts/*`). Si `features.podcasts` es `false`, el selector y las rutas de podcasts SHALL ocultarse.

#### Scenario: Cambio de sección sin interrumpir el audio
- **WHEN** un usuario autenticado con audio en reproducción cambia entre `Radio` y `Podcasts` en la cabecera
- **THEN** la barra de navegación contextual cambia a las vistas de la sección elegida y la reproducción activa continúa sin cortes

#### Scenario: Redirección de alias `/radio/*` a rutas canónicas
- **WHEN** un usuario accede a `/radio/explorar` o `/radio/favoritos`
- **THEN** el router redirige de forma transparente a `/explorar` o `/favoritos` conservando la compatibilidad con marcadores y el cliente de escritorio

### Requirement: Sección inicial por defecto configurable (`defaultSection`)
El perfil de usuario (`/perfil` y `PATCH /api/v1/users/me`) SHALL permitir elegir la sección inicial por defecto (`defaultSection`: `"radio"` o `"podcasts"`, con `"radio"` como valor predeterminado). Cuando el usuario autenticado acceda a `/` o inicie sesión, SHALL ser redirigido a `/podcasts` si su `defaultSection` es `"podcasts"`, o a su `defaultView` de radio (`/explorar`, `/favoritos` o `/historial`) si su `defaultSection` es `"radio"`.

#### Scenario: Usuario con sección inicial en Podcasts
- **WHEN** un usuario autenticado con `defaultSection: "podcasts"` abre `/` o inicia sesión
- **THEN** la aplicación lo redirige automáticamente a `/podcasts`

### Requirement: Respuesta a la pulsación en botones
La interfaz SHALL dar respuesta visual inmediata a la pulsación en los botones principales (reproducir en tarjeta y fila, favorito, copiar enlace, reintentar, controles del reproductor y toggles de cabecera) mediante una reducción de escala breve al presionar.

#### Scenario: Pulsar reproducir en una tarjeta
- **WHEN** el usuario presiona el botón de reproducir de una tarjeta de emisora
- **THEN** el botón se reduce visualmente durante la pulsación y vuelve a su tamaño al soltar

#### Scenario: Pulsar control del reproductor
- **WHEN** el usuario presiona reproducir/pausar o detener en el reproductor
- **THEN** el botón muestra la misma respuesta de escala breve sin retrasar la acción

### Requirement: Elevación y zoom en tarjetas de emisoras
Las tarjetas de emisoras SHALL elevarse ligeramente y ampliar su imagen de forma suave al pasar el puntero o enfocarlas con teclado, manteniendo la legibilidad y el layout existente.

#### Scenario: Enfocar una tarjeta con el ratón
- **WHEN** el puntero está sobre una tarjeta de emisora
- **THEN** la tarjeta se eleva unos píxeles, intensifica su sombra y su imagen se amplía suavemente

#### Scenario: Enfocar una tarjeta con teclado
- **WHEN** el usuario navega con teclado hasta una tarjeta o su botón de reproducir
- **THEN** se muestra el mismo énfasis visual que con el ratón

### Requirement: Animación del botón de favorito
El botón de favorito SHALL animarse con un "pop" breve (ampliación y retorno) al añadir o quitar una emisora de favoritos, además del cambio de color y relleno actual.

#### Scenario: Añadir a favoritos
- **WHEN** el usuario añade una emisora a favoritos
- **THEN** el corazón muestra una ampliación breve antes de quedar en estado marcado

#### Scenario: Quitar de favoritos
- **WHEN** el usuario quita una emisora de favoritos
- **THEN** el botón muestra la misma animación breve antes de quedar en estado sin marcar

### Requirement: Entrada y salida animada de menús y diálogos
Los menús desplegables (hamburguesa, menú de usuario), el desplegable del combobox de filtros y el diálogo de confirmación SHALL aparecer y desaparecer con una transición breve de opacidad combinada con escala o deslizamiento corto, en lugar de hacerlo de forma instantánea.

#### Scenario: Abrir el menú hamburguesa
- **WHEN** el usuario abre el menú hamburguesa en móvil
- **THEN** el panel aparece con fundido y deslizamiento corto descendente

#### Scenario: Cerrar un menú
- **WHEN** el usuario elige una opción, pulsa fuera o pulsa Escape
- **THEN** el panel desaparece con la transición inversa breve sin bloquear la navegación

#### Scenario: Abrir el diálogo de confirmación
- **WHEN** se abre un diálogo de confirmación
- **THEN** el fondo se funde y la caja aparece con escala y subida breve

#### Scenario: Abrir el desplegable del combobox
- **WHEN** el usuario abre un combobox de país, idioma o género
- **THEN** la lista aparece con fundido y deslizamiento corto y el chevron rota como hasta ahora

### Requirement: Entrada animada del reproductor y detalle vivo
El reproductor SHALL aparecer con un deslizamiento ascendente breve al elegirse la primera emisora o episodio, y el texto secundario ("Ahora suena" o país/idioma) SHALL transicionar con fundido al cambiar. Cuando haya reproducción en curso, el reproductor SHALL mostrar un ecualizador animado de 3 barras junto al estado.

#### Scenario: Elegir la primera emisora
- **WHEN** el usuario elige una emisora sin reproductor visible
- **THEN** el reproductor entra desde abajo con un deslizamiento breve

#### Scenario: Cambiar de emisora
- **WHEN** cambia la emisora o el título actual durante la reproducción
- **THEN** el texto secundario cambia con un fundido breve sin mover el resto de controles

#### Scenario: Reproducir y pausar
- **WHEN** la reproducción está en curso
- **THEN** se ve el ecualizador animado, y al pausar queda detenido en estado estático

### Requirement: Respeto al movimiento reducido
Todas las animaciones nuevas SHALL desactivarse o reducirse a fundidos instantáneos cuando el sistema indique `prefers-reduced-motion: reduce`, manteniendo intacta la funcionalidad.

#### Scenario: Usuario con movimiento reducido
- **WHEN** el usuario tiene activada la preferencia de movimiento reducido y pulsa un botón o abre un menú
- **THEN** la acción se ejecuta sin escalas, deslizamientos ni ecualizador animado
