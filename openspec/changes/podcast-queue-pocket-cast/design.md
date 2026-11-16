# Design

## Context

Ver `proposal.md` para la motivación. La cola ya existe en el servidor (`podcast_queue_state` + `podcast_queue_items`, `revision`, máximo 200) con `GET /queue`, `POST /queue`, `DELETE /queue/:episodeId` y `PUT /queue/order`. `POST /queue` acepta `position: "next" | "end"`, pero hoy un episodio repetido se ignora. El reproductor es estado local del cliente (`episode`, `kind`, `status`, `isPlaying`, `isBuffering`) y no persiste al recargar. `EpisodeRow` solo ofrece “A la cola” al final y el reproductor de la fila fuerza `startPositionSec: 0`. La página de cola (`QueuePanel`) muestra todos los episodios, incluido el que suena, y usa `@dnd-kit` con la revisión como clave.

Restricción principal: **solo podcasts**. El reproductor de radio, el proxy y el historial de emisoras no cambian.

## Goals / Non-Goals

**Goals:**

- Reproducir, encolar a continuación y encolar al final desde cualquier lista de episodios.
- Separar visualmente el episodio activo del resto de la cola sin cambiar el modelo de datos ni añadir sincronización de reproducción.
- Pausar/detener/cambiar de episodio y que el anterior vuelva a la cola de forma predecible.
- Vaciar la cola conservando el episodio cargado en el reproductor.
- Mantener el comportamiento actual de avance automático, teclas multimedia y reordenación.

**Non-Goals:**

- Sincronizar el “en reproducción” entre dispositivos o persistir el reproductor al recargar.
- Añadir historial de cola, descargas automáticas o reproducción offline.
- Cambiar el límite de 200 episodios, el esquema de la cola o la autenticación.
- Tocar radio, sus emisoras, su historial o su reproductor.
- Implementar un diálogo genérico de confirmación más allá del necesario para vaciar.

## Decisions

### D1. Modelo A: el episodio activo es una capa de cliente sobre la cola

La cola del servidor sigue conteniendo todos los episodios pendientes, incluido el que suena. El cliente calcula si el episodio actual está activo:

- Activo (se oculta de la lista y se muestra en “En reproducción”): `kind === "podcast"` y estado `connecting`, `playing` o `reconnecting`.
- No activo (vuelve a la lista): `paused`, `failed` o `idle`, o cuando el reproductor cambia a radio.

No se elimina nada de la cola al reproducir. Al pausar, fallar o detener, el episodio nunca se fue: simplemente vuelve a mostrarse en su posición original. Al reproducir otro, el anterior deja de estar activo y reaparece solo. Si el episodio activo no estaba en la cola (se inició desde la ficha), se muestra igualmente en “En reproducción” pero no se añade a la cola.

**Alternativas descartadas:**

- **Quitarlo de la cola en el servidor al reproducir y reinsertarlo al pausar:** fiel al modelo Pocket Cast literal, pero multiplica las llamadas de cola, pierde el episodio si se recarga o se cierra la pestaña, y genera carreras entre pestañas.
- **Guardar `current_episode_id` en `podcast_queue_state`:** resuelve la recarga, pero sincroniza el “en reproducción” entre dispositivos cuando la reproducción es local, y complica el vaciado y el avance automático.
- **No ocultarlo:** no cumple el requisito de “un episodio en reproducción y el resto en cola”.

**Consecuencia aceptada:** el contador de la cola (badge y cabecera) incluye el episodio activo. La página lo hace explícito mostrando la tira “En reproducción” y la lista “A continuación”; no se añade un parámetro de exclusión al contador.

### D2. Página de cola: tira “En reproducción” + lista de pendientes

`PodcastQueue` compone:

1. **Tira “En reproducción”** (`NowPlayingStrip` o componente equivalente), visible solo mientras el episodio está activo. Muestra portada, título enlazado a `/podcasts/:podcastId`, nombre del podcast, progreso y botón pausar/reanudar. Usa el estado del reproductor, no la cola.
2. **Lista “A continuación”**: `QueuePanel` recibe el `hiddenEpisodeId` activo y filtra ese episodio. Las posiciones visibles se renumeran 1..n.
3. **Vaciar cola** en la cabecera, junto al contador.

Estados vacíos:

