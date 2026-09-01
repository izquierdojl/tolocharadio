## MODIFIED Requirements

### Requirement: Listar historial
Un usuario autenticado SHALL poder listar su historial, ordenado de mas reciente a mas antiguo, con los datos completos de cada emisora y una representacion de tiempo relativo desde la ultima reproduccion.

#### Scenario: Listado de historial con tiempo relativo
- **WHEN** un usuario autenticado consulta su historial
- **THEN** el sistema devuelve sus eventos ordenados por fecha descendente con los datos de cada emisora y el campo `playedAt` (timestamp Unix en milisegundos)

#### Scenario: Historial vacio
- **WHEN** un usuario sin historial lo consulta
- **THEN** el sistema devuelve una lista vacia

#### Scenario: Visualizacion de tiempo relativo
- **WHEN** la UI renderiza un item del historial
- **THEN** muestra el tiempo transcurrido desde la reproduccion en formato legible ("hace un momento", "hace N minutos", "hace N horas", "hace N dias") con la fecha y hora absoluta completa disponible como tooltip

#### Scenario: Formato de tiempo relativo por rangos
- **WHEN** la diferencia entre ahora y `playedAt` es menor a 60 segundos
- **THEN** muestra "hace un momento"

- **WHEN** la diferencia es menor a 60 minutos
- **THEN** muestra "hace N minuto(s)" con pluralizacion correcta

- **WHEN** la diferencia es menor a 24 horas
- **THEN** muestra "hace N hora(s)" con pluralizacion correcta

- **WHEN** la diferencia es mayor o igual a 24 horas
- **THEN** muestra "hace N dia(s)" con pluralizacion correcta
