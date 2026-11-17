# Spec Delta

## ADDED Requirements

### Requirement: Orden y agrupación del transporte en podcasts
En modo podcast, el reproductor SHALL mostrar los controles de transporte en una fila propia centrada sobre la barra de progreso, con el botón de retroceder 15 segundos inmediatamente a la izquierda del botón de reproducir/pausar y el de avanzar 30 segundos inmediatamente a su derecha.

#### Scenario: Grupo de transporte centrado
- **WHEN** un usuario reproduce un episodio de podcast en cualquier anchura de pantalla
- **THEN** el reproductor muestra una fila de transporte centrada con retroceder a la izquierda del play y avanzar a su derecha, y la barra de progreso con tiempos y el selector de velocidad quedan debajo

#### Scenario: Orden de tabulación coherente
- **WHEN** un usuario recorre los controles del reproductor de podcast con el teclado
- **THEN** el foco pasa por retroceder, después reproducir/pausar y después avanzar, en el mismo orden en que se ven

#### Scenario: Radio en vivo sin saltos
- **WHEN** un usuario reproduce una emisora de radio en vivo
- **THEN** el reproductor mantiene el botón de reproducir/pausar en la fila superior junto a la información de la emisora y no muestra controles de salto

### Requirement: Tamaño táctil de los controles de transporte
Los tres controles del transporte de podcasts SHALL ofrecer una superficie táctil de al menos 44 por 44 píxeles, con el botón de reproducir/pausar como el mayor del grupo, y los botones de salto SHALL mostrar un icono de rotación y su tiempo de salto (`15 s` retroceder, `30 s` avanzar).

#### Scenario: Objetivos táctiles ampliados
- **WHEN** un usuario ve el transporte de un episodio en pantalla táctil
- **THEN** cada uno de los tres controles ocupa al menos 44 px de alto y de ancho, y el play es mayor que los saltos

#### Scenario: Saltos identificables
- **WHEN** un usuario ve los botones de salto del reproductor de podcast
- **THEN** cada uno muestra un icono de rotación y el tiempo que salta, y expone el nombre accesible "Retroceder 15 segundos" o "Avanzar 30 segundos"

#### Scenario: Sin desbordamiento en móvil
- **WHEN** un usuario ve el reproductor de podcast en una pantalla menor de 640 px
- **THEN** el grupo de transporte cabe centrado sin solaparse con el botón de detener y la barra no cubre la última fila del contenido de la página
