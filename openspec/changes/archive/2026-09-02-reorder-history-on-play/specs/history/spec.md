## ADDED Requirements

### Requirement: Actualización automática al reproducir
Cuando un usuario reproduce una emisora desde la pestaña de historial, la lista de historial SHALL actualizarse automáticamente para reflejar el nuevo orden, posicionando la emisora reproducida en la primera posición sin necesidad de recargar la página.

#### Scenario: Reordenamiento automático tras reproducir
- **WHEN** un usuario autenticado reproduce una emisora desde la pestaña de historial
- **THEN** la lista de historial se actualiza automáticamente y la emisora reproducida aparece en la primera posición

#### Scenario: Actualización sin interrupción de reproducción
- **WHEN** la lista de historial se actualiza automáticamente tras reproducir
- **THEN** la reproducción de la emisora continúa sin interrupción mientras la lista se reordena
