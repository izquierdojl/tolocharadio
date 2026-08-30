# Desarrollo y release

> [← Volver al README](../README.md)

## Comandos de desarrollo

Comandos raíz:

```bash
npm run typecheck    # typecheck de todos los workspaces
npm run lint         # eslint de todos los workspaces
npm test             # tests de la API (vitest + supertest)
npm run build        # compila API (dist/) y web (dist/)
npm start            # arranca la API compilada (sirviendo la web si STATIC_DIR apunta a ella)
```

Migraciones de la base de datos (el arranque de la API ya las aplica automáticamente; para gestionarlas a mano, dentro del workspace `@tolocharadio/api`):

```bash
npm run db:generate   # genera una nueva migración desde el esquema de Drizzle
npm run db:migrate    # aplica las migraciones pendientes
```

## Integración continua y publicación (GitHub)

- **`ci`**: en `push`/`pull_request` ejecuta `npm ci`, typecheck, lint, tests y build, y además compila la imagen Docker y hace un smoke test en contenedor (`/api/v1/health` y servido de la web).
- **`release`**: al crear un tag `v*` (`git tag v0.1.0 && git push --tags`) construye la imagen y la publica en GitHub Container Registry (GHCR) con tags semVer y `latest`.

## Versionado automático

La versión sube **sola al archivar una especificación** (flujo OpenSpec): al finalizar el archivo de un change, se ejecuta automáticamente `node scripts/bump.js minor`, que sincroniza la versión en la raíz y en todos los workspaces, crea el commit `chore: release vX.Y.Z` y el tag `vX.Y.Z`, y lo empuja a GitHub. El tag dispara de forma automática el workflow `release` → GHCR.

Regla semver mientras la versión principal sea `0`:

| Situación | Bump | Ejemplo |
| --- | --- | --- |
| Nueva especificación archivada (feature, infraestructura, etc.) | `minor` (automático) | `0.1.0 → 0.2.0` |
| Bugfix / hotfix | `patch` | `0.2.0 → 0.2.1` |
| Primera versión estable (decisión tuya) | `major` | `0.2.0 → 1.0.0` |

Comandos manuales equivalentes (por si quieres lanzar un release sin archivar nada):

```bash
npm run release:spec   # minor (0.1.0 -> 0.2.0)
npm run release:fix    # patch (0.1.0 -> 0.1.1)
npm run release:major  # major (0.1.0 -> 1.0.0)
git push && git push --tags
```

**A prueba de `openspec update`**: el trigger se ancla en el `AGENTS.md` de la raíz (que openspec
no regenera), por si `openspec update` sobreescribe el skill `openspec-archive-change` con su
template original. Tras ejecutar `openspec update`, revisa `git status` sobre
`.opencode/skills/`; si el paso de release desapareció, la regla del `AGENTS.md` sigue siendo
obligatoria (puedes re-añadir el paso 7 al skill manualmente si quieres).