## Context

Estado actual: `README.md` es un único fichero de 179 líneas que mezcla portada, características, arquitectura, requisitos, comandos de desarrollo, variables de entorno, despliegue, CI/CD, versionado, referencia de endpoints y licencia. La web (ver `apps/web/src/pages/Home.tsx`) ya tiene una portada clara con tagline, ascensor, permisos y cierre ("radio libre, datos tuyos, control total"); el README no la refleja y, a cambio, vuelca contenido técnico que entierra qué es el producto. No existe directorio `docs/` todavía; la documentación vive entera en el README.

## Goals / Non-Goals

**Goals:**
- Portada breve y atractiva: nombre + tagline, micronarrativa (parafrísea la portada web), grafismo inspirado en la Sierra de Tolocha (en Markdown: un diagrama ASCII/SVG embebido o bloque de arte con la silueta de sierra y pinos), lista resumida de capacidades y tabla de contenidos hacia `docs/`.
- Trasladar todo el contenido técnico a páginas internas bajo `docs/`, agrupadas por tema y enlazadas desde la portada.
- Preservar fielmente el contenido actual (sin perdidas de información ni cambios de significado).

**Non-Goals:**
- No tocar código de `apps/`, `scripts/`, `openspec/specs/` ni workflows.
- No cambiar comportamiento, API, variables de entorno ni flujos de release.
- No rediseñar la web ni sincronizar el README con ella excepto para reutilizar su texto de portada.

## Decisions

**Decisión 1 — Estructura de páginas internas (índice del README → `docs/`).**
Se crea un directorio `docs/` con páginas temáticas derivadas de las secciones actuales:
- `docs/uso.md` — la aplicación desde el punto de vista del usuario (catálogo, cuentas, favoritos, historial, reproductor, tema).
- `docs/instalacion.md` — requisitos, instalación y arranque en local (dev), migraciones, variables de entorno.
- `docs/despliegue.md` — Docker, docker compose, imagen GHCR.
- `docs/arquitectura.md` — monorepo, API/web, almacenamiento, sesiones, catálogo.
- `docs/api.md` — especificación OpenAPI, endpoints y formato de errores.
- `docs/desarrollo.md` — comandos raíz, CI/CD, publication y versionado automático (semver).
- `docs/licencia.md` — licencia MIT y enlace al `LICENSE`.

*Alternativa considerada*: mantener una única página "Docs" con todo. Descartada porque no resuelve el problema de densidad que motiva el cambio; la separación temática sigue el patrón habitual de repositorios y facilita consultar una cosa sin leer todo. Se elige nombre de fichero descriptivo y en español, consistente con el repositorio.

**Decisión 2 — Portada breve con reutilización de la narrativa web.**
El README principal debe leerse en segundos: nombre, tagline ("Exploración radiofónica libre y autoalojada."), descripción de 1 párrafo parafraseando `Home.tsx`, una lista de 6-8 capacidades clave, un arte ASCII/SVG de la sierra y una tabla de contenidos con enlaces relativos a `docs/`. Mantener la convención Markdown y enlaces relativos para que funcionen en GitHub.

*Alternativa considerada*: README solo enlaces, sin narrativa. Descartada porque la portada web sí tiene narrativa y el usuario quiere que el repo se parezca a la portada de la web.

**Decisión 3 — Mapeo 1:1 del contenido actual, sin drag & drop creativo.**
El cuerpo de cada página de `docs/` copia el texto de la sección equivalente del README actual, reordenado únicamente para quedar agrupado por tema. Así se garantiza cero pérdidas de información. Cualquier enlace ancla interno que deje de existir (p. ej. referencias a secciones del README eliminadas) se actualiza.

## Risks / Trade-offs

- [Enlaces externos rotos] → Antes de fusionar, grepear referencias a anclas de README (issues, AGENTS.md, workflows, docs web) y actualizarlos. Hacer enlaces relativos para que GitHub los resuelva.
- [Página interna infraactualizada frente al README antiguo con el tiempo] → Patrón ya asumido por el repositorio; el README se reescribe ahora como portada y `docs/` pasa a ser la fuente de la documentación técnica.
- [Pérdida accidental de detalle al reorganizar] → Verificación final de que ningún dato técnico del README original desaparece: cotejar cada sección del README contra su página destino.
- [Trade-off documental] → Documentación interna en más archivos es más descubrible pero también más dispersa; se mitiga con la tabla de contenidos en la portada y nombres autoexplicativos en `docs/`.

## Migration Plan

1. Escribir las páginas de `docs/` trasladando el contenido del README actual por tema.
2. Reescribir `README.md` como portada, enlazando a `docs/`.
3. Actualizar referencias externas a anclas/secciones eliminadas del README.
4. Verificar: cotejo de contenido (v1.1 del actual), `gr/` de enlaces, y smoke de que los enlaces relativos se resuelven en local/GitHub.

## Open Questions

Ninguna. El alcance está cerrado por la propia petición (portada + indexación del resto) y las decisiones anteriores; la elección concreta de qué entra en "principal" vs. "páginas internas" se resuelve aplicando el criterio descrito (lo visible en la portada de la web).