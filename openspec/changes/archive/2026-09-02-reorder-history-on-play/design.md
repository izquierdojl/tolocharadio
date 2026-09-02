## Context

La pestaña de historial (`History.tsx`) usa `@tanstack/react-query` para cargar y mostrar el historial de reproducción. Cuando el usuario reproduce una emisora, el endpoint `/playback/:stationId` del backend ya registra la escucha en el historial (en `playback.ts:137`), pero la query del frontend no se invalida, por lo que la lista no se reordena hasta que el usuario recarga la página.

## Goals / Non-Goals

**Goals:**
- Que la lista de historial se reordene automáticamente al reproducir una emisora desde la pestaña de historial.

**Non-Goals:**
- Cambiar el comportamiento del historial en otras pestañas (favoritos, búsqueda, etc.).
- Modificar la API o el backend.

## Decisions

**Invalidar la query de historial al reproducir**

Se opta por invalidar la query `["history"]` en el `onSuccess` o directamente después de llamar a `play()` desde los componentes de historial. La alternativa sería reordenar optimistamente la lista en el cliente, pero esto añadiría complejidad innecesaria dado que el refetch es rápido y el endpoint ya devuelve los datos ordenados.

**Ubicación: componente History.tsx**

La invalidación se hará en `History.tsx` pasando un callback `onPlay` a `StationCard` y `StationListItem`, o bien escuchando cambios en el store del player. La segunda opción es más limpia porque no requiere modificar los componentes hijos.

## Risks / Trade-offs

- [Riesgo menor] El refetch añade una petición HTTP extra al reproducir. Mitigación: React Query cachea y deduplica, así que el impacto es mínimo.
