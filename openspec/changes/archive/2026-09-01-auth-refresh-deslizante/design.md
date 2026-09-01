# auth-refresh-deslizante — Diseño

## Context

Ver proposal.md (Why). Estado actual relevante:

- `AuthService.refresh()` (apps/api/src/services/auth.ts:128) rota el token en cada uso: borra la fila de `refresh_tokens` e inserta una nueva (`issueTokens`).
- La tabla `refresh_tokens` tiene `id, userId, tokenHash, expiresAt, createdAt` — sin columnas extra ni migraciones pendientes.
- El flujo web (apps/web/src/lib/api.ts) ya es compatible con respuestas de refresh que devuelvan el mismo refresh token: solo usa `data.accessToken` y deja que el servidor re-emita las cookies.
- El bug: si la respuesta de un refresh no llega al navegador (recarga en vuelo, red), la rotación deja la cookie con un token que la BD ya borró → 401 permanente hasta re-login.

## Goals / Non-Goals

**Goals:**
- Eliminar la orfandad del token de refresco: ningún refresh en vuelo puede invalidar la cookie del cliente.
- Mantener la revocación efectiva en logout, cambio y restablecimiento de contraseña (borrado de filas).
- Sin migración de esquema.

**Non-Goals:**
- No perseguir la detección de robo de tokens estilo OAuth BCP (reuse detection completa): fuera de proporción para una app personal auto-alojada; se cubre el caso de reuso solo dentro de la ventana de gracia.
- No cambiar el frontend: el flujo actual ya funciona.

## Decisions

### D1. Refresh deslizante: no rotar mientras haya vida suficiente

En `refresh()`, con el token localizado y no expirado:

- **Vida restante > `REFRESH_ROTATE_THRESHOLD` (default 24 h):** se devuelve el **mismo** refresh token + access token nuevo. Se re-desliza la caducidad en BD (`expiresAt = now + jwtRefreshTtlMs`) y se re-emite la cookie con `Max-Age` renovado. No se borra ni inserta nada.

- **Vida restante ≤ umbral:** rotación con gracia (D2).

Alternativa considerada (descartada): rotar siempre + ventana de reuso estándar. Más seguro ante robo, pero requiere rastrear el sucesor de cada token (columna nueva o tabla auxiliar) y añade complejidad para un riesgo que no aplica a este despliegue.

### D2. Gracia de rotación sin cambios de esquema

En la rotación final no se borra la fila vieja: se le fija `expiresAt = now + REFRESH_GRACE_MS` (default 60 s) y se inserta la fila nueva con la caducidad normal.

Si llega un refresh con el token viejo:

- Dentro de la gracia (`expiresAt > now`): se trata como un refresh normal en estado "final de vida" → vuelve a rotar (re-gracia el viejo, emite otro nuevo) → **el cliente se recupera** en lugar de recibir 401.
- Fuera de la gracia (`expiresAt <= now`): 401 (la rama "expirado" existente ya lo cubre).

Así la ventana de orfandad se reduce a: rotación + respuesta perdida + cliente reusa el viejo tras 60 s → caso límite aceptable (equivalente a token caducado).

Alternativa considerada (descartada): columna `replacedByHash` para devolver literalmente el token sucesor. Requiere migración de esquema y no aporta nada que la re-rotación no consiga con menos código.

### D3. Configuración

Dos variables nuevas en `EnvSchema` (apps/api/src/config/env.ts), siguiendo el patrón `parseDuration`:

- `REFRESH_ROTATE_THRESHOLD` — duración, default `"24h"`.
- `REFRESH_GRACE_MS` — milisegundos, default `60000`.

Se documentan en `.env.example` y `docs/instalacion.md`.

### D4. Sin cambios en logout / changePassword / resetPassword

Siguen borrando filas de `refresh_tokens` por hash o por userId; la gracia no los afecta (revocación inmediata intacta).

## Risks / Trade-offs

- [Token de refresco robado sigue siendo válido hasta su expiración (sin rotación frecuente)] → Mitigación: aceptable en despliegue personal; la rotación final (24 h antes) y la revocación por logout/cambio de contraseña siguen acotando el daño. Si en el futuro se abre el registro público, se puede migrar a reuse detection (D1 alternative).
- [Reuso del token viejo dentro de la gracia rota de nuevo y puede encadenarse] → Mitigación: inofensivo; cada re-rotación devuelve un token válido al cliente legítimo y acorta la ventana del token antiguo.
- [Filas de tokens en gracia permanecen en BD hasta expirar] → Mitigación: expiran solas en 60 s; el borrado de expirados ya está implícito en la rama 401 de `refresh()`.

## Migration Plan

- Deploy normal vía release (bump minor). La lógica nueva es compatible con tokens emitidos por la versión anterior: un token existente con mucha vida seguirá el camino deslizante; uno con poca vida, el de rotación. No requiere migración de datos.
- Rollback: revertir el commit y redeploy; los tokens en BD siguen siendo válidos para el flujo antiguo.