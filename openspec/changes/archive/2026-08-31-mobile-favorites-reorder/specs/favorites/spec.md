## MODIFIED Requirements

### Requirement: Reordenar favoritos
Un usuario autenticado SHALL poder establecer el orden de sus emisoras favoritas mediante un modo de edicion dedicado. Al activar el modo editar, la interfaz muestra handles de arrastre en cada tarjeta/fila; el usuario arrastra el handle (no la tarjeta completa) a la posicion deseada. El sistema SHALL perseguir ese orden por cuenta y devolver la lista de favoritos en dicho orden en las consultas posteriores. Reordenar SHALL aceptar cualquier permutacion de los favoritos actuales del usuario, y el orden asi fijado SHALL ser privado de la cuenta. El arrastre del handle SHALL funcionar tanto con raton (desktop) como con touch (movil/tablet) gracias a `touch-action: none` en el handle.

#### Scenario: Reordenado de favoritos
- **WHEN** un usuario autenticado en modo editar arrastra el handle de una emisora a una nueva posicion
- **THEN** el sistema persiste ese orden y devuelve la confirmacion

#### Scenario: Reordenado en movil por touch
- **WHEN** un usuario autenticado en un dispositivo tactil en modo editar arrastra el handle de favoritos a una nueva posicion
- **THEN** el sistema persiste ese orden igual que en desktop, sin que el browser interprete el gesto como scroll

#### Scenario: Lista con emisoras no favoritas
- **WHEN** un usuario envia un orden que incluye un `stationId` que no esta entre sus favoritos
- **THEN** el sistema rechaza la operacion con un error de conflicto sin modificar el orden guardado

#### Scenario: Reordenado con lista incompleta
- **WHEN** un usuario envia un orden que omite alguna de sus emisoras favoritas
- **THEN** el sistema rechaza la operacion con un error de conflicto sin modificar el orden guardado

#### Scenario: Orden privado por cuenta
- **WHEN** una cuenta establece su orden de favoritos
- **THEN** ese orden no afecta al orden ni a la lista de ninguna otra cuenta
