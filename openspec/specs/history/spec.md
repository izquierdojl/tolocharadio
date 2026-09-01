# History Specification

## Purpose

Registra el historial de reproducción de cada usuario para que pueda recuperar fácilmente las emisoras que escuchó, manteniéndolo aislado por cuenta y con un límite máximo de registros.

## Requirements

### Requirement: Registro de escucha
El sistema SHALL registrar un evento de historial cada vez que un usuario autenticado reproduce una emisora (desde búsqueda, favoritos o detalle). Cada evento asocia usuario, emisora y marca de tiempo.

#### Scenario: Escucha registrada
- **WHEN** un usuario autenticado comienza a reproducir una emisora
- **THEN** el sistema guarda un evento de historial con la emisora y el instante de reproducción

#### Scenario: Reescucha de la misma emisora
- **WHEN** un usuario reproduce una emisora que ya está en su historial
- **THEN** el sistema registra un nuevo evento con la marca de tiempo actual (puede actualizar o insertar, siempre reflejando la última escucha)

### Requirement: Límite de historial
El sistema SHALL mantener el historial por debajo de un límite máximo configurable de eventos por usuario, descartando los más antiguos cuando se supere.

#### Scenario: Se alcanza el límite
- **WHEN** el historial de un usuario alcanza el límite máximo y se registra una nueva escucha
- **THEN** el sistema descarta el evento más antiguo y conserva la escucha nueva

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

### Requirement: Aislamiento entre usuarios
El historial SHALL ser estrictamente privado de cada cuenta: ningún usuario podrá ver ni modificar el historial de otro.

#### Scenario: Acceso a historial ajeno
- **WHEN** un usuario intenta leer o borrar el historial de otra cuenta
- **THEN** el sistema responde con un error 404 sin revelar información de la otra cuenta