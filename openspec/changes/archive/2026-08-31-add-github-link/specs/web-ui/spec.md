## ADDED Requirements

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