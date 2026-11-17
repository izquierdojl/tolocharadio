# Podcast Library Specification

## Purpose

Gestión de la biblioteca personal de podcasts del usuario en TolochaRadio: cola de reproducción sincronizada entre dispositivos con control optimista de concurrencia, episodios favoritos, panel de inicio agregado y pantallas web de exploración y reproducción de podcasts.


## Requirements


### Requirement: Cola de reproducción sincronizada con revisión optimista
El sistema SHALL mantener en el servidor una cola ordenada de episodios por usuario (máximo `podcastQueueMax = 200`, sin duplicados) con un número de versión entero (`revision`). Los usuarios autenticados SHALL poder consultar la cola (`GET /api/v1/podcasts/queue`), añadir un episodio al final o como siguiente (`POST /api/v1/podcasts/queue`), quitar un episodio (`DELETE /api/v1/podcasts/queue/:episodeId`) y reordenar la cola (`PUT /api/v1/podcasts/queue/order`) enviando `baseRevision`.

#### Scenario: Añadir y reordenar la cola con revisión vigente
- **WHEN** un usuario añade episodios a su cola y envía `PUT /api/v1/podcasts/queue/order` con un `baseRevision` que coincide con la revisión actual del servidor
- **THEN** el servidor persiste el nuevo orden, incrementa `revision` y devuelve la cola actualizada

#### Scenario: Conflicto de concurrencia al reordenar desde dos dispositivos
- **WHEN** un cliente envía `PUT /api/v1/podcasts/queue/order` con un `baseRevision` obsoleto porque otro dispositivo modificó antes la cola
- **THEN** el servidor rechaza el cambio con estado `409 Conflict` para que el cliente refresque la cola vigente

### Requirement: Avance automático y limpieza de la cola al terminar un episodio
Cuando un episodio en reproducción llega a su final natural (`ended`), el reproductor SHALL marcarlo como completado, eliminarlo automáticamente de la cola del usuario y reproducir el siguiente episodio pendiente en la cola, o detenerse si la cola queda vacía.

#### Scenario: Fin de episodio con más elementos en la cola
- **WHEN** el episodio actual termina y existen más episodios en la cola
- **THEN** el episodio terminado se retira de la cola y comienza automáticamente la reproducción del siguiente episodio

### Requirement: Gestión de episodios favoritos
Los usuarios autenticados SHALL poder guardar episodios como favoritos (`POST /api/v1/podcasts/favorites`), listarlos (`GET /api/v1/podcasts/favorites`) y quitarlos (`DELETE /api/v1/podcasts/favorites/:episodeId`), de forma independiente a las emisoras favoritas de radio y a las suscripciones de programas.

#### Scenario: Marcar y consultar un episodio favorito
- **WHEN** un usuario autenticado añade un episodio a favoritos y consulta `GET /api/v1/podcasts/favorites`
- **THEN** el episodio aparece en la lista de favoritos de podcasts con los datos de su programa y progreso actual, sin alterar las emisoras favoritas de radio

### Requirement: Portada agregada de podcasts (`/podcasts/home`)

El endpoint autenticado `GET /api/v1/podcasts/home` SHALL devolver en una sola respuesta los episodios en progreso pendientes de terminar (`continueListening`, excluyendo los descartados), los últimos episodios publicados en las suscripciones del usuario (`latestEpisodes`), las suscripciones activas (`subscriptions`) y el resumen de la cola (`queue`).

#### Scenario: Usuario con suscripciones y episodios a medias
- **WHEN** un usuario autenticado solicita `GET /api/v1/podcasts/home`
- **THEN** recibe las listas de continuar escuchando, novedades de sus suscripciones y estado de su cola ordenadas por recencia

#### Scenario: Episodio descartado excluido de continuar escuchando
- **WHEN** un usuario autenticado descarta un episodio y después solicita `GET /api/v1/podcasts/home`
- **THEN** el episodio descartado no aparece en `continueListening`, pero sí puede aparecer en `latestEpisodes` si pertenece a una suscripción

### Requirement: Descarte persistente de episodios de continuar escuchando

