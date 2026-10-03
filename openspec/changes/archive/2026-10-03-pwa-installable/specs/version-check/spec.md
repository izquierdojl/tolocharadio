# Spec Delta

## MODIFIED Requirements

### Requirement: Comprobar actualizaciones disponibles
El sistema SHALL comprobar si hay una versión más reciente mediante el release de GitHub o un Service Worker en espera, y mostrar un único aviso de recarga en español.

#### Scenario: Hay una actualización disponible
- **WHEN** la versión del release más reciente en GitHub es mayor que la versión local
- **THEN** el footer muestra un enlace con el texto `-> vX.Y.Z` que apunta al release de GitHub y se abre en nueva pestaña

#### Scenario: No hay actualización disponible
- **WHEN** la versión del release más reciente en GitHub es igual a la versión local
- **THEN** el footer muestra solo la versión actual sin enlace de actualización

#### Scenario: Error de red o API
- **WHEN** la comprobación de actualizaciones falla (sin red, rate limit, error de API)
- **THEN** el footer muestra silenciosamente solo la versión actual sin indicar error

#### Scenario: Service Worker en espera
- **WHEN** hay un Service Worker nuevo instalado en espera mientras la app está abierta
- **THEN** el sistema muestra el mismo aviso único de "Hay nueva versión — Recargar" y al aceptarlo recarga con la versión nueva

#### Scenario: Sin doble aviso
- **WHEN** GitHub y el Service Worker señalan actualización a la vez
- **THEN** el usuario ve un solo aviso, no dos
