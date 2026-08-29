# Favorites Specification

## Purpose

Permite a cada usuario guardar sus emisoras de radio favoritas, de forma aislada por cuenta, para acceder rápidamente a ellas desde el reproductor.

## Requirements

### Requirement: Añadir favorito
Un usuario autenticado SHALL poder añadir una emisora existente del catálogo a sus favoritos. El sistema SHALL rechazar añadir dos veces la misma emisora para el mismo usuario (sin duplicados).

#### Scenario: Favorito añadido
- **WHEN** un usuario autenticado añade una emisora existente a sus favoritos
- **THEN** el sistema guarda la relación usuario–emisora y devuelve la confirmación con su marca de tiempo

#### Scenario: Favorito duplicado
- **WHEN** un usuario añade una emisora que ya está entre sus favoritos
- **THEN** el sistema rechaza la operación con un error de conflicto sin crear un duplicado

#### Scenario: Emisora inexistente
- **WHEN** un usuario intenta añadir una emisora que no existe en el catálogo
- **THEN** el sistema responde con un error 404

### Requirement: Listar favoritos
Un usuario autenticado SHALL poder listar sus emisoras favoritas, ordenadas por la fecha en que las añadió (más recientes primero), con los datos completos de cada emisora.

#### Scenario: Listado de favoritos
- **WHEN** un usuario autenticado consulta sus favoritos
- **THEN** el sistema devuelve sus emisoras favoritas en orden cronológico inverso con sus datos completos

#### Scenario: Sin favoritos
- **WHEN** un usuario sin favoritos consulta su lista
- **THEN** el sistema devuelve una lista vacía

### Requirement: Eliminar favorito
Un usuario autenticado SHALL poder eliminar una emisora de sus favoritos. Eliminar una emisora que no estaba en favoritos SHALL considerarse éxito (sin error).

#### Scenario: Favorito eliminado
- **WHEN** un usuario autenticado elimina una emisora de sus favoritos
- **THEN** el sistema la quita de su lista y lo confirma

#### Scenario: Eliminación de emisora no favorita
- **WHEN** un usuario solicita eliminar una emisora que no está entre sus favoritos
- **THEN** el sistema responde como éxito sin modificar nada

### Requirement: Aislamiento entre usuarios
Los favoritos SHALL ser estrictamente privados de cada cuenta: ningún usuario podrá listar, añadir o eliminar favoritos de otro.

#### Scenario: Acceso a favoritos ajenos
- **WHEN** un usuario intenta manipular o leer los favoritos de otra cuenta
- **THEN** el sistema responde con un error 404 sin revelar información de la otra cuenta