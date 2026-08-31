## Purpose

Modo de edicion para reordenar favoritos con drag handles dedicados, activable mediante un toggle "Editar"/"Listo", que resuelve el conflicto entre drag y scroll en dispositivos tactiles mediante `touch-action: none` en los handles.

## ADDED Requirements

### Requirement: Toggle de modo editar
La interfaz SHALL ofrecer un boton "Editar" en el header de la seccion de favoritos que alterna entre el modo normal y el modo de edicion. En modo de edicion, el boton SHALL cambiar a "Listo" para permitir salir del modo editar. El boton SHALL estar siempre visible tanto en desktop como en movil.

#### Scenario: Entrar en modo editar
- **WHEN** un usuario autenticado pulsa el boton "Editar" en la seccion de favoritos
- **THEN** la interfaz entra en modo de edicion: aparecen los drag handles, se ocultan los botones de play y favoritos, y las tarjetas/filas muestran un borde punteado

#### Scenario: Salir de modo editar
- **WHEN** un usuario pulsa el boton "Listo" estando en modo de edicion
- **THEN** la interfaz sale del modo de edicion: los drag handles desaparecen, los botones de play y favoritos reaparecen, y las tarjetas/filas vuelven a su borde normal

#### Scenario: Boton siempre visible
- **WHEN** un usuario autenticado ve la seccion de favoritos con al menos un favorito
- **THEN** el boton "Editar" (o "Listo" si esta en modo editar) es visible en el header junto al boton "Vaciar"

### Requirement: Drag handle dedicado
En modo de edicion, cada tarjeta o fila de favorito SHALL mostrar un handle de arrastre dedicado. En vista de tarjetas, el handle SHALL mostrarse como un overlay en la parte inferior centrada de la tarjeta. En vista de lista, el handle SHALL mostrarse a la derecha de la fila. El handle SHALL ser el unico elemento arrastrable (no la tarjeta completa).

#### Scenario: Handle en vista de tarjetas
- **WHEN** un usuario esta en modo editar con vista de tarjetas
- **THEN** cada tarjeta muestra un handle con icono de agarre (6 puntos) como overlay en la parte inferior centrada

#### Scenario: Handle en vista de lista
- **WHEN** un usuario esta en modo editar con vista de lista
- **THEN** cada fila muestra un handle con icono de agarre (6 puntos) a la derecha

#### Scenario: Arrastrar desde el handle en movil
- **WHEN** un usuario en un dispositivo tactil toca y arrastra el handle de una tarjeta o fila
- **THEN** el browser NO interpreta el gesto como scroll y dnd-kit activa el drag correctamente

#### Scenario: Handle no visible fuera de modo editar
- **WHEN** un usuario no esta en modo editar
- **THEN** los handles de arrastre no son visibles ni interactivos

### Requirement: Ocultar acciones en modo editar
En modo de edicion, los botones de reproduccion y de favorito SHALL estar ocultos para evitar conflictos de interaccion con el drag handle.

#### Scenario: Play oculto en modo editar
- **WHEN** un usuario esta en modo editar
- **THEN** los botones de reproduccion no son visibles en las tarjetas ni en las filas

#### Scenario: Favorito oculto en modo editar
- **WHEN** un usuario esta en modo editar
- **THEN** los botones de corazon (favorito) no son visibles en las tarjetas ni en las filas

#### Scenario: Acciones restauradas al salir de editar
- **WHEN** un usuario sale de modo editar
- **THEN** los botones de reproduccion y favorito reaparecen con animacion de fade-in

### Requirement: Feedback visual en modo editar
En modo de edicion, las tarjetas y filas SHALL mostrar una indicacion visual de que son arrastrables.

#### Scenario: Borde punteado en modo editar
- **WHEN** un usuario esta en modo editar
- **THEN** las tarjetas y filas de favoritos muestran un borde punteado o diferenciado

#### Scenario: Animacion de entrada al modo editar
- **WHEN** un usuario pulsa "Editar"
- **THEN** los handles aparecen con animacion de fade-in y los botones de play/favoritos desaparecen con fade-out

#### Scenario: Animacion de salida del modo editar
- **WHEN** un usuario pulsa "Listo"
- **THEN** los handles desaparecen con fade-out y los botones de play/favoritos aparecen con fade-in

### Requirement: Texto de ayuda dinamico
El texto de ayuda en la parte inferior de la seccion de favoritos SHALL cambiar segun el modo activo.

#### Scenario: Texto en modo normal
- **WHEN** un usuario esta en modo normal con favoritos
- **THEN** el texto muestra "Arrastra una emisora para reordenar tus favoritos. Pulsa el corazon en cualquier emisora para quitarla de favoritos."

#### Scenario: Texto en modo editar
- **WHEN** un usuario esta en modo editar
- **THEN** el texto cambia para indicar que arrastre los handles para reordenar
