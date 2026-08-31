# History Delete Station Specification

## Purpose

Permite a los usuarios eliminar emisoras individuales de su historial de reproducción, proporcionando control granular sobre qué registros conservar sin borrar todo el historial.

## Requirements

### Requirement: Eliminar emisora del historial
Un usuario autenticado SHALL poder eliminar una emisora específica de su historial de reproducción.

#### Scenario: Eliminación exitosa
- **WHEN** un usuario autenticado solicita eliminar una emisora de su historial
- **THEN** el sistema elimina el registro de esa emisora del historial y confirma la operación

#### Scenario: Emisora no encontrada
- **WHEN** un usuario intenta eliminar una emisora que no existe en su historial
- **THEN** el sistema responde con un error 404

#### Scenario: Emisora de otro usuario
- **WHEN** un usuario intenta eliminar una emisora del historial de otro usuario
- **THEN** el sistema responde con un error 404 sin revelar información

### Requirement: Validación de parámetros
El sistema SHALL validar que el identificador de la emisora sea válido antes de procesar la eliminación.

#### Scenario: Identificador inválido
- **WHEN** se recibe un identificador de emisora con formato inválido
- **THEN** el sistema responde con un error de validación