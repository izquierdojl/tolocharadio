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
Un usuario autenticado SHALL poder listar su historial, ordenado de más reciente a más antiguo, con los datos completos de cada emisora.

#### Scenario: Listado de historial
- **WHEN** un usuario autenticado consulta su historial
- **THEN** el sistema devuelve sus eventos ordenados por fecha descendente con los datos de cada emisora

#### Scenario: Historial vacío
- **WHEN** un usuario sin historial lo consulta
- **THEN** el sistema devuelve una lista vacía

### Requirement: Limpiar historial
Un usuario autenticado SHALL poder borrar todo su historial de reproducción de una sola vez.

#### Scenario: Historial limpiado
- **WHEN** un usuario autenticado solicita limpiar su historial
- **THEN** el sistema elimina todos sus eventos y lo confirma

### Requirement: Aislamiento entre usuarios
El historial SHALL ser estrictamente privado de cada cuenta: ningún usuario podrá ver ni modificar el historial de otro.

#### Scenario: Acceso a historial ajeno
- **WHEN** un usuario intenta leer o borrar el historial de otra cuenta
- **THEN** el sistema responde con un error 404 sin revelar información de la otra cuenta