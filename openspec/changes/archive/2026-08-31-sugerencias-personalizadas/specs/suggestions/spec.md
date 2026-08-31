## Purpose

Permite a cada usuario autenticado gestionar sus sugerencias de género personalizadas, una lista propia de géneros de emisoras a modo de accesos rápidos que se muestran en la exploración, aislada por cuenta.

## ADDED Requirements

### Requirement: Listar sugerencias de género
Un usuario autenticado SHALL poder listar sus sugerencias de género personalizadas, cada una con su identificador y el género, en orden de creación (más antiguas primero). El sistema SHALL devolver únicamente las sugerencias de la cuenta, nunca las de otros usuarios.

#### Scenario: Listado de mis sugerencias
- **WHEN** un usuario autenticado consulta sus sugerencias de género
- **THEN** el sistema devuelve únicamente sus sugerencias, con su identificador y género, ordenadas por creación

#### Scenario: Sin sugerencias guardadas
- **WHEN** un usuario autenticado que aún no ha guardado sugerencias consulta su lista
- **THEN** el sistema devuelve una lista vacía

#### Scenario: Aislamiento entre cuentas
- **WHEN** un usuario consulta sus sugerencias de género
- **THEN** nunca aparecen sugerencias de otros usuarios

### Requirement: Añadir sugerencia de género
Un usuario autenticado SHALL poder añadir una sugerencia de género indicando un género no vacío. El sistema SHALL sanear el género antes de almacenarlo y SHALL rechazar añadir dos veces el mismo género para el mismo usuario, así como géneros vacíos o solo con espacios.

#### Scenario: Sugerencia añadida
- **WHEN** un usuario autenticado envía un género no vacío
- **THEN** el sistema guarda la sugerencia y la devuelve con su identificador

#### Scenario: Género duplicado
- **WHEN** un usuario intenta añadir un género que ya está entre sus sugerencias
- **THEN** el sistema rechaza la operación con un error de conflicto sin crear un duplicado

#### Scenario: Género vacío
- **WHEN** un usuario envía un género vacío o solo con espacios
- **THEN** el sistema responde con un error de validación y no guarda la sugerencia

#### Scenario: Sin autenticación
- **WHEN** una solicitud sin sesión intenta añadir una sugerencia de género
- **THEN** el sistema responde con un error 401

### Requirement: Eliminar sugerencia de género
Un usuario autenticado SHALL poder eliminar una de sus sugerencias de género por su identificador. Eliminar una sugerencia que no es suya o que no existe SHALL tratarse como éxito sin revelar datos ajenos.

#### Scenario: Sugerencia eliminada
- **WHEN** un usuario autenticado elimina una de sus sugerencias de género
- **THEN** el sistema la elimina y devuelve confirmación

#### Scenario: Sugerencia ajena o inexistente
- **WHEN** un usuario intenta eliminar una sugerencia de género que no es suya o que no existe
- **THEN** el sistema responde como éxito sin modificar nada

#### Scenario: Sin autenticación
- **WHEN** una solicitud sin sesión intenta eliminar una sugerencia de género
- **THEN** el sistema responde con un error 401