# Design

## Context

Ver `proposal.md`. El repositorio ya permite auto-merge (`allow_auto_merge`) y `main` exige los checks `quality` y `docker` de `ci` (`docker` se salta cuando el PR no toca la imagen y cuenta como correcto). `AGENTS.md` establece que no hay workflow que fusione directamente: se activa el auto-merge por PR.

## Goals / Non-Goals

**Goals:**
- Que los PR seguros de Dependabot se fusionen solos cuando la CI pase.

**Non-Goals:**
- Fusionar versiones mayores o crates de Rust automáticamente.
- Aprobar PR ni saltarse la protección de `main`.

## Decisions

1. **`dependabot/fetch-metadata` para clasificar.** Expone `update-type` (patch/minor/major) y `package-ecosystem`, también para PR agrupados. *Alternativa:* parsear el título, descartada por frágil.
2. **Se activa el auto-merge, no un merge directo.** `gh pr merge --auto --squash` deja que GitHub espere a los checks requeridos. *Alternativa:* merge inmediato, descartada porque se saltaría la espera de la CI.
3. **Permisos mínimos y actor restringido.** `contents: write` y `pull-requests: write`, con condición `github.actor == 'dependabot[bot]'`, para que un PR de otra persona nunca active el flujo.
4. **Solo `npm` y `github-actions`.** Cargo queda fuera porque la CI no compila Rust (el workflow `desktop` solo corre al etiquetar).
5. **Se mantiene el squash**, como el resto de merges del proyecto.

## Risks / Trade-offs

- [Un merge hecho con `GITHUB_TOKEN` no dispara otros workflows] → Es aceptable: la CI de cada commit de `main` se ejecuta al empujar el commit de release, que es lo que consulta el gate del tag.
- [Una actualización minor/patch rompe algo que la CI no cubre] → La CI incluye typecheck, lint, tests y build; el escáner diario y `npm audit` siguen activos.
- [Los PR que se pisan en el lockfile] → Dependabot rebasa tras cada merge y el auto-merge reintenta cuando los checks vuelven a pasar.

## Migration Plan

Mergear el workflow en `main`. Para revertir, borrar el archivo. Se verifica con el siguiente PR de Dependabot minor/patch (o activando el comportamiento en uno existente).
