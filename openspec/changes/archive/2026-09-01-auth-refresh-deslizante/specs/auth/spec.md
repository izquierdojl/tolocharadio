## MODIFIED Requirements

### Requirement: Renovación de tokens
El sistema SHALL aceptar un token de refresco válido y no revocado para emitir un nuevo token de acceso. Mientras el token de refresco tenga vida restante suficiente, el sistema SHALL renovar su caducidad **sin rotarlo** (mismo token de refresco). Cuando el token de refresco esté al final de su vida, el sistema SHALL rotarlo: emitir un token nuevo y mantener el anterior válido durante una ventana de gracia corta. SHALL rechazar tokens de refresco revocados, expirados, malformados o reutilizados fuera de la ventana de gracia.

#### Scenario: Refresco exitoso
- **WHEN** un usuario envía un token de refresco válido con vida restante suficiente al endpoint de renovación
- **THEN** el sistema devuelve un token de acceso nuevo y el mismo token de refresco, renovando su caducidad sin revocar el anterior

#### Scenario: Rotación al final de la vida
- **WHEN** un usuario envía un token de refresco válido al que le queda menos vida que el umbral de rotación
- **THEN** el sistema emite un token de refresco nuevo y un token de acceso nuevo, y mantiene el token anterior válido durante la ventana de gracia

#### Scenario: Reuso del token anterior dentro de la ventana de gracia
- **WHEN** un cliente envía un token de refresco ya rotado pero todavía dentro de su ventana de gracia
- **THEN** el sistema no responde con un error: emite un token de refresco nuevo y un token de acceso nuevo, de forma que el cliente recupera la sesión

#### Scenario: Reuso del token anterior fuera de la ventana de gracia
- **WHEN** un cliente envía un token de refresco ya rotado y fuera de su ventana de gracia
- **THEN** el sistema responde con un error 401 y no emite tokens nuevos

#### Scenario: Refresco con token inválido
- **WHEN** un usuario envía un token de refresco expirado, revocado o malformado
- **THEN** el sistema responde con un error 401 y no emite tokens nuevos