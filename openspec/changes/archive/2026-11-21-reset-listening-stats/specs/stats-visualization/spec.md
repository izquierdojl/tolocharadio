# Spec Delta

## ADDED Requirements

### Requirement: Reinicio de estadísticas desde el perfil

El perfil SHALL mostrar una sección "Estadísticas de escucha" con dos acciones independientes para reiniciar las estadísticas de radio y de podcasts. Cada acción SHALL pedir confirmación explícita e indicar que el borrado es irreversible, SHALL informar del resultado en español y SHALL refrescar las estadísticas afectadas sin modificar las de la otra sección. La acción de podcasts SHALL ocultarse cuando la sección de podcasts esté deshabilitada en el servidor.

#### Scenario: Acciones visibles y separadas

- **WHEN** un usuario autenticado abre `/perfil`
- **THEN** ve la sección "Estadísticas de escucha" con una acción para reiniciar las estadísticas de radio y otra para las de podcasts

#### Scenario: Confirmación antes de reiniciar

- **WHEN** el usuario pulsa una de las acciones de reinicio
- **THEN** aparece un diálogo de confirmación que explica que la acción es irreversible y no se envía ninguna petición hasta confirmar

#### Scenario: Cancelar el reinicio

- **WHEN** el usuario cancela el diálogo de confirmación
- **THEN** no se borra ninguna estadística y las páginas de estadísticas conservan sus datos

#### Scenario: Reinicio de radio desde el perfil

- **WHEN** el usuario confirma el reinicio de sus estadísticas de radio
- **THEN** ve un aviso de éxito en español y las estadísticas de radio se recargan sin datos, mientras las de podcasts permanecen sin cambios

#### Scenario: Reinicio de podcasts desde el perfil

- **WHEN** el usuario confirma el reinicio de sus estadísticas de podcasts
- **THEN** ve un aviso de éxito en español y las estadísticas de podcasts se recargan sin datos, mientras las de radio permanecen sin cambios

#### Scenario: Error al reiniciar

- **WHEN** la petición de reinicio falla
- **THEN** el usuario ve un aviso de error en español y las estadísticas afectadas no cambian

#### Scenario: Reinicio en curso

- **WHEN** una petición de reinicio está en curso
- **THEN** la acción y el diálogo se deshabilitan y no se envían peticiones duplicadas

#### Scenario: Podcasts deshabilitados

- **WHEN** el servidor tiene deshabilitada la sección de podcasts
- **THEN** el perfil no muestra la acción para reiniciar las estadísticas de podcasts
