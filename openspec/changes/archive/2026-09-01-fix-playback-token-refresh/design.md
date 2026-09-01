## Context

El reproductor de audio del frontend (`apps/web/src/stores/player.ts`) utiliza un `HTMLAudioElement` cuyo `src` se setea a `/api/v1/playback/{stationId}`. Este endpoint requiere autenticación mediante la cookie httpOnly `tolocha-access` (TTL: 15 minutos). El `<audio>` no puede enviar cabeceras `Authorization` ni ejecutar lógica de refresh — depende exclusivamente de la cookie.

El frontend ya tiene un mecanismo de refresh en `apps/web/src/lib/api.ts` (`refreshSession()`) que usan las peticiones `api.get/post/etc.` al recibir un 401. Pero el `<audio>` no pasa por ese wrapper, así que nunca refresca el token.

Véase `proposal.md` para la motivación completa.

## Goals / Non-Goals

**Goals:**
- Que el cambio de emisora funcione siempre, independientemente de si el token de acceso ha expirado durante la reproducción.
- Mantener la experiencia fluida: el usuario no debe percibir el refresco del token.
- Dar feedback claro si la sesión ha caducado (refresh token inválido).

**Non-Goals:**
- Cambiar el TTL del access token (15 min es razonable por seguridad).
- Modificar el endpoint de playback o el backend.
- Implementar un mecanismo de refresh token diferente al ya existente.
- Refrescar el token proactivamente durante la reproducción de una emisora (solo al cambiar).

## Decisions

### Decisión 1: Refresco proactivo en `play()` antes de setear `audio.src`

**Elección:** Antes de setear `audio.src` en la función `play()` del player store, verificar si el token necesita refrescarse y hacerlo si es necesario.

**Alternativas consideradas:**
- **Interceptar el error `error` del `<audio>` y reintentar:** Rechazado porque el evento `error` del `HTMLAudioElement` no expone el código HTTP de la respuesta (no podemos distinguir un 401 de un error de red o stream caído). Además, añadiría latencia visible al usuario.
- **Hacer un `fetch` previo al playback para verificar auth:** Rechazado porque duplicaría la petición (una para verificar, otra para el stream) y añadiría latencia innecesaria.
- **No autenticar el playback (hacerlo público):** Rechazado porque el endpoint de playback registra el historial de reproducción (`ctx.history.record`), lo que requiere identificar al usuario.

**Implementación:**
1. Exponer una función `ensureValidToken()` en `api.ts` que verifique si el access token está próximo a expirar (o ya expiró) y, si es necesario, llame a `refreshSession()`.
2. En `player.ts`, la función `play()` llamará a `ensureValidToken()` antes de setear `audio.src`. Si el refresh falla, se muestra un toast de error y no se inicia la reproducción.

### Decisión 2: Verificar expiración decodificando el JWT en el cliente

**Elección:** Decodificar el JWT access token en el cliente (sin verificar firma, solo lectura del claim `exp`) para determinar si ha expirado o está próximo a expirar.

**Alternativas consideradas:**
- **Siempre refrescar antes de reproducir:** Rechazado porque generaría un refresh innecesario en la mayoría de los casos (el token suele ser válido), añadiendo latencia y carga al servidor.
- **Usar un timestamp guardado en localStorage:** Rechazado porque no es fiable si el token se refrescó desde otra pestaña o si el reloj del dispositivo está desincronizado.

**Implementación:**
- El JWT ya se almacena en la variable `accessToken` de `api.ts`. Se decodifica el payload (base64url) para leer `exp`, se compara con `Date.now()`, y si queda menos de un margen (p. ej. 30 segundos) o ya expiró, se refresca.

### Decisión 3: Margen de seguridad de 30 segundos

**Elección:** Refrescar el token si quedan menos de 30 segundos antes de su expiración.

**Razón:** Compensa posibles desincronizaciones de reloj entre cliente y servidor, y el tiempo de red necesario para la petición de refresh. 30 segundos es un margen conservador que no genera refreshes excesivos (el token dura 15 minutos).

## Risks / Trade-offs

- **[Riesgo] Decodificación del JWT en el cliente:** El cliente lee el claim `exp` sin verificar la firma. Esto es seguro porque el token ya fue emitido por el servidor y se usa solo para decidir si refrescar — no para autorizar nada. Si el token está manipulado, el servidor lo rechazará igualmente.
- **[Riesgo] Refresh concurrente:** Si múltiples peticiones intentan refrescar simultáneamente, `refreshSession()` ya tiene deduplicación mediante `refreshPromise`, así que esto está cubierto.
- **[Trade-off] Latencia adicional al cambiar de emisora:** Si el token necesita refrescarse, el cambio de emisora tendrá una latencia extra (~100-200ms para la petición de refresh). El estado de buffering ya visible mitiga la percepción de esta latencia.
