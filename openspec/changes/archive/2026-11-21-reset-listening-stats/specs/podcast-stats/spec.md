# Spec Delta

## ADDED Requirements

### Requirement: Reinicio de las estadísticas de podcasts por el usuario

El usuario autenticado SHALL poder reiniciar sus estadísticas de podcasts con `DELETE /api/v1/podcasts/stats`. La operación SHALL poner a cero el resumen, los rankings, la evolución, los hábitos, las categorías y las sesiones recientes del usuario. SHALL conservar las suscripciones, los favoritos, la cola, las descargas y el progreso de episodios (posición y completado).

#### Scenario: Reinicio de las estadísticas de podcasts

- **WHEN** un usuario autenticado solicita `DELETE /api/v1/podcasts/stats`
- **THEN** el sistema responde con éxito y su resumen devuelve todos los valores a cero y sus rankings, evolución, hábitos, categorías y recientes devuelven listas vacías o series a cero

#### Scenario: Datos funcionales de podcasts intactos

- **WHEN** un usuario reinicia sus estadísticas de podcasts
- **THEN** sus suscripciones, favoritos, cola, descargas y el progreso de sus episodios (posición y estado completado) permanecen intactos

#### Scenario: Reinicio repetido

- **WHEN** un usuario que ya reinició sus estadísticas de podcasts vuelve a solicitar el reinicio
- **THEN** el sistema responde con éxito y las estadísticas de podcasts siguen a cero o vacías

#### Scenario: Aislamiento entre usuarios

- **WHEN** un usuario reinicia sus estadísticas de podcasts
- **THEN** las estadísticas de podcasts de las demás cuentas no cambian

#### Scenario: Reinicio sin credenciales

- **WHEN** un cliente sin token válido solicita `DELETE /api/v1/podcasts/stats`
- **THEN** el sistema responde con un error 401 en el formato estándar y no modifica ninguna estadística

### Requirement: Corte de las sesiones anteriores al reinicio de podcasts

Las sesiones de podcasts anteriores al reinicio SHALL dejar de contabilizarse en resumen, rankings y recientes, y SHALL NOT recontarse aunque el cliente siga reportando su progreso. El tiempo escuchado después del reinicio SHALL volver a acumularse con normalidad.

#### Scenario: Sesión de podcast en curso durante el reinicio

- **WHEN** un usuario reinicia sus estadísticas de podcasts mientras un episodio está en reproducción
- **THEN** el tiempo anterior al reinicio deja de mostrarse y no se recontabiliza, y solo se acumula el tiempo escuchado desde el reinicio

#### Scenario: Nueva sesión después del reinicio

- **WHEN** un usuario escucha un episodio en una sesión de cliente nueva después de reiniciar sus estadísticas
- **THEN** esa sesión cuenta con normalidad en el resumen, los rankings y las escuchas recientes
