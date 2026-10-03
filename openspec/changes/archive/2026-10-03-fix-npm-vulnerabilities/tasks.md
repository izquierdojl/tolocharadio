# Tasks

## 1. Mitigación de la vulnerabilidad esbuild

- [x] 1.1 Añadir `overrides` de `esbuild` en `package.json` raíz y verificar con `npm install` que desaparece `esbuild@0.18.20` (`npm list esbuild`)
- [x] 1.2 Verificar `npm audit` queda en 0 vulnerabilidades y `npm audit --omit=dev` sigue en 0

## 2. Actualización de minors/patch seguros

- [x] 2.1 Actualizar deps de api a `wanted` (`drizzle-orm`, `jose`, `zod`, `swagger-ui-dist`, `tsx`, `supertest`, `@types/node`, `typescript-eslint`, `eslint`) y verificar `package.json`/`package-lock.json` actualizados
- [x] 2.2 Actualizar deps de web a `wanted` (`react`, `react-dom`, `@types/react`, `@types/react-dom`, `react-router-dom`, `@tanstack/react-query`, `lucide-react`, `vite`, `eslint`, `typescript-eslint`, `eslint-plugin-react-refresh`) y verificar instalación sin errores
- [x] 2.3 Confirmar que no se han subido majors/betas excluidos (`typescript@5`, `vite-plugin-pwa@1`, `vitest@4` en api / `vitest@5` ya fijado en web, `drizzle-kit@0.31.x`)

## 3. Verificación de calidad

- [x] 3.1 Ejecutar `npm run typecheck` y verificar que pasa en api y web
- [x] 3.2 Ejecutar `npm run lint` y verificar que pasa en api y web
- [x] 3.3 Ejecutar `npm run test --workspace @tolocharadio/api` y verificar que pasa
- [x] 3.4 Ejecutar `npm run build` y verificar que api y web compilan
