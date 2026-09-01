## Purpose

Mostrar al usuario la versión actual de la aplicación en el footer y detectar automáticamente si hay una versión más reciente disponible en GitHub, proporcionando un enlace directo al release.

## ADDED Requirements

### Requirement: Mostrar versión actual
El sistema SHALL mostrar la versión actual de la aplicación (extraída de `package.json`) en una sección "Acerca de..." accesible desde el menú de usuario (desktop) y menú hamburguesa (mobile).

#### Scenario: Versión visible en "Acerca de..."
- **WHEN** el usuario abre el menú de usuario o el menú hamburguesa
- **THEN** se muestra un item "Acerca de..." que, al seleccionarse, muestra la versión actual en formato `vX.Y.Z` (ej: `v0.16.0`)

#### Scenario: Versión enlaza al repositorio
- **WHEN** el usuario hace clic en la versión mostrada
- **THEN** se abre el repositorio de GitHub en una nueva pestaña

### Requirement: Comprobar actualizaciones disponibles
El sistema SHALL comprobar si hay un release más reciente en GitHub al cargar la página, comparando la versión local con la última release publicada.

#### Scenario: Hay una actualización disponible
- **WHEN** la versión del release más reciente en GitHub es mayor que la versión local
- **THEN** la sección "Acerca de..." muestra un enlace con el texto `-> vX.Y.Z` que apunta al release de GitHub y se abre en nueva pestaña

#### Scenario: No hay actualización disponible
- **WHEN** la versión del release más reciente en GitHub es igual a la versión local
- **THEN** la sección "Acerca de..." muestra solo la versión actual sin enlace de actualización

#### Scenario: Error de red o API
- **WHEN** la comprobación de actualizaciones falla (sin red, rate limit, error de API)
- **THEN** la sección "Acerca de..." muestra silenciosamente solo la versión actual sin indicar error

### Requirement: Cache de comprobación
El sistema SHALL cachear el resultado de la comprobación de actualizaciones en `sessionStorage` para evitar requests repetidos a la API de GitHub.

#### Scenario: Cache válida
- **WHEN** se ha comprobado hace menos de 5 minutos
- **THEN** se usa el resultado cacheado sin hacer un nuevo request

#### Scenario: Cache expirada
- **WHEN** han pasado más de 5 minutos desde la última comprobación
- **THEN** se realiza una nueva comprobación contra la API de GitHub

### Requirement: Comparación semver correcta
El sistema SHALL comparar versiones usando lógica semver (major.minor.patch), no comparación de strings.

#### Scenario: Versión minor superior
- **WHEN** la versión local es `0.9.0` y el release es `0.16.0`
- **THEN** el sistema detecta que hay una actualización disponible

#### Scenario: Versión patch superior
- **WHEN** la versión local es `0.16.0` y el release es `0.16.1`
- **THEN** el sistema detecta que hay una actualización disponible

#### Scenario: Versiones iguales
- **WHEN** la versión local es `0.16.0` y el release es `v0.16.0`
- **THEN** el sistema determina que no hay actualización (ignora prefijo `v`)
