## Why

El reproductor de audio del frontend utiliza el endpoint `/api/v1/playback/{stationId}` para streaming, autenticado mediante la cookie httpOnly `tolocha-access`. Esta cookie expira a los 15 minutos (TTL del access token). Cuando el usuario lleva un tiempo reproduciendo y cambia de emisora, la petición HTTP del elemento `<audio>` falla con 401 porque la cookie ya no es válida. A diferencia de las peticiones `api.get/post`, el elemento `<audio>` no puede refrescar el token automáticamente ni reintentar, resultando en un fallo silencioso (sin audio, sin mensaje de error).

## What Changes

- El reproductor del frontend refrescará proactivamente el token de acceso antes de iniciar una nueva reproducción si el token está próximo a expirar o ya expiró.
- El flujo de cambio de emisora verificará la validez del token y, si es necesario, solicitará un nuevo par de tokens al endpoint de refresh antes de setear la URL del stream.
- Si el refresh falla (token de refresco inválido/expirado), el usuario recibirá feedback claro en lugar de un fallo silencioso.

## Capabilities

### New Capabilities

- `playback/token-refresh`: Capacidad del reproductor para mantener la sesión válida durante la reproducción, refrescando el token de acceso de forma proactiva antes de iniciar un nuevo stream cuando el token actual ha expirado o está próximo a expirar.

### Modified Capabilities

- `playback`: El escenario de reproducción vía proxy ahora contempla que el cliente puede necesitar refrescar su token antes de solicitar el stream, y que el fallo de autenticación debe manejarse con feedback al usuario.

## Impact

- **Frontend (`apps/web/src/stores/player.ts`)**: Lógica de `play()` para verificar y refrescar token antes de setear `audio.src`.
- **Frontend (`apps/web/src/lib/api.ts`)**: Posible exposición de función de verificación de expiración del token o reutilización de `refreshSession()`.
- **UX**: El usuario verá un estado de carga o mensaje si el refresh falla, en lugar de un fallo silencioso.
- **Sin cambios en backend**: El endpoint de refresh y el de playback no requieren modificaciones.
