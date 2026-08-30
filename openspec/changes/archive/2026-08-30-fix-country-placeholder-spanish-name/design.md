## Context

See proposal.md - Why. El filtro de país de la pantalla de exploración de emisoras (`apps/web/src/pages/Explore.tsx`) muestra el placeholder "País (ej. España)". Los nombres de país provienen de RadioBrowser en inglés (p. ej. "Spain"), que es lo que realmente se muestra en el combobox y se envía como parámetro de búsqueda.

## Goals / Non-Goals

**Goals:**
- Que el ejemplo del placeholder del filtro de país coincida con un valor real del catálogo.
- Cambio mínimo, solo de texto visible.

**Non-Goals:**
- No traducir el catálogo de países al español (fuera de alcance; los datos vienen de RadioBrowser y no hay i18n en el proyecto).
- No cambiar el comportamiento de búsqueda ni de filtrado.

## Decisions

- **Cambiar el texto del placeholder a "País (ej. Spain)"**. Es una decisión trivial y de bajo riesgo: solo se modifica el literal del atributo `placeholder` del `FilterControl` en `Explore.tsx`. No se requiere una arquitectura especial ni nuevos componentes.

**Alternativa considerada:** traducir todos los países del catálogo a español. Descartada: introduce complejidad (mapeo idioma→español, i18n sin infraestructura previa) y no es necesaria para resolver el problema reportado.

## Risks / Trade-offs

- [El ejemplo "Spain" deja de estar en español] → Aceptado: "Spain" es el nombre real que verá el usuario en el catálogo; el resto de textos de la interfaz sigue en español (requisito "Interfaz en español" del spec web-ui). Riesgo mínimo.
