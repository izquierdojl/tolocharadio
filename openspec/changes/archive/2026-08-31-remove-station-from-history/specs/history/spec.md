## MODIFIED Requirements

### Requirement: Limpiar historial
Un usuario autenticado SHALL poder borrar todo su historial de reproducción de una sola vez, o borrar emisoras individuales del historial.

#### Scenario: Historial limpiado
- **WHEN** un usuario autenticado solicita limpiar su historial
- **THEN** el sistema elimina todos sus eventos y lo confirma

#### Scenario: Emisora eliminada del historial
- **WHEN** un usuario autenticado solicita eliminar una emisora específica de su historial
- **THEN** el sistema elimina solo ese registro y confirma la operación

#### Scenario: Emisora no encontrada en historial
- **WHEN** un usuario intenta eliminar una emisora que no está en su historial
- **THEN** el sistema responde con un error 404
