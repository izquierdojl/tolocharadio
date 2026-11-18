# Spec Delta

## ADDED Requirements

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
