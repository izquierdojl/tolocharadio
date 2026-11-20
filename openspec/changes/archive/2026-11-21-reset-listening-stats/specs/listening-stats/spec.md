# Spec Delta

## ADDED Requirements

### Requirement: Reinicio de las estadísticas de radio por el usuario

El usuario autenticado SHALL poder reiniciar sus estadísticas de radio con `DELETE /api/v1/stats/me`. La operación SHALL eliminar el tiempo acumulado y las escuchas registradas de radio del usuario, SHALL dejar las consultas de estadísticas de radio a cero o vacías y SHALL NOT afectar al historial, los favoritos ni las emisoras personalizadas. El tiempo escuchado después del reinicio SHALL volver a contabilizarse con normalidad.

#### Scenario: Reinicio de las estadísticas de radio

- **WHEN** un usuario autenticado solicita `DELETE /api/v1/stats/me`
- **THEN** el sistema responde con éxito y sus consultas de top, evolución, hábitos, géneros, países y recientes de radio devuelven cero o listas vacías

#### Scenario: El historial y los favoritos no se alteran

- **WHEN** un usuario reinicia sus estadísticas de radio
- **THEN** su historial de reproducción, sus favoritos y sus emisoras personalizadas permanecen intactos

#### Scenario: Escucha en curso durante el reinicio

- **WHEN** un usuario reinicia sus estadísticas de radio mientras una emisora está sonando
- **THEN** el tiempo escuchado antes del reinicio se descarta y solo se acumula el tiempo escuchado desde el reinicio

#### Scenario: Reinicio repetido

- **WHEN** un usuario que ya reinició sus estadísticas de radio vuelve a solicitar el reinicio
- **THEN** el sistema responde con éxito y las estadísticas de radio siguen a cero o vacías

#### Scenario: Aislamiento entre usuarios

- **WHEN** un usuario reinicia sus estadísticas de radio
- **THEN** las estadísticas de radio de las demás cuentas no cambian

#### Scenario: Reinicio sin credenciales

- **WHEN** un cliente sin token válido solicita `DELETE /api/v1/stats/me`
- **THEN** el sistema responde con un error 401 en el formato estándar y no modifica ninguna estadística
