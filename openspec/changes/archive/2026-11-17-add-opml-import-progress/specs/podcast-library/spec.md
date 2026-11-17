# Spec Delta

## ADDED Requirements

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
