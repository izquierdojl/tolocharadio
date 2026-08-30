# Favorites Specification (delta)

## ADDED Requirements

### Requirement: Reordenar favoritos
Un usuario autenticado SHALL poder establecer el orden de sus emisoras favoritas enviando la lista de `stationId` en el orden deseado. El sistema SHALL perseguir ese orden por cuenta y devolver la lista de favoritos en dicho orden en las consultas posteriores. Reordenar SHALL aceptar cualquier permutación de los favoritos actuales del usuario, y el orden así fijado SHALL ser privado de la cuenta.

#### Scenario: Reordenado de favoritos
- **WHEN** un usuario autenticado envía la lista de sus favoritos en un nuevo orden
- **THEN** el sistema persiste ese orden y devuelve la confirmación

#### Scenario: Lista con emisoras no favoritas
- **WHEN** un usuario envía un orden que incluye un `stationId` que no está entre sus favoritos
- **THEN** el sistema rechaza la operación con un error de conflicto sin modificar el orden guardado

#### Scenario: Reordenado con lista incompleta
- **WHEN** un usuario envía un orden que omite alguna de sus emisoras favoritas
- **THEN** el sistema rechaza la operación con un error de conflicto sin modificar el orden guardado

#### Scenario: Orden privado por cuenta
- **WHEN** una cuenta establece su orden de favoritos
- **THEN** ese orden no afecta al orden ni a la lista de ninguna otra cuenta

## MODIFIED Requirements

### Requirement: Listar favoritos
Un usuario autenticado SHALL poder listar sus emisoras favoritas con los datos completos de cada emisora. El orden devuelto SHALL ser el orden personalizado del usuario cuando este lo haya establecido; si el usuario aún no ha fijado un orden personalizado, el sistema SHALL ordenarlas por la fecha en que las añadió (más recientes primero). El orden resultante SHALL ser coherente (el mismo) para cualquier consumidor, tanto el frontend como herramientas externas.

#### Scenario: Listado de favoritos
- **WHEN** un usuario autenticado consulta sus favoritos
- **THEN** el sistema devuelve sus emisoras favoritas con sus datos completos, en el orden personalizado si existe o en orden cronológico inverso en caso contrario

#### Scenario: Listado tras reordenar
- **WHEN** un usuario ha establecido un orden personalizado y luego consulta sus favoritos
- **THEN** el sistema devuelve sus favoritos exactamente en ese orden personalizado

#### Scenario: Sin favoritos
- **WHEN** un usuario sin favoritos consulta su lista
- **THEN** el sistema devuelve una lista vacía

#### Scenario: Coherencia del orden entre consumidores
- **WHEN** el frontend y una herramienta externa consultan los favoritos de la misma cuenta
- **THEN** ambos obtienen la misma lista en el mismo orden personalizado
