# Auth Specification

## Purpose

Gestiona la identidad de los usuarios de TolochaRadio: registro, autenticación mediante tokens JWT (acceso y refresco), cierre de sesión y gestión de perfil y contraseña.

## Requirements

### Requirement: Registro de usuario
El sistema SHALL permitir crear una cuenta con email y contraseña. El correo debe ser único y válido, y la contraseña debe cumplir una política mínima de seguridad. El registro SHALL poder desactivarse mediante configuración del servidor, en cuyo caso la API rechazará toda solicitud de registro con un error 403 y un mensaje claro.

#### Scenario: Registro exitoso
- **WHEN** un usuario envía un email y una contraseña válidos al endpoint de registro
- **THEN** el sistema crea la cuenta, almacena la contraseña de forma segura (hash) y devuelve un par de tokens (acceso y refresco) con los datos básicos del usuario

#### Scenario: Email duplicado
- **WHEN** un usuario intenta registrarse con un email ya existente
- **THEN** el sistema responde con un error de conflicto y no crea ninguna cuenta

#### Scenario: Registro deshabilitado
- **WHEN** el flag de registro está desactivado y un usuario intenta registrarse
- **THEN** el sistema responde con un error 403 indicando que el registro está deshabilitado

#### Scenario: Datos inválidos
- **WHEN** el usuario envía un email malformado o una contraseña que no cumple la política mínima
- **THEN** el sistema responde con un error de validación detallado y no crea la cuenta

### Requirement: Inicio de sesión
El sistema SHALL permitir a un usuario autenticarse con sus credenciales. En caso de éxito devuelve un token JWT de acceso de corta duración y un token de refresco de larga duración. En caso de credenciales incorrectas la respuesta debe ser indistinguible (mismo error) para no revelar si el email existe.

#### Scenario: Login exitoso
- **WHEN** un usuario envía credenciales correctas al endpoint de login
- **THEN** el sistema devuelve un token de acceso, un token de refresco y los datos del perfil

#### Scenario: Credenciales incorrectas
- **WHEN** un usuario envía un email o contraseña incorrectos
- **THEN** el sistema responde con un error 401 sin indicar qué campo falló

### Requirement: Renovación de tokens
El sistema SHALL aceptar un token de refresco válido y no revocado para emitir un nuevo token de acceso. Mientras el token de refresco tenga vida restante suficiente, el sistema SHALL renovar su caducidad **sin rotarlo** (mismo token de refresco). Cuando el token de refresco esté al final de su vida, el sistema SHALL rotarlo: emitir un token nuevo y mantener el anterior válido durante una ventana de gracia corta. SHALL rechazar tokens de refresco revocados, expirados, malformados o reutilizados fuera de la ventana de gracia.

#### Scenario: Refresco exitoso
- **WHEN** un usuario envía un token de refresco válido con vida restante suficiente al endpoint de renovación
- **THEN** el sistema devuelve un token de acceso nuevo y el mismo token de refresco, renovando su caducidad sin revocar el anterior

#### Scenario: Rotación al final de la vida
- **WHEN** un usuario envía un token de refresco válido al que le queda menos vida que el umbral de rotación
- **THEN** el sistema emite un token de refresco nuevo y un token de acceso nuevo, y mantiene el token anterior válido durante la ventana de gracia

#### Scenario: Reuso del token anterior dentro de la ventana de gracia
- **WHEN** un cliente envía un token de refresco ya rotado pero todavía dentro de su ventana de gracia
- **THEN** el sistema no responde con un error: emite un token de refresco nuevo y un token de acceso nuevo, de forma que el cliente recupera la sesión

#### Scenario: Reuso del token anterior fuera de la ventana de gracia
- **WHEN** un cliente envía un token de refresco ya rotado y fuera de su ventana de gracia
- **THEN** el sistema responde con un error 401 y no emite tokens nuevos

#### Scenario: Refresco con token inválido
- **WHEN** un usuario envía un token de refresco expirado, revocado o malformado
- **THEN** el sistema responde con un error 401 y no emite tokens nuevos

### Requirement: Cierre de sesión
El sistema SHALL permitir a un usuario cerrar sesión revocando su token de refresco actual de forma que deje de ser válido para futuras renovaciones.