- Sin episodios y sin reproducción: “Tu cola está vacía”.
- Solo el episodio activo en la cola: la tira arriba y “No hay más episodios en cola”.
- Episodio activo que no está en la cola: la tira arriba y la lista con sus pendientes (o el mensaje de que no hay más).

**Reordenación con un episodio oculto:** se mantiene el índice absoluto del episodio oculto. Se añade un helper puro `mergeQueueOrder(allItems, visibleOrder, hiddenEpisodeId)` en `lib/podcastQueue.ts`:

- Si el oculto no está en la cola, devuelve `visibleOrder`.
- Si está en el índice `k`, inserta su id en `k` dentro del nuevo orden visible.
- Se prueba con tests unitarios (oculto al principio, en medio, al final y ausente).

No se llama al servidor al empezar a reproducir; el orden de la cola no cambia.

### D3. Acciones por fila: reproducir visible y menú de cola

En `EpisodeRow` (home, ficha y favoritos):

- Botón **Reproducir/Pausar visible en todas las anchuras**, no solo en el overlay de la portada. El overlay se conserva como atajo.
- Menú **A la cola** con dos acciones: **A continuación** (`position: "next"`) y **Al final** (`position: "end"`). Se implementa como popover local con `aria-haspopup="menu"`, `role="menu"` y cierre por clic fuera/Escape. En móvil el botón puede ser solo icono; las opciones del menú siempre llevan texto.
- La mutación usa `addEpisodeToQueue`, invalida `podcast-queue`, `podcast-queue-count` y `podcast-home`, y muestra toast: “Se reproducirá a continuación” o “Añadido al final de la cola”. En error, el mensaje de la API (incluido `QUEUE_LIMIT_REACHED`).

Manejo del botón de reproducción:

- Si el episodio es el actual: `toggle()` (o `retry()` si el estado es `failed`), sin reiniciar.
- Si no es el actual: `playEpisode(episode, podcast)` **sin** `startPositionSec: 0`, para que el store aplique `computeResumePositionSec`.
- Un episodio completado empieza en 0 porque `computeResumePositionSec` ya lo resuelve.
- El mismo criterio se aplica a la fila de `QueuePanel` y al overlay de portada.

`PodcastAutoAdvance` conserva `startPositionSec: 0` para el siguiente episodio automático: empezar el siguiente desde el principio es intencionado.

### D4. Mover episodios ya encolados en `POST /podcasts/queue`

Se amplía `PodcastQueueService.add`:

- Si el episodio no existe en la cola: comportamiento actual (comprobar límite, insertar al final o en 0 desplazando).
- Si ya existe:
  - `next` y posición distinta de 0: desplazar todas las posiciones +1 y fijar la suya en 0.
  - `end` y posición distinta de la última: fijar su posición en `max + 1` (o recompactar).
  - Si ya está en la posición pedida: no-op sin incrementar revisión.
- Todo dentro de la transacción existente; la revisión solo sube si hay movimiento real.
- No se comprueba el límite para un episodio existente (no aumenta el número de items).

**Alternativa descartada:** mantener el no-op actual. La acción “A continuación” sobre un episodio que ya está al final sería un engaño; mover es la expectativa natural y no requiere endpoint nuevo.

### D5. Vaciado con `DELETE /api/v1/podcasts/queue?keepEpisodeId=...`

- Ruta autenticada `DELETE /podcasts/queue` (distinta de `DELETE /podcasts/queue/:episodeId`; Express las distingue).
- Query opcional `keepEpisodeId` validada como entero positivo. Si el episodio no pertenece a la cola del usuario, se ignora.
- Servicio `clear(userId, keepEpisodeId?)`:
  - Asegura el estado de la cola.
  - En una transacción: si `keepEpisodeId` es miembro, borra el resto y deja el conservado en posición 0; si no, borra todos.
  - Incrementa `revision` y `updatedAt` y devuelve `get(userId)`.
- Respuesta `200 { queue }`, idempotente, sin error si ya está vacía.
- Cliente: `clearPodcastQueue(keepEpisodeId?)` en `lib/api.ts`.

El cliente pasa `keepEpisodeId` con el episodio cargado en el reproductor (sonando o en pausa) si está en la cola. Así “Vaciar cola” elimina los pendientes y no interrumpe la escucha. Si el episodio cargado no está en la cola, no hay nada que conservar y se vacía todo.

