# auth-refresh-deslizante

## Why

Al recargar la página se pierde la sesión y hay que volver a iniciar sesión. La causa: el endpoint de refresh **rota el token de refresco en cada uso** (borra el viejo y crea uno nuevo). Si una petición de refresh se procesa en el servidor pero su `Set-Cookie` no llega a aplicarse en el navegador (recarga de página con la petición en vuelo, red cortada), la cookie queda con un token que la base de datos ya no conoce: todos los refrescos posteriores fallan con 401 hasta un nuevo login.

## What Changes

- El endpoint `POST /auth/refresh` deja de rotar el token de refresco en cada uso: mientras el token tenga vida restante (por defecto más de 24 h), devuelve **el mismo token de refresco** junto con un token de acceso nuevo, re-emitiendo la cookie con el `Max-Age` renovado y sin tocar la fila de la base de datos.
- Solo cuando el token de refresco está al final de su vida (por defecto menos de 24 h restantes) se rota: se emite un token nuevo y el anterior queda **válido durante una ventana de gracia corta** (60 s) para que una rotación con respuesta perdida no deje al cliente huérfano.
- El cierre de sesión, el cambio de contraseña y el restablecimiento de contraseña siguen revocando los tokens de refresco como hasta ahora (sin cambios de comportamiento).
- La API responde igual que antes: nuevo par de tokens (acceso siempre nuevo; refresco idéntico mientras esté en su vida normal).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `auth`: cambia el requisito "Renovación de tokens" — la política de rotación pasa de "rotar siempre" a "deslizante con rotación solo al final de la vida y ventana de gracia".

## Impact

- `apps/api/src/services/auth.ts` — lógica de `refresh()` (rotación condicional + gracia).
- `apps/api/src/config/env.ts` — nuevas variables de configuración para los umbrales (vida mínima para no rotar y duración de la gracia), con valores por defecto.
- `apps/api/src/routes/auth.ts` — sin cambios funcionales (los cookies se siguen emitiendo igual).
- Tests de la API: casos de refresh sin rotación, rotación al final de vida y reuso dentro de la gracia.
- Especificación `openspec/specs/auth/spec.md` — actualización del requisito de renovación.