El endpoint autenticado `POST /api/v1/podcasts/episodes/:episodeId/dismiss` SHALL marcar el progreso existente del episodio como descartado (`dismissed_at`) sin alterar posición, duración ni completado. La operación SHALL ser idempotente y no creará progreso si no existe. Un nuevo registro de progreso SHALL limpiar el descarte para que el episodio pueda reaparecer en `continueListening`.

#### Scenario: Descartar un episodio con progreso
- **WHEN** un usuario autenticado envía `POST /api/v1/podcasts/episodes/42/dismiss` para un episodio con progreso
- **THEN** el servidor responde `200` con `{ dismissed: true }` y el episodio deja de aparecer en `continueListening` en todas las sesiones de ese usuario

#### Scenario: Descartar un episodio sin progreso
- **WHEN** un usuario autenticado descarta un episodio que no tiene progreso registrado
- **THEN** el servidor responde `200` con `{ dismissed: false }` y no crea ninguna fila de progreso

#### Scenario: Nuevo progreso tras el descarte
- **WHEN** un usuario descarta un episodio y después registra nuevo progreso en él con otro `sequence`
- **THEN** el descarte se limpia y el episodio vuelve a aparecer en `continueListening`

#### Scenario: Aislamiento entre usuarios
- **WHEN** un usuario descarta un episodio
- **THEN** el descarte no afecta a la lista de continuar escuchando de ningún otro usuario

#### Scenario: Episodio inexistente
- **WHEN** un usuario intenta descartar un `episodeId` que no existe
- **THEN** el servidor responde `404` con código `EPISODE_NOT_FOUND`

### Requirement: Conteo ligero de la cola

El endpoint autenticado `GET /api/v1/podcasts/queue/count` SHALL devolver `{ count, limit }` con el número de episodios en la cola del usuario y el límite configurado, sin cargar los episodios ni sus metadatos.

#### Scenario: Conteo con episodios en cola
- **WHEN** un usuario autenticado con tres episodios en cola solicita `GET /api/v1/podcasts/queue/count`
- **THEN** el servidor responde `200` con `{ count: 3, limit: 200 }` (o el límite configurado)

#### Scenario: Conteo con la cola vacía
- **WHEN** un usuario autenticado sin episodios en cola solicita `GET /api/v1/podcasts/queue/count`
- **THEN** el servidor responde `200` con `{ count: 0, limit: 200 }` (o el límite configurado)

#### Scenario: Aislamiento del conteo por usuario
- **WHEN** dos usuarios tienen colas distintas y cada uno solicita el conteo
- **THEN** cada respuesta refleja únicamente los episodios de su propia cola

### Requirement: Vistas web de Podcasts y renderizado seguro de portadas
La interfaz web SHALL ofrecer a los usuarios autenticados las vistas `/podcasts`, `/podcasts/descubrir`, `/podcasts/suscripciones`, `/podcasts/:podcastId`, `/podcasts/cola` y `/podcasts/favoritos`. Las portadas de podcasts y episodios SHALL renderizarse mediante `<img>` con `referrerPolicy="no-referrer"`, `loading="lazy"` y fallback al icono de podcast.

#### Scenario: Explorar ficha de podcast y filtrar episodios
- **WHEN** un usuario autenticado abre `/podcasts/:podcastId` y cambia el filtro a episodios en progreso o no escuchados
- **THEN** la lista se actualiza paginadamente mostrando acciones para reproducir, añadir a la cola y marcar favorito

### Requirement: Acciones de reproducción y encolado desde las listas de episodios
En las listas de episodios de podcasts (inicio, ficha de podcast y favoritos), cada episodio SHALL ofrecer un control de reproducir/pausar y un menú de cola con las acciones **a continuación** y **al final**. Reproducir SHALL iniciar o alternar la reproducción del episodio; encolar SHALL añadirlo a la cola y confirmarlo con un aviso. Si la cola alcanza su límite, el sistema SHALL mostrar el error devuelto sin perder el estado de la lista.

#### Scenario: Reproducir un episodio desde una lista
- **WHEN** un usuario activa reproducir en un episodio de una lista que tiene progreso guardado
- **THEN** el reproductor inicia el episodio reanudando su posición y la fila muestra el estado de pausa disponible

#### Scenario: Alternar el episodio actual desde una lista
- **WHEN** un usuario activa el control de un episodio que ya es el que está sonando
- **THEN** la reproducción se pausa o reanuda sin reiniciar el episodio