**UI:** botón “Vaciar cola” con icono y estilo destructivo suave en la cabecera de `/podcasts/cola`. Se deshabilita cuando no hay pendientes que borrar (`items.length - (activoEnCola ? 1 : 0) === 0`). Confirmación en un diálogo propio (patrón de `AboutModal`: `role="dialog"`, `aria-modal`, Escape, clic fuera) con el número de episodios pendientes. Durante la mutación se deshabilita el botón y se muestra estado pendiente. Éxito: actualizar la caché, invalidar contador/home y toast “Cola vaciada”. Error: toast.

### D6. Contador y badge

No se cambia `GET /podcasts/queue/count`. El badge de navegación y la cabecera de la cola muestran el total (`items.length`), que incluye el episodio activo. La tira “En reproducción” y la lista “A continuación” explican la composición. Si más adelante se quiere un contador solo de pendientes, se añadirá `excludeEpisodeId` al endpoint; no forma parte de este change.

### D7. Radio y reproductor compartido

No se toca `play(station)` ni el motor de radio. Cuando el usuario pone una emisora, el store cambia `kind` a `radio` y limpia `episode`; el podcast deja de estar activo y reaparece en la cola por la regla de D1. No se añade lógica específica de radio.

### D8. Tests y verificación

- **API:** ampliar `podcasts-queue-favorites.test.ts` con mover a continuación/al final, no-op en la posición pedida, vaciado completo, vaciado con `keepEpisodeId` (miembro y no miembro), cola vacía, incremento de revisión y aislamiento entre usuarios. `openapi.test.ts` debe listar la nueva ruta.
- **Web:** tests de `mergeQueueOrder` y de la selección del episodio activo (`isQueueItemHidden` o equivalente). Los componentes se validan con `renderToStaticMarkup` donde aporte valor (estado vacío y tira en reproducción).
- **Manual/Docker:** reproducir desde lista, encolar a continuación/al final, reproducir otro episodio y ver que el anterior vuelve, pausar y ver que reaparece, vaciar con y sin reproducción, y comprobar que la radio sigue igual.

## Risks / Trade-offs

- **Reordenar con un episodio oculto puede descolocar el orden** → helper puro con tests y reconstrucción por índice absoluto; el episodio oculto mantiene su hueco.
- **El contador incluye el activo** → la UI separa “En reproducción” y “A continuación”; se documenta. Si molesta, se añade después `excludeEpisodeId` sin romper contratos.
- **`keepEpisodeId` lo envía el cliente** → el servidor solo conserva el id si pertenece a la cola del usuario; no hay fuga entre usuarios.
- **Vaciado sin `baseRevision`** → es una acción destructiva explícita con confirmación; usar revisión obligaría a recargar y complicaría el flujo. El límite de una cola personal hace aceptable el last-write-wins.
- **Mover un episodio existente desplaza posiciones** → máximo 200 filas y transacción; coste despreciable.
- **Quitar el `startPositionSec: 0` cambia la expectativa de “empezar de cero”** → es el comportamiento que ya define `podcast-playback` (reanudar); para reiniciar, el usuario puede buscar el segundo 0. Un episodio completado sigue empezando en 0.
- **Varias pestañas** → cada pestaña tiene su reproductor; el episodio activo en una pestaña sigue visible como pendiente en otra. Es coherente con una reproducción local y evita sincronizar estado de reproducción.
- **Menú de cola en filas estrechas** → alineado a la derecha, ancho máximo y cierre por Escape/clic fuera; en móvil solo icono.

## Migration Plan

1. **Sin migración de base de datos.** Desplegar primero la API (nueva ruta y movimiento de duplicados) y después la web; ambos cambios son compatibles con clientes antiguos.
2. La web nueva usa `DELETE /podcasts/queue`; si se desplegara antes que la API, el vaciado devolvería 404. El despliegue conjunto con `docker compose up --build -d` evita la ventana.
3. Rollback: revertir la web; las rutas y el movimiento añadidos en la API son aditivos y no rompen a los clientes anteriores.
4. Verificación final: `npm run verify:full`, smoke en Docker y prueba manual de los flujos de cola. Tras archivar el change, release `minor` desde `main` según `AGENTS.md`.

## Open Questions

Ninguna: el alcance, el modelo de datos y los defaults de UX están cerrados.
