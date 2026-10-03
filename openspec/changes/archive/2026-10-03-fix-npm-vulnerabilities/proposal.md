# Proposal

## Why

`npm audit` reporta 4 vulnerabilidades moderadas (una causa raíz: GHSA-67mh-4wv8-2f99 en `esbuild <=0.24.2` anidado vía `drizzle-kit@0.31.11` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` → `esbuild@0.18.20`). En producción (`npm audit --omit=dev`) hay 0 vulnerabilidades. Además hay paquetes desactualizados en minors/patch que conviene poner al día sin romper compatibilidad.

## What Changes

- Añadir `overrides` en `package.json` raíz para forzar `esbuild >=0.24.3` (p. ej. `^0.25.12`) en todo el árbol, eliminando el `esbuild@0.18.20` anidado de `drizzle-kit`.
- Actualizar dependencias directas a su rango `wanted` (minors/patch seguros, sin majors): `drizzle-orm`, `jose`, `zod`, `swagger-ui-dist`, `tsx`, `supertest`, `@types/node`, `typescript-eslint`, `eslint`, `@tanstack/react-query`, `@types/react`, `@types/react-dom`, `react`, `react-dom`, `react-router-dom`, `lucide-react`, `eslint-plugin-react-refresh`, `vite`.
- Excluir expresamente: `typescript 5.9.3 → 7.0.2` (major), `vite-plugin-pwa 1.3.0 → 2.0.0` (major), `vitest 4 → 5` en web (major), `drizzle-kit` beta/rc (prerelease con breaking changes) y el `npm audit fix --force` que propone bajar a `drizzle-kit@0.18.1`.
- Regenerar `package-lock.json` y verificar `npm audit` queda en 0 vulnerabilidades.

## Capabilities

### New Capabilities

Ninguna (cambio de mantenimiento, sin comportamiento observable nuevo).

### Modified Capabilities

Ninguna (no cambian REQUIREMENTS de specs existentes).

## Impact

- Archivos: `package.json` (raíz), `apps/api/package.json`, `apps/web/package.json`, `package-lock.json`.
- Sistemas: solo tooling/dev (`drizzle-kit`, `tsx`, build con `vite`/`esbuild`). Sin cambios en API, UI ni datos.
- Riesgo bajo: solo bumps compatibles + override de transitiva. Verificación con `typecheck`, `lint`, `test` y `build`.