#### Scenario: Encolar a continuación
- **WHEN** un usuario elige “A continuación” en un episodio que no está en la cola
- **THEN** el episodio queda en el primer puesto de la cola y se muestra un aviso de confirmación

#### Scenario: Encolar al final
- **WHEN** un usuario elige “Al final” en un episodio que no está en la cola
- **THEN** el episodio queda en el último puesto de la cola y se muestra un aviso de confirmación

#### Scenario: Límite de cola alcanzado
- **WHEN** un usuario intenta encolar un episodio con la cola llena
- **THEN** se muestra el error de límite devuelto por la API y la cola no cambia

### Requirement: Episodio activo separado de la cola en la vista de cola
Mientras un episodio de podcast está activo (conectando, reproduciendo o reconectando), la vista de cola SHALL ocultarlo de la lista de pendientes y NO SHALL duplicarlo en un área adicional; el reproductor persistente SHALL seguir mostrándolo. Al pausarlo, fallar o detenerlo, SHALL volver a su posición original en la lista; al iniciar otro episodio, el anterior SHALL reaparecer automáticamente. La cola persistida en el servidor NO SHALL modificarse por este comportamiento.

#### Scenario: Episodio en reproducción oculto de la lista
- **WHEN** un episodio de la cola está sonando
- **THEN** no aparece en la lista de pendientes y sigue visible únicamente en el reproductor persistente

#### Scenario: Pausa devuelve el episodio a la cola
- **WHEN** el usuario pausa el episodio activo
- **THEN** el episodio vuelve a su posición original en la lista de pendientes y el reproductor persistente sigue mostrándolo

#### Scenario: Cambio de episodio en reproducción
- **WHEN** el usuario inicia otro episodio de la cola mientras el anterior sigue activo
- **THEN** el anterior reaparece en la cola y el nuevo pasa a controlarse desde el reproductor persistente

#### Scenario: Episodio activo que no estaba en la cola
- **WHEN** el episodio activo se inició desde la ficha del podcast y no pertenece a la cola
- **THEN** se controla desde el reproductor persistente y al pausarlo no se añade automáticamente a la cola

#### Scenario: Recarga de la página durante la reproducción
- **WHEN** la página se recarga mientras un episodio de la cola está sonando
- **THEN** el episodio sigue en la cola del servidor y aparece como pendiente al perderse el estado local del reproductor

### Requirement: Reposicionamiento de episodios ya encolados
Al encolar un episodio que ya pertenece a la cola, el sistema SHALL moverlo a la posición solicitada en lugar de duplicarlo o ignorarlo: **a continuación** lo sitúa en el primer puesto y **al final** en el último. El movimiento SHALL incrementar la revisión de la cola y respetar el límite de episodios.

#### Scenario: Mover a continuación un episodio ya encolado
- **WHEN** un usuario elige “A continuación” en un episodio que ya está en la cola pero no en el primer puesto
- **THEN** el episodio pasa al primer puesto sin duplicarse y la revisión aumenta

#### Scenario: Mover al final un episodio ya encolado
- **WHEN** un usuario elige “Al final” en un episodio que ya está en la cola pero no en el último puesto
- **THEN** el episodio pasa al último puesto sin duplicarse y la revisión aumenta

#### Scenario: Episodio ya en la posición solicitada
- **WHEN** el episodio ya ocupa el primer puesto al pedir “A continuación” o el último al pedir “Al final”
- **THEN** la cola no se duplica ni se reordena

### Requirement: Vaciado completo de la cola con conservación opcional del episodio cargado
El endpoint autenticado `DELETE /api/v1/podcasts/queue` SHALL vaciar la cola del usuario e incrementar su revisión. Si se envía `keepEpisodeId` y ese episodio pertenece a la cola, SHALL conservarlo como único elemento en la primera posición y eliminar el resto. La operación SHALL ser idempotente, no SHALL afectar a otros usuarios ni a la reproducción en curso.

#### Scenario: Vaciar la cola completa
- **WHEN** un usuario autenticado envía `DELETE /api/v1/podcasts/queue` sin `keepEpisodeId`
- **THEN** el servidor responde `200` con la cola vacía y la revisión incrementada

