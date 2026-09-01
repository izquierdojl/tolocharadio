## MODIFIED Requirements

### Requirement: Reproducción persistente en el cliente
El reproductor del frontend SHALL mantener la emisora sonando y su estado (emisora actual, reproduciendo/pausado, volumen) aunque el usuario navegue entre vistas de la aplicación. Cuando el token de acceso haya expirado, el reproductor SHALL refrescarlo automáticamente antes de iniciar una nueva reproducción.

#### Scenario: La música continúa al navegar
- **WHEN** un usuario está reproduciendo una emisora y navega a otra sección
- **THEN** la emisora sigue sonando y el reproductor muestra la misma emisora y estado

#### Scenario: Control de reproducción
- **WHEN** un usuario usa los controles del reproductor flotante
- **THEN** el sistema inicia, pausa o cambia el volumen/emisora de forma inmediata

#### Scenario: Cambio de emisora con token expirado
- **WHEN** un usuario cambia de emisora y el token de acceso ha expirado
- **THEN** el reproductor refresca el token automáticamente y reproduce la nueva emisora sin interrupción perceptible para el usuario
