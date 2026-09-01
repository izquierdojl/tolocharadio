## Why

Los usuarios no tienen visibilidad de qué versión de la aplicación están usando ni si hay una actualización disponible. Esto dificulta el soporte (no pueden reportar la versión) y retrasa la adopción de nuevas versiones. Mostrar la versión en el footer y comprobar automáticamente si hay releases nuevos en GitHub resuelve ambos problemas.

## What Changes

- Inyectar la versión de `package.json` en el build de Vite como constante global (`__APP_VERSION__`).
- Crear una sección "Acerca de..." accesible desde el menú de usuario (desktop) y menú hamburguesa (mobile), que muestre la versión actual, link al repositorio, y link de actualización si hay un release más reciente en GitHub.
- Si hay un release más reciente en GitHub, mostrar un link directo al release (abre en nueva pestaña).
- La comprobación de actualizaciones se hace solo al cargar la página, con cache en `sessionStorage` (TTL 5 min) para no golpear la API de GitHub.
- Si no hay red o la comprobación falla, se muestra silenciosamente solo la versión local.

## Capabilities

### New Capabilities
- `version-check`: Mostrar versión de la aplicación en una sección "Acerca de..." del menú y comprobar si hay actualizaciones disponibles en GitHub, mostrando un link al release cuando corresponda.

### Modified Capabilities

## Impact

- **Archivos nuevos**: `apps/web/src/components/AboutSection.tsx`, `apps/web/src/hooks/useVersionCheck.ts`, `apps/web/src/vite-env.d.ts`.
- **Archivos modificados**: `apps/web/vite.config.ts` (define de versión), `apps/web/src/components/AppShell.tsx` (enlace "Acerca de..." en menús de usuario).
- **Dependencias**: ninguna nueva. Se usa `fetch` nativo contra la API pública de GitHub.
- **API**: ninguna cambio en la API interna. Consumo externo de `https://api.github.com/repos/izquierdojl/tolocharadio/releases/latest`.