#### Scenario: Vaciar conservando el episodio cargado
- **WHEN** un usuario envía `DELETE /api/v1/podcasts/queue?keepEpisodeId=42` y el episodio 42 está en su cola
- **THEN** la cola queda con el episodio 42 en la primera posición y el resto se elimina

#### Scenario: Conservar un episodio que no está en la cola
- **WHEN** el `keepEpisodeId` enviado no pertenece a la cola del usuario
- **THEN** el valor se ignora y la cola se vacía por completo

#### Scenario: Vaciar una cola ya vacía
- **WHEN** un usuario envía el vaciado con la cola vacía
- **THEN** el servidor responde `200` con la cola vacía sin error

#### Scenario: La reproducción continúa tras vaciar
- **WHEN** un usuario vacía la cola mientras un episodio está sonando
- **THEN** la reproducción no se detiene y el episodio conservado vuelve a la lista al pausarlo

#### Scenario: Aislamiento entre usuarios
- **WHEN** un usuario vacía su cola
- **THEN** la cola de ningún otro usuario cambia

### Requirement: Ordenación de la pantalla de suscripciones
La pantalla `/podcasts/suscripciones` SHALL ofrecer un selector de orden con las opciones **Episodios recientes** (valor por defecto), **Nombre (A → Z)**, **Nombre (Z → A)** y **Últimas suscritas** (por fecha de suscripción descendente). La ordenación por nombre SHALL comparar sin distinguir mayúsculas ni acentos y usando el idioma español. **Episodios recientes** SHALL ordenar de más a menos reciente según `latestPendingEpisodeAt` (episodio pendiente de reproducir más reciente), dejando al final los podcasts con valor `null` y usando el nombre como desempate. La opción elegida SHALL recordarse en el dispositivo entre visitas; si el valor guardado no es válido o no existe, SHALL aplicarse **Episodios recientes**. Cambiar el orden NO SHALL realizar peticiones adicionales a la API ni afectar a la vista tarjeta/lista.

#### Scenario: Orden por nombre ascendente
- **WHEN** un usuario con suscripciones «Zeta», «álbum» y «Beta» elige **Nombre (A → Z)**
- **THEN** la lista se muestra como «álbum», «Beta», «Zeta»

#### Scenario: Orden por nombre descendente
- **WHEN** el usuario elige **Nombre (Z → A)**
- **THEN** la lista se muestra en el orden inverso al anterior

#### Scenario: Orden por episodios recientes pendientes
- **WHEN** el usuario elige **Episodios recientes** y el podcast A tiene un episodio pendiente publicado ayer, el B uno publicado hace un mes y el C todos sus episodios completados
- **THEN** la lista se muestra como A, B, C

#### Scenario: Podcasts sin pendientes al final con desempate por nombre
- **WHEN** varios podcasts tienen `latestPendingEpisodeAt` nulo en el orden **Episodios recientes**
- **THEN** aparecen tras los que tienen pendientes y ordenados entre sí por nombre ascendente

#### Scenario: Primera visita sin preferencia guardada
- **WHEN** un usuario abre la pantalla sin haber elegido nunca un orden
- **THEN** la lista se muestra ordenada por **Episodios recientes**

#### Scenario: Orden por fecha de suscripción
- **WHEN** el usuario elige **Últimas suscritas**
- **THEN** la lista se muestra en el orden recibido de la API (suscripción más reciente primero)

#### Scenario: Preferencia recordada
- **WHEN** el usuario elige un orden y vuelve a abrir la pantalla en el mismo dispositivo
- **THEN** se aplica el orden elegido

#### Scenario: Valor guardado inválido o almacenamiento no disponible
- **WHEN** el valor guardado no es una opción conocida o el almacenamiento del navegador no está disponible
- **THEN** se aplica **Episodios recientes** sin mostrar error

### Requirement: Confirmación antes de cancelar una suscripción
Antes de cancelar una suscripción desde la pantalla de suscripciones o desde el botón «Suscrito» de la ficha del podcast, la interfaz SHALL mostrar un diálogo de confirmación destructivo que nombre el podcast y ofrezca confirmar o cancelar. La baja (`DELETE /api/v1/podcasts/subscriptions/:podcastId`) SHALL ejecutarse únicamente tras confirmar. Cerrar el diálogo (botón de cancelar, tecla Escape o clic fuera) NO SHALL modificar la suscripción. Suscribirse a un podcast NO SHALL requerir confirmación.

