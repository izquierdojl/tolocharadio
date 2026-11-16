# Design

## Context

- `PodcastSubscriptions.tsx` obtiene `GET /podcasts/subscriptions` (ordenado en servidor por `subscribed_at DESC`) y lo pinta con `PodcastList` (tarjeta/lista). «Cancelar» llama directamente a `unsubscribePodcast`.
- `PodcastShow.tsx` alterna suscripción con un único botón («Suscrito»/«Suscribirse») que también da de baja sin confirmar.
- Ya existe `components/ConfirmDialog.tsx` (con variante `destructive`, Escape, clic fuera y estado `pending`), usado en `PodcastQueue.tsx`.
- Ya existe un patrón de preferencia local con Zustand + `localStorage` a prueba de fallos: `stores/viewMode.ts`.
- El progreso por usuario vive en `podcast_progress` (`completedAt`); los episodios en `podcast_episodes` (`publishedAt`, `removedAt`). El límite de suscripciones es 200, por lo que el volumen es pequeño.

## Goals / Non-Goals

**Goals:**
- Ordenar en cliente sin peticiones extra, con un único dato nuevo calculado en servidor.
- Reutilizar `ConfirmDialog` y el patrón de `viewMode` en vez de crear piezas nuevas.

**Non-Goals:**
- Ordenar o paginar en servidor (no hace falta con ≤200 elementos).
- Badges o contadores de pendientes en las tarjetas.
- Confirmaciones en otras acciones destructivas distintas de la baja de suscripción.
- Cambios de esquema de base de datos.

## Decisions

1. **`latestPendingEpisodeAt` calculado en servidor en `PodcastSubscriptionsService.list`.**
   Una única consulta agregada para todos los podcasts del usuario: `podcast_episodes` (`removed_at IS NULL`, `published_at IS NOT NULL`) con `LEFT JOIN podcast_progress` del usuario, filtrando `completed_at IS NULL` y `GROUP BY podcast_id` con `MAX(published_at)`. El resultado se vuelca en un `Map` y se añade a cada resumen (`null` si falta). Se evita el N+1 de contar por podcast.
   *Alternativas:* calcularlo en cliente (requiere cargar todos los episodios y progresos, descartado); parámetro `?sort=` en la API (duplica lógica de nombre/acentos en servidor y fuerza una petición por cambio de orden).

2. **Campo opcional solo en el listado de suscripciones.**
   `PodcastSummary` gana `latestPendingEpisodeAt?: number | null` y solo lo rellena `list()`; `subscribe`, `home`, descubrimiento y ficha no lo calculan (siguen compatibles). Se documenta en el esquema OpenAPI como opcional/nullable.

3. **Definición de «pendiente» = no completado (incluye a medias).**
   Más simple y coherente con «pendiente de reproducir» que reutilizar el filtro `unplayed` de la ficha (que excluye los empezados). Si en el futuro se quisiera lo contrario es un cambio de una condición.

4. **Orden en cliente con un helper puro `lib/subscriptionSort.ts`.**
   `sortSubscriptions(items, order)` devuelve una copia ordenada; el nombre se compara con `Intl.Collator("es", { sensitivity: "base" })` (sin mayúsculas ni acentos). `recent-episodes`: `latestPendingEpisodeAt` desc, `null` al final, desempate por nombre. `recent` (etiqueta «Últimas suscritas») conserva el orden recibido (el del servidor). Es testeable sin DOM.

5. **Preferencia en un store `stores/subscriptionSort.ts`** clonando el patrón de `viewMode.ts`: clave `tolocha:subscriptionSort`, validación contra el conjunto de valores permitidos, `try/catch` en lectura y escritura, valor por defecto `recent-episodes`.
   *Alternativa:* `useState` local (se perdería la elección al navegar).

6. **Selector de orden: `<select>` nativo** junto a las acciones de cabecera, con etiqueta accesible «Ordenar por». Es compatible con móvil, teclado y lectores de pantalla sin dependencias nuevas (hay un `Combobox` propio, pero para cuatro opciones fijas es excesivo).

7. **Confirmación con estado `podcastPendingUnsubscribe` (podcast o `null`)** en ambas pantallas: el botón abre `ConfirmDialog` (`destructive`, título «Cancelar suscripción», texto con el nombre del podcast, `confirmLabel` «Cancelar suscripción»); `onConfirm` ejecuta la mutación existente y cierra el diálogo en `onSettled`; `pending` enlazado a `isPending`. En la ficha solo se abre el diálogo cuando `podcast.isSubscribed`; suscribirse sigue llamando a la mutación directamente.
   *Nota de copy:* el botón de cancelar del diálogo mantiene el texto por defecto «Cancelar»; para evitar la ambigüedad con la acción de baja, el botón destructivo dice «Dar de baja» y el título «¿Cancelar la suscripción?».

## Risks / Trade-offs

- [Podcasts con muchos episodios encarecen la agregación] → una sola consulta con índice `podcast_episodes_podcast_published` y ≤200 suscripciones; aceptable. Si apareciera lentitud, se acota con subconsulta por podcast.
- [`latestPendingEpisodeAt` queda obsoleto si el usuario completa un episodio en otra pantalla] → invalidar `["podcast-subscriptions"]` donde ya se invalida el progreso/cola, o aceptar refresco al reabrir la pantalla; se prefiere lo segundo (ver Open Questions).
- [Orden «Episodios recientes» con muchos `null`] → desempate por nombre para que el resultado sea estable.
- [Dos textos «Cancelar» en el mismo flujo] → resuelto con el copy de la decisión 7.

## Open Questions

- ¿Conviene invalidar `["podcast-subscriptions"]` al completar un episodio para refrescar el orden «Episodios recientes» sin recargar? No afecta a specs ni tareas; se puede decidir en la implementación según el coste.
