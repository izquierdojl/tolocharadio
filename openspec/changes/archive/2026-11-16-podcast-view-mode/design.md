# Design

## Context

Las vistas de radio usan un patrón ya consolidado: `stores/viewMode.ts` (Zustand + localStorage, clave `tolocha:viewMode`, valores `card`/`list`, por defecto `card`), `components/ViewModeToggle.tsx` en la cabecera para usuarios autenticados y pares de componentes `StationList`/`StationCard`/`StationListItem`. Ver `proposal.md - Why` para la motivación.

En podcasts, `PodcastCard` se usa en dos rejillas inline: `PodcastHome` («Tus podcasts», hasta 8) y `PodcastSubscriptions` (todas las suscripciones, cada tarjeta con acción «Cancelar»). `PodcastSearch` usa un `SearchResultCard` propio con otro tipo de dato y acción de suscripción, y los episodios se renderizan con `EpisodeRow`. La portada agrega «Continuar escuchando» y «Novedades» en rejillas de dos columnas (`xl:grid-cols-2`), y un bloque de resumen de cola. No existe hoy forma de descartar un episodio de «Continuar escuchando» ni un contador de cola en la navegación; el progreso se guarda en `podcast_progress` sin marca de descarte. El objetivo es reutilizar el patrón de radio sin tocar el store ni el toggle, y ampliar la portada y la API para el nuevo alcance.

## Goals / Non-Goals

**Goals:**

- Un único componente `PodcastList` que centralice la presentación tarjeta/lista de podcasts.
- Reutilizar el modo global existente de `useViewModeStore` y el toggle de la cabecera.
- Mantener en modo lista la misma información y acciones que ofrece la tarjeta, incluida la acción contextual de cada página.
- Evitar duplicar la lógica de rejilla entre `PodcastHome` y `PodcastSubscriptions`.
- Que «Continuar escuchando» y «Novedades» cambien a una sola columna densa en modo lista.
- Permitir descartar episodios de «Continuar escuchando» de forma persistente en el servidor.
- Sustituir el bloque de resumen de cola de la portada por un badge de conteo en el ítem «Cola» de la navegación.

**Non-Goals:**

- Crear una preferencia independiente para podcasts o sincronizarla con el perfil.
- Cambiar `PodcastCard`, `ViewModeToggle` o el store de vista.
- Aplicar el modo a resultados de descubrimiento, episodios, cola, estadísticas o fichas de podcast.
- Permitir deshacer un descarte o descartar episodios desde otras listas.
- Cambiar la semántica de completado o eliminar el progreso al descartar.
- Cambios en ingesta de feeds, suscripciones o estadísticas de escucha.

## Decisions

