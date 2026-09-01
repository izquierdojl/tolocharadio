## Purpose

Capacidad del reproductor para mantener la sesión válida durante la reproducción, refrescando el token de acceso de forma proactiva antes de iniciar un nuevo stream cuando el token actual ha expirado o está próximo a expirar.

## ADDED Requirements

### Requirement: Refresco proactivo de token antes de reproducir
El reproductor del frontend SHALL verificar la validez del token de acceso antes de iniciar la reproducción de una nueva emisora. Si el token ha expirado o está próximo a expirar, el reproductor SHALL solicitar un nuevo par de tokens al endpoint de refresco antes de realizar la petición de streaming.

#### Scenario: Token expirado al cambiar de emisora
- **WHEN** un usuario cambia de emisora y el token de acceso ha expirado
- **THEN** el reproductor refresca el token de forma transparente y reproduce la nueva emisora sin intervención del usuario

#### Scenario: Token válido al cambiar de emisora
- **WHEN** un usuario cambia de emisora y el token de acceso aún es válido
- **THEN** el reproductor reproduce la emisora directamente sin solicitar un refresco

#### Scenario: Fallo en el refresco del token
- **WHEN** el reproductor intenta refrescar el token y el token de refresco es inválido o ha expirado
- **THEN** el reproductor muestra un mensaje de error indicando que la sesión ha caducado y que el usuario debe iniciar sesión de nuevo

### Requirement: Feedback visual durante el refresco
El reproductor SHALL mantener el estado de carga (buffering) visible mientras se realiza el refresco del token, de forma que el usuario perciba que la acción está en curso.

#### Scenario: Estado de carga durante refresco
- **WHEN** el reproductor está refrescando el token antes de iniciar la reproducción
- **THEN** el indicador de buffering permanece visible hasta que el stream comienza o falla