#### Scenario: Confirmar la baja desde la lista de suscripciones
- **WHEN** un usuario pulsa «Cancelar» en un podcast de la lista y confirma en el diálogo
- **THEN** se cancela la suscripción, el podcast desaparece de la lista y se muestra un aviso de confirmación

#### Scenario: Descartar el diálogo
- **WHEN** un usuario pulsa «Cancelar» en un podcast y cierra el diálogo sin confirmar
- **THEN** no se envía ninguna petición de baja y el podcast sigue en la lista

#### Scenario: Baja desde la ficha del podcast
- **WHEN** un usuario suscrito pulsa «Suscrito» en la ficha de un podcast
- **THEN** se muestra el diálogo de confirmación y la baja solo se realiza si confirma

#### Scenario: Suscribirse no pide confirmación
- **WHEN** un usuario pulsa «Suscribirse» en la ficha de un podcast al que no está suscrito
- **THEN** la suscripción se crea de inmediato sin diálogo

#### Scenario: Error al cancelar
- **WHEN** el servidor devuelve un error tras confirmar la baja
- **THEN** se muestra el mensaje de error, el diálogo se cierra y la suscripción permanece en la lista

### Requirement: Progreso visible durante la importación OPML
Al importar un archivo OPML desde `/podcasts/descubrir`, la interfaz SHALL procesar los feeds en lotes secuenciales y mostrar durante el proceso una barra de progreso determinada con el número de feeds procesados sobre el total del archivo, junto con los contadores acumulados de importados, ya suscritos y fallidos. El botón de importar y la selección de un nuevo archivo SHALL permanecer deshabilitados mientras la importación esté activa.

#### Scenario: Avance por lotes
- **WHEN** un usuario importa un OPML con 120 feeds
- **THEN** la barra avanza a medida que se completa cada lote y el texto muestra «X de 120 feeds» sin retroceder

#### Scenario: Contadores acumulados entre lotes
- **WHEN** el primer lote devuelve 3 importados, 1 ya suscrito y 1 fallido, y el segundo devuelve 4 importados y 1 fallido
- **THEN** el panel muestra 7 importados, 1 ya suscrito y 2 fallidos

#### Scenario: Progreso accesible
- **WHEN** la importación está en curso
- **THEN** la barra expone `role="progressbar"` con su valor actual y máximo, y el texto de estado se anuncia mediante una región `aria-live`

#### Scenario: Archivo sin feeds válidos
- **WHEN** el usuario selecciona un OPML sin ninguna URL de feed
- **THEN** se muestra un error y no se inicia ninguna importación ni aparece la barra de progreso

### Requirement: Resumen final de la importación OPML
Al terminar una importación OPML, la interfaz SHALL mostrar en la propia pantalla un resumen con el número de podcasts importados, ya suscritos y fallidos, junto con un control para cerrarlo. Los errores por feed devueltos por la API NO SHALL interrumpir la importación ni omitir el resumen.

#### Scenario: Importación completada
- **WHEN** todos los lotes terminan correctamente
- **THEN** el panel muestra el resumen final con los tres contadores y los podcasts suscritos aparecen en la lista de suscripciones sin recargar la página

#### Scenario: Importación con feeds fallidos
- **WHEN** algunos feeds devuelven error en la respuesta de la API
- **THEN** la importación continúa con el resto y el resumen refleja los importados y los fallidos

#### Scenario: Cierre del resumen
- **WHEN** el usuario cierra el resumen
- **THEN** el panel desaparece y la pantalla vuelve a mostrar los botones de importar y exportar

### Requirement: Cancelación de la importación OPML
Mientras una importación OPML está en curso, la interfaz SHALL ofrecer un botón **Cancelar**. Al pulsarlo, el lote en curso SHALL completarse, NO SHALL enviarse más lotes y el resumen SHALL indicar que la importación se canceló junto con los feeds procesados y los que quedaron sin procesar. Los podcasts ya importados NO SHALL revertirse.

#### Scenario: Cancelar a mitad de la importación
- **WHEN** un usuario cancela tras completarse dos de cinco lotes
- **THEN** el tercer lote en curso termina, no se envían los lotes restantes y el resumen indica la cancelación con 10 de 50 feeds procesados