- **Reutilizar `useViewModeStore` en lugar de un store específico de podcasts.** Una sola preferencia global evita dos controles en la cabecera y cumple la coherencia pedida: alternar en radio afecta a podcasts y viceversa. Alternativa descartada: `tolocha:podcastViewMode` separado, que duplicaría UI y permitiría estados incoherentes entre secciones.
- **Nuevo `components/podcasts/PodcastList.tsx` con la misma forma que `StationList`.** Recibe `podcasts: PodcastSummary[]` y `renderAction?: (podcast: PodcastSummary) => ReactNode`. En modo `card` renderiza la rejilla actual de `PodcastCard`; en modo `list`, un contenedor `flex flex-col gap-2` de `PodcastListItem`. Alternativa descartada: condicionales inline en cada página, que duplican clases y se desincronizan con facilidad.
- **`renderAction` como función, no como nodo.** `PodcastSubscriptions` necesita una acción distinta por podcast (cancelar esa suscripción); una función conserva el cierre sobre cada `podcast.id` y evita reutilizar el mismo nodo en varias filas. `PodcastCard` mantiene su prop `action?: ReactNode` sin cambios.
- **Nuevo `components/podcasts/PodcastListItem.tsx`.** Fila con `PodcastCover` (tamaño fijo, `rounded-lg`), título y autor truncados, insignia de episodios, insignia «Suscrito» cuando aplique y acción alineada a la derecha. Portada y título enlazan a `/podcasts/:id`, igual que la tarjeta, para conservar la navegación. Se reutiliza `PodcastCover` para mantener `loading="lazy"`, `referrerPolicy="no-referrer"` y el fallback seguro ya especificados.
- **Acción visible en ambos modos.** En tarjeta se mantiene en la fila inferior de metadatos; en lista se coloca a la derecha, con el mismo texto y estado de `disabled` de la mutación de cancelación. El área táctil mínima se mantiene con padding y `text-xs`.
- **Mismos breakpoints que la rejilla actual.** `grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4`; no se introduce una rejilla nueva para no alterar el aspecto existente en modo tarjeta.
- **Modo lista en la portada para episodios.** `PodcastHome` lee `useViewModeStore` y alterna la clase de las secciones «Continuar escuchando» y «Novedades» entre `grid gap-2 xl:grid-cols-2` (tarjeta) y `flex flex-col gap-2` (lista). Se mantiene `EpisodeRow` en ambos modos para no duplicar acciones; solo cambia el número de columnas y la densidad.
- **`dismissed_at` en `podcast_progress`.** Una columna entera nullable con marca temporal permite excluir el episodio de `continueListening` sin borrar posición ni completado. Alternativa descartada: tabla de descartes separada, que obliga a limpiar dos fuentes y complica la reaparición; alternativa descartada: borrar la fila de progreso, que perdería la reanudación.
- **Limpiar el descarte al registrar progreso.** `recordProgress` pone `dismissedAt: null` en el `insert` y en el `onConflictDoUpdate`, de modo que volver a escuchar el episodio lo restaura en «Continuar escuchando». Un envío idempotente antiguo (misma `sequence`) no lo restaura.
- **Endpoint `POST /api/v1/podcasts/episodes/:episodeId/dismiss`.** Marca el progreso existente y responde `{ dismissed: boolean }`; si no hay progreso no crea filas. Alternativa descartada: `DELETE .../progress`, que perdería la posición. La UI solo muestra la acción en «Continuar escuchando», pero el endpoint es idempotente y reutilizable.
- **Conteo de cola ligero.** `GET /api/v1/podcasts/queue/count` usa `PodcastQueueService.countForUser` (ya existente) y devuelve `{ count, limit }`, evitando cargar hasta 200 episodios solo para el badge.
- **Badge en el menú de Podcasts.** `AppShell` consulta `["podcast-queue-count"]` solo con sesión, podcasts activos y sección de podcasts; el badge se pinta junto al ítem «Cola» en la navegación de escritorio y en el menú móvil. Se invalida la query en las mutaciones de cola (añadir, quitar, reordenar y avance automático).
- **Eliminar la tarjeta de resumen de cola de la portada.** El enlace «Cola» de la cabecera de `/podcasts` se mantiene sin el contador textual; el conteo vive en el badge de la navegación.

## Risks / Trade-offs

- **Una única preferencia global puede sorprender a quien quiera tarjetas en radio y lista en podcasts** → Es la interpretación explícita de coherencia del cambio; se documenta en la propuesta y se puede separar en un cambio futuro sin romper datos (migración de clave).
- **Filas con demasiada información en móvil** → Se truncan título y autor (`truncate` + `title`), la insignia de suscripción se mantiene compacta y la acción se alinea sin empujar el contenido; se verifica en el smoke de 360px.
- **Desincronización si una página futura vuelve a usar `PodcastCard` en una rejilla inline** → `PodcastList` queda como único punto de renderizado de listados de podcasts; las revisiones deben preferirlo.
- **Sin cobertura de test de componente** → El proyecto no tiene infraestructura de testing de React; se cubre con `typecheck`, `lint`, `build` y smoke manual en ambos modos, siguiendo el precedente de `view-mode-toggle`.
- **Descarte accidental sin deshacer** → El episodio se restaura al volver a registrar progreso y se muestra un toast al descartar; una acción de deshacer queda para un cambio futuro.
- **Badge desactualizado si una mutación olvida invalidar** → Centralizar la invalidación de `["podcast-queue-count"]` junto a `["podcast-queue"]` en `EpisodeRow`, `PodcastQueue` y `PodcastAutoAdvance`; el test de API cubre el conteo y el smoke cubre la actualización visual.
- **Consulta de conteo en todas las vistas de podcasts** → Es un `COUNT(*)` indexado por `user_id`, sin joins ni carga de episodios; se desactiva fuera de podcasts y con la sección deshabilitada.
- **Migración en bases existentes** → La columna es nullable y los valores previos quedan `NULL`, por lo que ningún episodio se oculta retroactivamente.

## Migration Plan

- Generar y aplicar la migración Drizzle de `podcast_progress.dismissed_at` (nullable) con `npm run db:generate` y `npm run db:migrate` en `apps/api`.
- Desplegar en orden API y web. Las filas existentes quedan con `dismissed_at = NULL` y siguen apareciendo en «Continuar escuchando».
- Rollback: revertir el código y eliminar la columna desde una migración descendente; mientras tanto, la web tolera que el endpoint de descarte no exista mostrando el error y manteniendo el episodio.
