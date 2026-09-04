## MODIFIED Requirements

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

## ADDED Requirements

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
