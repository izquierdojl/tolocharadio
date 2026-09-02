## Purpose

Proporciona un diálogo modal accesible que muestra la información del proyecto TolochaRadio: nombre, descripción, enlace al repositorio, versión actual, disponibilidad de actualización y licencia.

## ADDED Requirements

### Requirement: Modal abierto desde menú

El sistema SHALL mostrar un botón "Acerca de..." en los menús de usuario (escritorio y móvil) que, al ser pulsado, abre un diálogo modal con la información del proyecto.

#### Scenario: Usuario abre Acerca de desde menú de escritorio
- **WHEN** el usuario pulsa "Acerca de..." en el menú desplegable de escritorio
- **THEN** se abre un diálogo modal centrado con la información del proyecto

#### Scenario: Usuario abre Acerca de desde menú móvil
- **WHEN** el usuario pulsa "Acerca de..." en el menú hamburguesa móvil
- **THEN** se abre un diálogo modal centrado con la información del proyecto

### Requirement: Contenido del modal

El modal SHALL mostrar los siguientes campos: nombre del proyecto ("ToloChaRadio"), descripción breve, enlace cliclable al repositorio en GitHub, versión actual, indicador de actualización disponible (si aplica) con enlace a la release, y mención de licencia.

#### Scenario: Modal muestra información completa
- **WHEN** el diálogo modal se abre
- **THEN** el usuario ve el nombre, descripción, enlace al repositorio, versión actual y mención de licencia

#### Scenario: Hay actualización disponible
- **WHEN** el diálogo modal se abre y hay una nueva versión en GitHub
- **THEN** el usuario ve un indicador de actualización con enlace a la release más reciente

#### Scenario: No hay actualización disponible
- **WHEN** el diálogo modal se abre y la versión actual es la más reciente
- **THEN** no se muestra indicador de actualización

### Requirement: Cierre del modal

El usuario SHALL poder cerrar el modal pulsando fuera del contenido, pulsando un botón de cierre (X), o presionando la tecla Escape.

#### Scenario: Cierre con clic fuera
- **WHEN** el usuario pulsa fuera del área del contenido del modal
- **THEN** el modal se cierra

#### Scenario: Cierre con Escape
- **WHEN** el usuario pulsa la tecla Escape
- **THEN** el modal se cierra

#### Scenario: Cierre con botón X
- **WHEN** el usuario pulsa el botón de cierre (X)
- **THEN** el modal se cierra

### Requirement: Enlaces externos

Todos los enlaces externos (repositorio, release) SHALL abrirse en una nueva pestaña con `rel="noopener noreferrer"`.

#### Scenario: Enlace al repositorio
- **WHEN** el usuario pulsa el enlace al repositorio
- **THEN** se abre GitHub en una nueva pestaña

#### Scenario: Enlace a release
- **WHEN** el usuario pulsa el enlace de actualización disponible
- **THEN** se abre la página de la release en una nueva pestaña