#### Scenario: Cancelar durante el último lote
- **WHEN** el usuario cancela mientras se procesa el último lote
- **THEN** el lote termina y el resumen muestra el resultado completo como importación cancelada

#### Scenario: Lo importado se conserva
- **WHEN** el usuario cancela una importación y vuelve a la lista de suscripciones
- **THEN** los podcasts importados antes de cancelar siguen suscritos

### Requirement: Límites y fallos de la importación OPML
Si el archivo contiene más feeds que `limits.podcastOpmlMaxFeeds`, la interfaz SHALL mostrar un error y NO SHALL enviar ninguna petición de importación. Si un lote falla por red o por respuesta HTTP de error, la interfaz SHALL detener la importación, conservar los resultados de los lotes anteriores y mostrar el error junto al resumen parcial.

#### Scenario: Archivo por encima del límite
- **WHEN** el usuario importa un OPML con más feeds que `podcastOpmlMaxFeeds`
- **THEN** se muestra un error de límite y no se realiza ninguna petición al servidor

#### Scenario: Fallo de red en un lote intermedio
- **WHEN** el tercer lote de una importación falla por red
- **THEN** no se envían los lotes posteriores, se muestran los resultados de los dos primeros y el error de red

#### Scenario: Fallo del servidor en el primer lote
- **WHEN** el primer lote devuelve un error HTTP
- **THEN** la importación se detiene y el panel muestra el error sin contadores alterados

### Requirement: Favorito desde las filas de la cola de reproducción
En la página `/podcasts/cola`, cada episodio pendiente SHALL mostrar un control de favorito que refleje si ya está guardado. Al activarlo, la interfaz SHALL marcar o quitar el episodio como favorito mediante los endpoints existentes, confirmar la acción con un aviso y reflejar el nuevo estado sin alterar el orden de la cola. Mientras la petición está en curso el control SHALL deshabilitarse; si falla, SHALL mostrarse el error conservando el estado anterior.

#### Scenario: Marcar un episodio pendiente como favorito
- **WHEN** un usuario autenticado pulsa el corazón de un episodio no favorito en la cola
- **THEN** el episodio se guarda como favorito, el corazón pasa a mostrarse relleno y se confirma con un aviso

#### Scenario: Quitar un episodio favorito desde la cola
- **WHEN** un usuario pulsa el corazón de un episodio que ya es favorito en la cola
- **THEN** el episodio deja de ser favorito, el corazón vuelve a su estado vacío y se confirma con un aviso

#### Scenario: Estado inicial del favorito
- **WHEN** un usuario abre la cola con episodios que ya están guardados como favoritos
- **THEN** cada fila muestra su corazón relleno y expone el nombre accesible «Quitar de favoritos»

#### Scenario: El favorito no modifica la cola
- **WHEN** un usuario marca o quita un favorito desde la cola
- **THEN** el orden, la revisión y el número de episodios de la cola no cambian

#### Scenario: Error al actualizar el favorito
- **WHEN** la operación de favorito falla por red o por un error del servidor
- **THEN** se muestra un aviso de error y el control conserva el estado que tenía antes de la petición

### Requirement: Cabecera de la página de cola
La vista `/podcasts/cola` SHALL presentar el título «Cola de reproducción» y, justo debajo, el texto «Episodios a continuación» como subtítulo de la página, en sustitución del anterior texto descriptivo.

#### Scenario: Títulos de la cola
- **WHEN** un usuario autenticado abre `/podcasts/cola`
- **THEN** la cabecera muestra «Cola de reproducción» y debajo «Episodios a continuación»

### Requirement: Terminología de la cola en los avisos
Los avisos de error referidos al límite de la cola SHALL usar el término «cola de reproducción», sin cambiar el código `QUEUE_LIMIT_REACHED` ni el comportamiento del límite.

#### Scenario: Aviso de límite alcanzado
- **WHEN** un usuario intenta encolar un episodio con la cola llena y la API devuelve `QUEUE_LIMIT_REACHED`
- **THEN** el aviso mostrado menciona «cola de reproducción» y el máximo de episodios configurado

