## 1. Función de verificación de token en api.ts

- [x] 1.1 Crear función `ensureValidToken()` en `apps/web/src/lib/api.ts` que decodifique el JWT almacenado en `accessToken`, lea el claim `exp`, y llame a `refreshSession()` si quedan menos de 30 segundos o ya expiró. Verificar que la función existe y compila sin errores de TypeScript.
- [x] 1.2 Exportar `ensureValidToken` desde `api.ts` para que sea consumible por el player store. Verificar que la exportación es accesible desde `apps/web/src/stores/player.ts`.

## 2. Integración en el player store

- [x] 2.1 Modificar la función `play()` en `apps/web/src/stores/player.ts` para llamar a `ensureValidToken()` antes de setear `audio.src`. Si el refresh falla (retorna `null` o lanza error), mostrar un toast de error y no iniciar la reproducción. Verificar que al cambiar de emisora con token expirado, el token se refresca y la emisora comienza a sonar.
- [x] 2.2 Verificar que el estado de buffering (`isBuffering: true`) se mantiene visible durante el refresco del token, y que se actualiza correctamente cuando el stream comienza o falla.

## 3. Verificación manual

- [ ] 3.1 Verificar manualmente que: (a) cambiar de emisora con token válido funciona sin refresco, (b) cambiar de emisora con token expirado refresca automáticamente y reproduce, (c) cambiar de emisora con refresh token inválido muestra toast de sesión caducada.
