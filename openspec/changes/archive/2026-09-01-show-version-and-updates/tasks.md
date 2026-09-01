## 1. Configuración de build

- [x] 1.1 Modificar `apps/web/vite.config.ts` para importar la versión del `package.json` raíz y añadir `__APP_VERSION__` al `define` de Vite. Verificar que `npm run build` en `apps/web` completa sin errores.
- [x] 1.2 Crear `apps/web/src/vite-env.d.ts` con la declaración `declare const __APP_VERSION__: string;`. Verificar que `npm run typecheck` en `apps/web` pasa sin errores.

## 2. Hook de comprobación de versión

- [x] 2.1 Crear `apps/web/src/hooks/useVersionCheck.ts` con la lógica de fetch a la API de GitHub (`/repos/izquierdojl/tolocharadio/releases/latest`), parsing semver, comparación de versiones, y cache en sessionStorage con TTL de 5 minutos. Verificar que el hook compila sin errores de TypeScript.

## 3. Sección "Acerca de..."

- [x] 3.1 Crear `apps/web/src/components/AboutSection.tsx` que muestre la versión actual (`vX.Y.Z`) con link al repositorio de GitHub, y si hay actualización disponible, un link `-> vX.Y.Z` al release. Estilo consistente con los items del menú. Verificar que el componente compila.
- [x] 3.2 Modificar `apps/web/src/components/AppShell.tsx` para añadir un link "Acerca de..." en el menú de usuario (desktop) y en el menú hamburguesa (mobile), que renderice `<AboutSection />`. Verificar con `npm run dev` que la sección aparece en ambos menús.

## 4. Verificación integrada

- [x] 4.1 Ejecutar `npm run typecheck`, `npm run lint` y `npm run build` desde la raíz del proyecto y verificar que todo pasa sin errores.
