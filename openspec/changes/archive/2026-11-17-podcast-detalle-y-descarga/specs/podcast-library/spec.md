# Spec Delta

## ADDED Requirements

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