#### Scenario: Logout exitoso
- **WHEN** un usuario autenticado envía su token de refresco al endpoint de logout
- **THEN** el sistema revoca ese token y los intentos posteriores de renovarlo fallan con 401

### Requirement: Acceso con token JWT
Los endpoints protegidos SHALL requerir un token JWT de acceso válido y no expirado en la cabecera de autorización. El sistema SHALL extraer la identidad del usuario desde el token y rechazar solicitudes sin token o con token inválido con un error 401.

#### Scenario: Solicitud autenticada
- **WHEN** un cliente envía un token JWT de acceso válido a un endpoint protegido
- **THEN** el sistema identifica al usuario a partir del token y procesa la solicitud

#### Scenario: Solicitud sin token o con token inválido
- **WHEN** un cliente envía una solicitud a un endpoint protegido sin token, con token expirado o con token malformado
- **THEN** el sistema responde con un error 401

### Requirement: Perfil de usuario
El sistema SHALL permitir a un usuario autenticado consultar sus datos de perfil (nombre, email, fecha de registro) y cambiar su nombre de usuario y contraseña aportando la contraseña actual.

#### Scenario: Consulta de perfil
- **WHEN** un usuario autenticado consulta su perfil
- **THEN** el sistema devuelve sus datos básicos sin exponer el hash de la contraseña

#### Scenario: Cambio de contraseña
- **WHEN** un usuario autenticado envía su contraseña actual y una contraseña nueva válida
- **THEN** el sistema actualiza el hash de la contraseña y revoca los tokens de refresco emitidos con anterioridad

#### Scenario: Cambio de contraseña con contraseña actual incorrecta
- **WHEN** un usuario envía una contraseña actual incorrecta
- **THEN** el sistema responde con un error 401 y no modifica la contraseña

### Requirement: Recuperación de contraseña
El sistema SHALL permitir a un usuario que ha olvidado su contraseña solicitar un token de recuperación de un solo uso y de duración limitada, y posteriormente usarlo para establecer una contraseña nueva. Los tokens de recuperación SHALL invalidarse tras su uso o expiración. Mientras no se configure un servicio de correo, la entrega del token SHALL ser transparente al cliente para permitir su uso en el propio flujo de la interfaz.

#### Scenario: Solicitud de recuperación
- **WHEN** un usuario solicita la recuperación de su contraseña con el email de su cuenta
- **THEN** el sistema genera un token de recuperación de un solo uso con caducidad y lo entrega de forma configurable (por correo si hay SMTP, o en la respuesta si no lo hay), sin revelar si el email existe frente a un email inexistente

#### Scenario: Restablecimiento de contraseña
- **WHEN** un usuario envía un token de recuperación válido no expirado junto con una contraseña nueva válida
- **THEN** el sistema actualiza la contraseña, invalida el token de recuperación y revoca los tokens de refresco previos

#### Scenario: Token de recuperación inválido o expirado
- **WHEN** un usuario envía un token de recuperación expirado, ya usado o malformado
- **THEN** el sistema responde con un error y no modifica la contraseña

### Requirement: Preferencia de tema en el perfil
El sistema SHALL almacenar en el perfil de cada usuario una preferencia de tema de interfaz (`light` | `dark`), consultable y actualizable por el propio usuario autenticado, y SHALL devolverla en los datos públicos del perfil junto al resto de datos (id, email, nombre, fecha de registro). El valor por defecto para usuarios nuevos SHALL ser `dark`.

#### Scenario: Consulta de preferencia de tema
- **WHEN** un usuario autenticado consulta su perfil
- **THEN** el sistema devuelve su preferencia de tema (`light` o `dark`) en los datos del perfil

#### Scenario: Actualización de preferencia de tema
- **WHEN** un usuario autenticado envía una preferencia de tema válida (`light` o `dark`)
- **THEN** el sistema actualiza la preferencia en su perfil y la devuelve en la respuesta

#### Scenario: Preferencia inválida
- **WHEN** un usuario autenticado envía un valor de tema que no es `light` ni `dark`
- **THEN** el sistema responde con un error de validación y no modifica la preferencia

#### Scenario: Usuario nuevo por defecto
- **WHEN** se crea una cuenta nueva (registro o restablecimiento)
- **THEN** la preferencia de tema queda en `dark` hasta que el usuario la cambie