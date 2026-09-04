## ADDED Requirements

### Requirement: Preferencia de vista inicial en el perfil
El sistema SHALL almacenar en el perfil de cada usuario una preferencia de vista inicial (`explorar` | `favoritos` | `historial`), consultable y actualizable por el propio usuario autenticado, y SHALL devolverla en los datos públicos del perfil junto al resto de datos (id, email, nombre, tema, fecha de registro). El valor por defecto para usuarios nuevos y para usuarios existentes sin valor guardado SHALL ser `explorar`.

#### Scenario: Consulta de preferencia de vista inicial
- **WHEN** un usuario autenticado consulta su perfil
- **THEN** el sistema devuelve su preferencia de vista inicial (`explorar`, `favoritos` o `historial`) en los datos del perfil

#### Scenario: Actualización de preferencia de vista inicial
- **WHEN** un usuario autenticado envía una preferencia de vista inicial válida (`explorar`, `favoritos` o `historial`)
- **THEN** el sistema actualiza la preferencia en su perfil y la devuelve en la respuesta

#### Scenario: Preferencia inválida
- **WHEN** un usuario autenticado envía un valor de vista inicial que no es `explorar`, `favoritos` ni `historial`
- **THEN** el sistema responde con un error de validación y no modifica la preferencia

#### Scenario: Usuario nuevo por defecto
- **WHEN** se crea una cuenta nueva (registro)
- **THEN** la preferencia de vista inicial queda en `explorar` hasta que el usuario la cambie

#### Scenario: Usuario existente sin preferencia
- **WHEN** un usuario creado antes de esta funcionalidad consulta su perfil
- **THEN** el sistema devuelve `explorar` como valor de la preferencia (migración con valor por defecto)
