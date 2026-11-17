# Spec Delta

## ADDED Requirements

### Requirement: Filtro de suscripciones por nombre
La pantalla `/podcasts/suscripciones` SHALL ofrecer una búsqueda de texto que acote la lista de suscripciones por nombre, sin distinguir mayúsculas ni acentos, sin realizar peticiones adicionales a la API y respetando el orden elegido en el selector. Con el término vacío o al limpiarlo, la pantalla SHALL mostrar la lista completa.

#### Scenario: Acotar la lista por nombre
- **WHEN** un usuario con suscripciones «Zeta», «álbum» y «Beta» escribe «album» en la búsqueda
- **THEN** la lista muestra únicamente «álbum»

#### Scenario: El orden elegido se mantiene
- **WHEN** el usuario tiene seleccionado **Nombre (A → Z)** y filtra por un término con varias coincidencias
- **THEN** los resultados filtrados se muestran en ese mismo orden

#### Scenario: Vaciar el término restaura la lista
- **WHEN** el usuario limpia la búsqueda
- **THEN** la pantalla vuelve a mostrar todas las suscripciones sin recargar datos de la API

#### Scenario: Sin coincidencias
- **WHEN** el término no coincide con ninguna suscripción
- **THEN** la pantalla muestra un vacío con mensaje indicándolo y no muestra tarjetas

### Requirement: Búsqueda de episodios desde la pantalla de suscripciones
La pantalla `/podcasts/suscripciones` SHALL ofrecer un ámbito de búsqueda **Episodios** que consulte la búsqueda de episodios de todas las suscripciones del usuario. Mientras haya resultados visibles, NO SHALL mostrar las tarjetas de suscripciones, y al limpiar la búsqueda SHALL volver a la lista de suscripciones.

#### Scenario: Contenido de los resultados
- **WHEN** aparecen resultados en el ámbito **Episodios**
- **THEN** cada resultado identifica el podcast al que pertenece el episodio y refleja su progreso y favorito

#### Scenario: Buscar episodios de todas las suscripciones
- **WHEN** un usuario escribe un término en el ámbito **Episodios** y ejecuta la búsqueda
- **THEN** aparecen los episodios que coinciden de cualquiera de sus suscripciones, cada uno mostrando su podcast y su estado de progreso

#### Scenario: Abrir la ficha desde un resultado
- **WHEN** el usuario activa un episodio de los resultados
- **THEN** se abre la ficha de episodio en el modal global sin abandonar la pantalla y sin interrumpir la reproducción

#### Scenario: Enlace al podcast desde un resultado
- **WHEN** el usuario activa el podcast indicado en un resultado
- **THEN** la pantalla navega a la ficha de ese podcast

#### Scenario: Sin resultados de episodios
- **WHEN** el término no coincide con ningún episodio de las suscripciones
- **THEN** la pantalla muestra un mensaje de ausencia de resultados

#### Scenario: Limpiar la búsqueda devuelve las suscripciones
- **WHEN** el usuario limpia el término o vuelve al ámbito **Podcasts** sin término
- **THEN** la pantalla muestra de nuevo la lista de suscripciones con el orden elegido

### Requirement: Búsqueda de episodios en la ficha del podcast
En `/podcasts/:podcastId`, la pantalla SHALL ofrecer una búsqueda de texto de episodios por título que conviva con los filtros de estado y el selector de orden existentes. Escribir un término SHALL aplicar el filtro junto al estado seleccionado y reiniciar la paginación a la primera página; limpiarlo SHALL restaurar el listado sin filtro de texto.

#### Scenario: Buscar episodios dentro de la ficha
- **WHEN** un usuario escribe «camion» en la búsqueda de la ficha de un podcast con el episodio «El camión fantasma»
- **THEN** la lista muestra solo los episodios cuyo título coincide, sin distinguir mayúsculas ni acentos

#### Scenario: El filtro de estado se mantiene al buscar
- **WHEN** el usuario tiene activo el filtro **Sin empezar** y escribe un término
- **THEN** solo aparecen los episodios sin empezar cuyo título coincide

#### Scenario: Buscar reinicia la paginación
- **WHEN** el usuario está en una página avanzada del listado y escribe un término
- **THEN** la vista muestra la primera página del conjunto filtrado

#### Scenario: Limpiar el término restaura el listado
- **WHEN** el usuario vacía la búsqueda
- **THEN** la lista vuelve a mostrar los episodios con el filtro de estado y orden previos

### Requirement: Filtro local en favoritos y cola
Las pantallas `/podcasts/favoritos` y `/podcasts/cola` SHALL ofrecer un filtro de texto en cliente que acote las filas por título de episodio sin realizar peticiones adicionales a la API. En la cola, el filtro NO SHALL alterar el orden, la revisión ni el contenido de la cola del servidor. Limpiar el filtro SHALL restaurar la lista completa en ambas pantallas.

#### Scenario: Filtrar favoritos por título
- **WHEN** un usuario escribe un término en `/podcasts/favoritos`
- **THEN** solo se muestran los episodios favoritos cuyo título coincide, con sus acciones intactas

#### Scenario: Filtrar la cola sin alterarla
- **WHEN** un usuario filtra `/podcasts/cola` por un término
- **THEN** solo se muestran los episodios pendientes que coinciden y la cola persistida en el servidor no cambia

#### Scenario: Limpiar el filtro restaura la lista
- **WHEN** el usuario vacía el filtro en favoritos o en la cola
- **THEN** cada pantalla vuelve a mostrar su lista completa sin peticiones adicionales
