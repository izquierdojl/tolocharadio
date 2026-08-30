## MODIFIED Requirements

### Requirement: Temática visual de la Sierra de Tolocha
La interfaz SHALL aplicar una identidad visual inspirada en la Sierra de Tolocha: paleta de verdes bosque y ocres de montaña, fondos sutiles con imágenes de bosque de pinos o montañas (sin interferir con la legibilidad), y elementos decorativos discretos coherentes con el tema. La interfaz SHALL ofrecer al usuario un control para alternar entre un tema claro y un tema oscuro, y SHALL aplicar la temática Tolocha de forma coherente y legible en ambos temas. El tema oscuro SHALL ser el predeterminado.

#### Scenario: Paleta y fondos temáticos
- **WHEN** un usuario ve la aplicación
- **THEN** las superficies y fondos utilizan la paleta y las imágenes de montaña/bosque de forma sutil y legible

#### Scenario: Identidad coherente
- **WHEN** un usuario navega por la aplicación
- **THEN** los colores, iconos y detalles decorativos mantienen una coherencia visual con el tema Tolocha en todas las secciones y estados

#### Scenario: Alternancia de tema
- **WHEN** un usuario pulsa el control de tema (sol/luna) en la interfaz
- **THEN** la interfaz alterna entre el tema claro y el oscuro conservando la identidad Tolocha y la legibilidad

#### Scenario: Tema por defecto oscuro
- **WHEN** un usuario sin preferencia guardada abre la aplicación
- **THEN** la interfaz se muestra en tema oscuro

### Requirement: Preferencia de tema recordada
La interfaz SHALL recordar la preferencia de tema del usuario: si hay sesión abierta, la preferencia guardada en el perfil del usuario (proporcionada por la API) SHALL aplicarse y mantenerse al navegar, recargar y volver a entrar; si no hay sesión, la preferencia elegida SHALL persistir en el dispositivo (localStorage) y aplicarse también tras recargar la página. La preferencia del perfil de un usuario con sesión SHALL tener prioridad sobre la del dispositivo.

#### Scenario: Preferencia con sesión abierta
- **WHEN** un usuario autenticado con una preferencia de tema guardada en su perfil abre o recarga la aplicación
- **THEN** la interfaz se muestra en ese tema sin volver a elegir

#### Scenario: Preferencia como invitado
- **WHEN** un usuario sin sesión elige un tema y recarga la página
- **THEN** la interfaz conserva el tema elegido en ese dispositivo

#### Scenario: La preferencia del perfil tiene prioridad
- **WHEN** un usuario inicia sesión y su preferencia de perfil difiere de la guardada en el dispositivo
- **THEN** la interfaz aplica la preferencia del perfil

#### Scenario: Guardado al cambiar con sesión
- **WHEN** un usuario autenticado cambia de tema desde la interfaz
- **THEN** la nueva preferencia se envía a la API y se aplica inmediatamente
