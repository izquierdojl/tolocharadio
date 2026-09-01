## MODIFIED Requirements

### Requirement: Refresco proactivo de token antes de reproducir
El reproductor del frontend SHALL verificar la validez del token de acceso antes de iniciar la reproducción de una nueva emisora. Si el token ha expirado, está próximo a expirar o no existe un token en memoria (sesión restaurada por cookie tras recargar la página), el reproductor SHALL solicitar un nuevo par de tokens al endpoint de refresco antes de realizar la petición de streaming. SHALL NO mostrar un error de sesión caducada cuando la sesión es válida pero el token no está en memoria.

#### Scenario: Token expirado al cambiar de emisora
- **WHEN** un usuario cambia de emisora y el token de acceso ha expirado
- **THEN** el reproductor refresca el token de forma transparente y reproduce la nueva emisora sin intervención del usuario

#### Scenario: Token válido al cambiar de emisora
- **WHEN** un usuario cambia de emisora y el token de acceso aún es válido
- **THEN** el reproductor reproduce la emisora directamente sin solicitar un refresco

#### Scenario: Sesión restaurada por cookie sin token en memoria
- **WHEN** un usuario recarga la página con una sesión viva (cookie de acceso válida) y reproduce una emisora sin que exista un token de acceso en memoria
- **THEN** el reproductor renueva el token de acceso mediante el endpoint de refresco y reproduce la emisora sin mostrar el error de sesión caducada

#### Scenario: Fallo en el refresco del token
- **WHEN** el reproductor intenta refrescar el token y el token de refresco es inválido o ha expirado
- **THEN** el reproductor muestra un mensaje de error indicando que la sesión ha caducado y que el usuario debe iniciar sesión de nuevo