### Requirement: Ficha de episodio en modal global
La interfaz web SHALL ofrecer una ficha de episodio en un diálogo modal global, sin abandonar la vista ni interrumpir la reproducción. Se SHALL abrir al activar el título o la tarjeta de un episodio en las listas y al activar el título del episodio en el reproductor persistente. El diálogo SHALL ser accesible, cerrarse con su botón, Escape o clic fuera y devolver el foco al disparador.

#### Scenario: Abrir la ficha desde el título de una fila
- **WHEN** un usuario activa el título de un episodio en el inicio, la ficha del podcast, favoritos o la cola
- **THEN** se abre la ficha del episodio sobre la vista actual sin navegar a otra página

#### Scenario: Abrir la ficha desde la tarjeta
- **WHEN** un usuario pulsa una zona no interactiva de la tarjeta de un episodio, como la descripción o los metadatos
- **THEN** se abre la ficha del episodio

#### Scenario: Abrir la ficha desde el reproductor
- **WHEN** un usuario activa el título del episodio que está en el reproductor persistente
- **THEN** se abre la ficha del mismo episodio con los datos del reproductor

#### Scenario: Los controles de la fila no abren la ficha
- **WHEN** el usuario pulsa reproducir, el menú de cola, favorito o descargar en una fila
- **THEN** se ejecuta la acción del control y la ficha no se abre

#### Scenario: Cierre accesible
- **WHEN** el usuario pulsa el botón de cerrar, la tecla Escape o el fondo del diálogo
- **THEN** la ficha se cierra y el foco vuelve al elemento que la abrió

#### Scenario: Un clic dentro del contenido no cierra la ficha
- **WHEN** el usuario interactúa con el contenido o los controles dentro de la ficha
- **THEN** la ficha permanece abierta

#### Scenario: La reproducción no se interrumpe
- **WHEN** el usuario abre o cierra la ficha mientras suena un episodio
- **THEN** la reproducción continúa sin pausarse ni reiniciarse

### Requirement: Contenido completo de la ficha
La ficha SHALL mostrar portada, podcast con enlace a su página, título, fecha de publicación, duración, temporada y episodio cuando existan, badge de explícito, estado de progreso y la descripción completa sin recortar. Los datos ausentes SHALL omitirse y la descripción larga SHALL poder recorrerse dentro del diálogo.

#### Scenario: Episodio con todos los datos
- **WHEN** un usuario abre la ficha de un episodio con portada, fecha, duración, temporada, número, explícito y descripción
- **THEN** la ficha muestra todos esos datos y el enlace a la página del podcast

#### Scenario: Episodio con datos opcionales ausentes
- **WHEN** un usuario abre la ficha de un episodio sin fecha, duración, temporada, número o descripción
- **THEN** la ficha omite esos campos y mantiene el resto del contenido sin errores visuales

#### Scenario: Progreso parcial y completado
- **WHEN** un usuario abre la ficha de un episodio empezado o completado
- **THEN** la ficha muestra la posición o el estado completado junto con la duración disponible

#### Scenario: Descripción larga
- **WHEN** un usuario abre la ficha de un episodio con una descripción de varios párrafos
- **THEN** la descripción se muestra completa y el diálogo permite desplazarse por ella

#### Scenario: Ficha en móvil
- **WHEN** un usuario abre la ficha en una pantalla menor de 640 px
- **THEN** el diálogo ocupa el ancho disponible, no desborda horizontalmente y su contenido se puede desplazar

### Requirement: Acciones de reproducción, cola y favorito desde la ficha
La ficha SHALL ofrecer reproducir, pausar o reintentar con las mismas reglas que las listas, el menú de cola existente, el control de favorito y un enlace a la página del podcast. El estado SHALL reflejar el episodio actual del reproductor y los cambios de favorito SHALL reflejarse en la ficha y en las listas sin alterar la cola ni la reproducción.

#### Scenario: Reproducir desde la ficha
- **WHEN** un usuario pulsa reproducir en la ficha de un episodio con progreso guardado
- **THEN** el reproductor inicia el episodio reanudando su posición y la ficha muestra el estado de pausa

#### Scenario: Alternar el episodio actual
- **WHEN** un usuario pulsa reproducir o pausar en la ficha del episodio que ya está cargado
- **THEN** la reproducción se pausa o reanuda sin reiniciar el episodio

