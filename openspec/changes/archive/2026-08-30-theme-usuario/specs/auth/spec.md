## ADDED Requirements

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
