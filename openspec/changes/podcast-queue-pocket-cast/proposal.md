# Proposal

## Why

La cola de podcasts actual es una lista plana: el episodio que suena sigue apareciendo en ella, solo se puede añadir al final y no existe una forma de vaciarla de una vez. Se quiere una experiencia tipo Pocket Cast: un episodio en reproducción separado del resto de la cola, acciones directas desde cualquier lista y un vaciado completo sin detener lo que se está escuchando.

## What Changes

- **Reproducción directa desde listas**: botón visible de reproducir/pausar en `EpisodeRow` (home, ficha de podcast y favoritos), reanudando el progreso guardado y alternando pausa si es el episodio actual.
- **Encolar a continuación o al final**: menú “A la cola” con dos acciones. Si el episodio ya está en la cola, se mueve a la posición elegida en vez de duplicarse.
- **Cola con episodio en reproducción separado (modelo cliente)**: mientras un episodio está activo (conectando, sonando o reconectando) se oculta de la lista de la cola y sigue visible en el reproductor persistente; al pausar, fallar o detener vuelve a su posición. Si se reproduce otro, el anterior reaparece solo. La cola del servidor no cambia de modelo ni requiere migración.
- **Vaciado de cola**: nuevo `DELETE /api/v1/podcasts/queue` con `keepEpisodeId` opcional para conservar el episodio cargado en el reproductor; botón “Vaciar cola” con confirmación, contador y toast.
- **Página de cola coherente**: `/podcasts/cola` oculta el episodio activo de la lista de pendientes, muestra el resto y estados vacíos diferenciados; el reproductor persistente sigue mostrando el episodio activo sin duplicarlo.
- **Sin cambios en radio**: la funcionalidad solo afecta a podcasts; el reproductor de emisoras y su cola no se tocan.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `podcast-library`: requisitos de cola (episodio activo fuera de la lista, retorno al pausar/detener, acciones de encolar a continuación/al final, movimiento de episodios ya encolados y vaciado completo con conservación del episodio cargado).
- `podcast-playback`: la reproducción iniciada desde listas o desde la cola reanuda el progreso guardado y alterna pausa/reanudación cuando el episodio ya es el actual.

## Impact

- **API**: `apps/api/src/routes/podcasts.ts` (nuevo `DELETE /podcasts/queue` con `keepEpisodeId`), `apps/api/src/services/podcasts/queue.ts` (`clear` y movimiento de un episodio ya encolado), `apps/api/src/openapi.ts` y tests `apps/api/test/podcasts-queue-favorites.test.ts`.
- **Web**: `apps/web/src/components/podcasts/EpisodeRow.tsx` (botón de reproducción y menú de cola), `QueuePanel.tsx` (filtrado del episodio activo, reordenación y estados vacíos), `PodcastQueue.tsx` (vaciado), `lib/api.ts`, `lib/podcastQueue.ts` (helpers puros) y `AppShell` si el contador necesita ajuste.
- **Docs**: `docs/api.md`, `docs/uso.md` y `docs/arquitectura.md`.
- **Sin migración de base de datos ni endpoints nuevos de play/pause.**
- **Sin impacto en radio.**
