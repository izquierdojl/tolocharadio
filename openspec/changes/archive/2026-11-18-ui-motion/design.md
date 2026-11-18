# Design

## Context

Ver `proposal.md` (Why). Estado actual: Tailwind v4 (`@import "tailwindcss"`), solo existen los keyframes `fade-in`/`fade-out` de 150ms en `apps/web/src/index.css`, usados únicamente por `ConfirmDialog`. El resto son clases `transition` genéricas sin `active:scale`, sin keyframes de pop/slide/shimmer y sin `prefers-reduced-motion`. No hay librería de animación en `apps/web/package.json` y el alcance A no añade ninguna.

## Goals / Non-Goals

**Goals:**
- Micro-interacciones solo con CSS + utilidades Tailwind (transform/opacity).
- Duraciones cortas y coherentes (150-200ms, un único easing) en botones, tarjetas, menús, combobox, diálogo y reproductor.
- Funciona en móvil (<640px) y en ambos temas sin romper layout ni accesibilidad.

**Non-Goals:**
- Salidas animadas de tarjetas/filas al eliminar (requiere estado de "saliendo"; queda como extensión B).
- Stagger/reordenado `layout` de la rejilla (requeriría dependencia; extensión C).
- Transiciones entre rutas ni skeletons con shimmer.

## Decisions

- **Solo utilidades Tailwind + keyframes en `index.css`**: `active:scale-95`, `transition-transform`, `hover:-translate-y-0.5/1`, `group-hover:scale-105` en imagen, `origin-top-right` + `scale-95→100` en menús. Alternativa descartada: añadir `motion`/`framer-motion` — innecesario para el alcance A y suma peso y riesgo.
- **Keyframes mínimos propios**: `pop` (corazón favorito), `slide-up` (entrada del reproductor), `eq-bounce` (3 barras del ecualizador) y `fade-slide-down` (desplegables). Reutilizar `fade-in` existente para overlays.
- **Ecualizador CSS puro**: 3 `span` con `animation-delay` escalonado, parado con `animation-play-state: paused` al pausar. Alternativa descartada: SVG animado con JS — más código para el mismo efecto.
- **Texto "Ahora suena" con fundido**: se fuerza re-montaje con `key` del título para retriggerar `fade-in`, sin librerías.
- **Accesibilidad primero**: envolver keyframes en `@media (prefers-reduced-motion: no-preference)` y dejar el estado final visible por defecto; no animar `height/blur`, solo `transform`/`opacity`.

## Risks / Trade-offs

- [Riesgo] Las clases `active:scale` en botones pequeños de móvil pueden sentirse "blandas" → Mitigación: escala sutil (0.95-0.97) y duración ≤150ms.
- [Riesgo] El zoom `group-hover:scale` en imágenes con `object-cover` puede recortar caras/logos → Mitigación: escala pequeña (1.03-1.05) y `overflow-hidden` ya existente.
- [Riesgo] Re-montar el texto del reproductor con `key` puede parpadear si el título llega a ráfagas → Mitigación: fundido de 150ms y `aria-live="polite"` ya existente.
- [Trade-off] Sin librería no hay salidas animadas reales en listas (el elemento desaparece al invalidar la query) → se acepta; es la extensión B.

## Migration Plan

- Cambio solo de frontend, sin migración de datos ni API.
- Despliegue: compilación web habitual; rollback: revertir el change.
- Verificación: `npm run verify:full` en web, comprobación manual en móvil y escritorio, temas claro/oscuro y `prefers-reduced-motion` activado.

## Open Questions

Ninguna abierta para el alcance A.
