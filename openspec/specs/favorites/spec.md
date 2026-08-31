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

### Requirement: Reordenar favoritos
Un usuario autenticado SHALL poder establecer el orden de sus emisoras favoritas arrastrando la tarjeta completa de la emisora en modo tarjeta, o la fila completa en modo lista, a la posición deseada. El sistema SHALL perseguir ese orden por cuenta y devolver la lista de favoritos en dicho orden en las consultas posteriores. Reordenar SHALL aceptar cualquier permutación de los favoritos actuales del usuario, y el orden así fijado SHALL ser privado de la cuenta. El arrastre SHALL funcionar tanto con ratón (desktop) como con touch (móvil/tablet).

#### Scenario: Reordenado de favoritos
- **WHEN** un usuario autenticado arrastra una tarjeta de emisora en favoritos a una nueva posición
- **THEN** el sistema persiste ese orden y devuelve la confirmación

#### Scenario: Reordenado en móvil por touch
- **WHEN** un usuario autenticado en un dispositivo táctil arrastra una tarjeta o fila de favoritos a una nueva posición
- **THEN** el sistema persiste ese orden igual que en desktop

#### Scenario: Lista con emisoras no favoritas
- **WHEN** un usuario envía un orden que incluye un `stationId` que no está entre sus favoritos
- **THEN** el sistema rechaza la operación con un error de conflicto sin modificar el orden guardado

#### Scenario: Reordenado con lista incompleta
- **WHEN** un usuario envía un orden que omite alguna de sus emisoras favoritas
- **THEN** el sistema rechaza la operación con un error de conflicto sin modificar el orden guardado

#### Scenario: Orden privado por cuenta
- **WHEN** una cuenta establece su orden de favoritos
- **THEN** ese orden no afecta al orden ni a la lista de ninguna otra cuenta

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