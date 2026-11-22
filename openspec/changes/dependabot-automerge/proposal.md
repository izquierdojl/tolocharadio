# Proposal

## Why

Los PR de Dependabot se acumulan sin mergear: `dependabot.yml` afirma que las actualizaciones «se fusionan solas tras pasar CI», pero ningún workflow lo hace y el auto-merge hay que activarlo a mano por PR. Los PR envejecen, se pisan en los lockfiles y obligan a rebases repetidos.

## What Changes

- Nuevo workflow `dependabot-automerge` que, en PR abiertos por `dependabot[bot]`, activa `gh pr merge --auto --squash` cuando la actualización es **minor o patch** de npm o de GitHub Actions.
- Quedan fuera (revisión manual): versiones mayores y los crates de Rust de `apps/desktop/src-tauri`, porque la CI no compila Rust en cada PR.
- Se corrige el comentario de `.github/dependabot.yml` para que describa el comportamiento real.
- La protección de `main` sigue mandando: el merge solo se produce cuando pasan los checks requeridos `quality` y `docker`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. Es infraestructura de CI sin cambio de comportamiento del producto (`skip_specs: true`).

## Impact

- `.github/workflows/dependabot-automerge.yml` (nuevo) y `.github/dependabot.yml` (solo comentario).
- Permisos del workflow limitados a `contents: write` y `pull-requests: write`, y solo se ejecuta para el actor `dependabot[bot]`.
- Sin cambios en la aplicación, la imagen ni el esquema; no requiere release de la app más allá del flujo habitual.
