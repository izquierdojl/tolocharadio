# Spec Delta

## ADDED Requirements

### Requirement: Acciones de reproducción y encolado desde las listas de episodios
En las listas de episodios de podcasts (inicio, ficha de podcast y favoritos), cada episodio SHALL ofrecer un control de reproducir/pausar y un menú de cola con las acciones **a continuación** y **al final**. Reproducir SHALL iniciar o alternar la reproducción del episodio; encolar SHALL añadirlo a la cola y confirmarlo con un aviso. Si la cola alcanza su límite, el sistema SHALL mostrar el error devuelto sin perder el estado de la lista.

#### Scenario: Reproducir un episodio desde una lista
- **WHEN** un usuario activa reproducir en un episodio de una lista que tiene progreso guardado
- **THEN** el reproductor inicia el episodio reanudando su posición y la fila muestra el estado de pausa disponible

#### Scenario: Alternar el episodio actual desde una lista
- **WHEN** un usuario activa el control de un episodio que ya es el que está sonando
- **THEN** la reproducción se pausa o reanuda sin reiniciar el episodio

#### Scenario: Encolar a continuación
- **WHEN** un usuario elige “A continuación” en un episodio que no está en la cola
- **THEN** el episodio queda en el primer puesto de la cola y se muestra un aviso de confirmación

#### Scenario: Encolar al final
- **WHEN** un usuario elige “Al final” en un episodio que no está en la cola
- **THEN** el episodio queda en el último puesto de la cola y se muestra un aviso de confirmación

#### Scenario: Límite de cola alcanzado
- **WHEN** un usuario intenta encolar un episodio con la cola llena
- **THEN** se muestra el error de límite devuelto por la API y la cola no cambia

### Requirement: Episodio activo separado de la cola en la vista de cola
Mientras un episodio de podcast está activo (conectando, reproduciendo o reconectando), la vista de cola SHALL ocultarlo de la lista de pendientes y mostrarlo en un área distinta **En reproducción** con sus controles básicos. Al pausarlo, fallar o detenerlo, SHALL volver a su posición original en la lista; al iniciar otro episodio, el anterior SHALL reaparecer automáticamente. La cola persistida en el servidor NO SHALL modificarse por este comportamiento.

#### Scenario: Episodio en reproducción oculto de la lista
- **WHEN** un episodio de la cola está sonando
- **THEN** no aparece en la lista de pendientes y se muestra en el área “En reproducción”

#### Scenario: Pausa devuelve el episodio a la cola
- **WHEN** el usuario pausa el episodio activo
- **THEN** el área “En reproducción” desaparece y el episodio vuelve a su posición original en la lista de pendientes

#### Scenario: Cambio de episodio en reproducción
- **WHEN** el usuario inicia otro episodio de la cola mientras el anterior sigue activo
- **THEN** el anterior reaparece en la cola y el nuevo se muestra como “En reproducción”

#### Scenario: Episodio activo que no estaba en la cola
- **WHEN** el episodio activo se inició desde la ficha del podcast y no pertenece a la cola
- **THEN** se muestra en “En reproducción” y al pausarlo no se añade automáticamente a la cola

#### Scenario: Recarga de la página durante la reproducción
- **WHEN** la página se recarga mientras un episodio de la cola está sonando
- **THEN** el episodio sigue en la cola del servidor y aparece como pendiente al perderse el estado local del reproductor

### Requirement: Reposicionamiento de episodios ya encolados
Al encolar un episodio que ya pertenece a la cola, el sistema SHALL moverlo a la posición solicitada en lugar de duplicarlo o ignorarlo: **a continuación** lo sitúa en el primer puesto y **al final** en el último. El movimiento SHALL incrementar la revisión de la cola y respetar el límite de episodios.

#### Scenario: Mover a continuación un episodio ya encolado
- **WHEN** un usuario elige “A continuación” en un episodio que ya está en la cola pero no en el primer puesto
- **THEN** el episodio pasa al primer puesto sin duplicarse y la revisión aumenta

#### Scenario: Mover al final un episodio ya encolado
- **WHEN** un usuario elige “Al final” en un episodio que ya está en la cola pero no en el último puesto
- **THEN** el episodio pasa al último puesto sin duplicarse y la revisión aumenta

#### Scenario: Episodio ya en la posición solicitada
- **WHEN** el episodio ya ocupa el primer puesto al pedir “A continuación” o el último al pedir “Al final”
- **THEN** la cola no se duplica ni se reordena

### Requirement: Vaciado completo de la cola con conservación opcional del episodio cargado
El endpoint autenticado `DELETE /api/v1/podcasts/queue` SHALL vaciar la cola del usuario e incrementar su revisión. Si se envía `keepEpisodeId` y ese episodio pertenece a la cola, SHALL conservarlo como único elemento en la primera posición y eliminar el resto. La operación SHALL ser idempotente, no SHALL afectar a otros usuarios ni a la reproducción en curso.

#### Scenario: Vaciar la cola completa
- **WHEN** un usuario autenticado envía `DELETE /api/v1/podcasts/queue` sin `keepEpisodeId`
- **THEN** el servidor responde `200` con la cola vacía y la revisión incrementada

#### Scenario: Vaciar conservando el episodio cargado
- **WHEN** un usuario envía `DELETE /api/v1/podcasts/queue?keepEpisodeId=42` y el episodio 42 está en su cola
- **THEN** la cola queda con el episodio 42 en la primera posición y el resto se elimina

#### Scenario: Conservar un episodio que no está en la cola
- **WHEN** el `keepEpisodeId` enviado no pertenece a la cola del usuario
- **THEN** el valor se ignora y la cola se vacía por completo

#### Scenario: Vaciar una cola ya vacía
- **WHEN** un usuario envía el vaciado con la cola vacía
- **THEN** el servidor responde `200` con la cola vacía sin error

#### Scenario: La reproducción continúa tras vaciar
- **WHEN** un usuario vacía la cola mientras un episodio está sonando
- **THEN** la reproducción no se detiene y el episodio conservado vuelve a la lista al pausarlo

#### Scenario: Aislamiento entre usuarios
- **WHEN** un usuario vacía su cola
- **THEN** la cola de ningún otro usuario cambia
