## Context

Ver `proposal.md - Why`. El `PlayerBar` vive en `apps/web/src/components/PlayerBar.tsx` y consume `apps/web/src/stores/player.ts` (Zustand + `HTMLAudioElement`). El boton `SkipForward` existe desde el commit inicial (`8d875f0`) con prop `fallbackStations?: Station[]` y metodo `next(stations)` en el store, pero `AppShell.tsx:312` monta `<PlayerBar />` sin props, por lo que `next([])` es no-op. No hay otros consumidores de `next()` (grep confirma solo `PlayerBar.tsx:95`). El proyecto usa Tailwind v4, `lucide-react` y `sonner`.

## Goals / Non-Goals

**Goals:**
- Eliminar el boton muerto y su cableado para evitar confusion y liberar espacio horizontal, especialmente en movil.
- Dejar el store limpio sin codigo muerto si `next()` no tiene otros usos.
- Mantener intactos play/pausa, volumen, copiar enlace, info tecnica y stop.

**Non-Goals:**
- Introducir cola, playlist, aleatorio o cualquier reemplazo del boton. Si se quiere navegacion, sera un change futuro con diseno de cola.
- Cambios de API, modelo `Station` o playback proxy.
- Rediseño del `PlayerBar` mas alla de quitar el boton.

## Decisions

**Decision 1: Borrar boton + prop + import en `PlayerBar.tsx`**
- Que: eliminar `SkipForward` del import `lucide-react`, eliminar `fallbackStations` de `PlayerBarProps`, eliminar el `<button onClick={() => next(fallbackStations)}>` (lineas 93-100 actuales).
- Por que: es el origen de la confusion; sin prop nunca funciona. Alternativa "ocultar condicionalmente" mantiene codigo muerto y complejidad.
- Alternativa considerada: dejar `next()` en store por si se reutiliza -> descartada si grep confirma 0 usos; si aparece uso futuro, se recrea con diseno de cola.

**Decision 2: Eliminar `next()` de `player.ts` si queda huerfano**
- Que: borrar `next: (stations: Station[]) => void` de `PlayerState` y la implementacion `next(stations)` (lineas 14 y 85-91). Si el equipo prefiere conservarlo como API interna, dejarlo pero documentar como no usado.
- Rationale: codigo muerto aumenta superficie de mantenimiento y sugiere feature existente. Opcion conservadora: marcar como `// unused` si hay dudas.
- Alternativa: mantener `next()` y solo quitar UI -> incoherente (metodo sin UI).

**Decision 3: Actualizar spec `web-ui` en lugar de crear nueva capability**
- Por que: el comportamiento ya esta especificado en `Requirement: Reproductor flotante persistente`; es una modificacion, no nueva capability. `skip_specs` no aplica.

## Risks / Trade-offs

- [Riesgo] Alguien esperaba que "siguiente" navegase favoritos/historial -> Mitigacion: cambio es fix/breaking menor y reversible; documentar en proposal/ changelog; si hay demanda real, proponer change de cola/aleatoria con UX explicita.
- [Riesgo] Olvidar import no usado `SkipForward` -> Mitigacion: `npm run typecheck` y `lint` lo detectan; tarea incluye verificacion.
- [Trade-off] Perder atajo de zapeo vs ganar claridad y espacio movil -> se prioriza claridad; zapeo se hace via lista (1 tap en tarjeta).

## Migration Plan

- Cambio solo frontend, sin migracion de datos.
- Deploy: included en siguiente release `patch` (fix). Rollback: revertir commits del change.
- Validacion: `npm run typecheck --workspace @tolocharadio/web`, `npm run lint`, `npm run build`, smoke en `docker compose up --build -d`.

## Open Questions

- Ninguna bloqueante. Duda menor: eliminar `next()` del store o conservarlo? Se resuelve en implementacion tras confirmar grep final; no afecta spec.