#### Scenario: Reintentar un episodio fallido
- **WHEN** el episodio de la ficha está en estado fallido y el usuario pulsa reintentar
- **THEN** el reproductor vuelve a intentar la reproducción y la ficha refleja el nuevo estado

#### Scenario: Encolar desde la ficha
- **WHEN** el usuario elige “A continuación” o “Al final” en el menú de cola de la ficha
- **THEN** el episodio se coloca en la posición elegida y se muestra el aviso correspondiente

#### Scenario: Favorito desde la ficha
- **WHEN** el usuario marca o quita un episodio como favorito desde la ficha
- **THEN** el estado se actualiza en la ficha y en las listas visibles al cerrarla, sin cambiar el orden de la cola

#### Scenario: Error al actualizar el favorito
- **WHEN** la operación de favorito falla desde la ficha
- **THEN** se muestra un aviso de error y el control conserva el estado anterior

#### Scenario: Enlace a la página del podcast
- **WHEN** el usuario activa el enlace del podcast en la ficha
- **THEN** la ficha se cierra y se navega a `/podcasts/:podcastId`

### Requirement: Descarga desde las filas de episodios
Cuando `features.podcastDownloads` sea `true`, cada fila de episodio de las vistas de podcasts SHALL mostrar un control de descarga accesible. Al activarlo, la interfaz SHALL solicitar una URL firmada y entregar el archivo al gestor de descargas del navegador o escritorio, confirmándolo con un aviso. Mientras se prepara, el control SHALL deshabilitarse y mostrar un indicador de espera.

#### Scenario: Descargar desde las listas
- **WHEN** el usuario activa la descarga de un episodio en el inicio, la ficha del podcast, favoritos o la cola
- **THEN** la interfaz solicita la URL firmada, inicia la descarga del archivo original y muestra un aviso de confirmación

#### Scenario: Descarga en preparación
- **WHEN** el usuario activa la descarga y la petición del token aún no ha terminado
- **THEN** el control se deshabilita y muestra un indicador de espera hasta recibir la URL o el error

#### Scenario: Error al descargar
- **WHEN** la petición del token o el origen del archivo falla
- **THEN** se muestra un aviso de error y el control vuelve a su estado normal

#### Scenario: Descargas independientes
- **WHEN** el usuario descarga un episodio mientras otra descarga de otra fila está en preparación
- **THEN** cada control mantiene su propio estado y la segunda descarga no se bloquea por la primera

#### Scenario: Descarga sin alterar la reproducción ni la cola
- **WHEN** el usuario descarga un episodio que está sonando o que pertenece a la cola
- **THEN** la reproducción y el orden de la cola no cambian

#### Scenario: Descarga en la cola sin iniciar el arrastre
- **WHEN** el usuario pulsa el control de descarga de una fila de la cola
- **THEN** la descarga comienza y el episodio no se mueve ni entra en modo de arrastre

#### Scenario: Capacidad de descarga desactivada
- **WHEN** `features.podcastDownloads` es `false`
- **THEN** las filas no muestran ningún control de descarga

#### Scenario: Nombre accesible del control
- **WHEN** un usuario recorre la fila con un lector de pantalla
- **THEN** el control de descarga expone un nombre accesible que incluye el título del episodio

### Requirement: Descarga desde la ficha del episodio
La ficha del episodio SHALL incluir un botón de descarga con etiqueta visible cuando `features.podcastDownloads` sea `true`, con el mismo comportamiento, estado pendiente, avisos y errores que el control de las filas. Si la capacidad está desactivada, el botón NO SHALL mostrarse.

#### Scenario: Descargar desde la ficha
- **WHEN** el usuario pulsa el botón de descarga de la ficha
- **THEN** se solicita la URL firmada, se inicia la descarga del archivo original y se muestra un aviso de confirmación

#### Scenario: Botón de descarga en preparación
- **WHEN** la petición del token de descarga está en curso
- **THEN** el botón de la ficha se deshabilita y muestra un indicador de espera

#### Scenario: Error desde la ficha
- **WHEN** la descarga falla desde la ficha
- **THEN** se muestra un aviso de error y el botón vuelve a su estado normal

#### Scenario: Sin botón si la descarga está desactivada
- **WHEN** `features.podcastDownloads` es `false`
- **THEN** la ficha no muestra el botón de descarga
