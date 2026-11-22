# Tasks

## 1. Workflow

- [x] 1.1 Crear `.github/workflows/dependabot-automerge.yml` (actor `dependabot[bot]`, `fetch-metadata`, auto-merge squash solo para minor/patch de npm y github-actions) y verificar que el YAML es válido con `npx --yes yaml-lint` o `actionlint`/`python3 -c "import yaml"`
- [x] 1.2 Corregir el comentario de `.github/dependabot.yml` y verificar que el diff solo toca comentarios

## 2. Verificación

- [x] 2.1 Ejecutar `npm run verify` y verificar que sigue en verde
- [ ] 2.2 Tras mergear, comprobar en el siguiente PR de Dependabot minor/patch que queda con auto-merge activado (`gh pr view <n> --json autoMergeRequest`)

## Workflow follow-up

- Archivar el change tras mergear y generar la release desde `main` (ver AGENTS.md).
