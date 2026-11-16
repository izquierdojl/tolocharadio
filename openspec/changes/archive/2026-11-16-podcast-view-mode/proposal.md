# Proposal

## Why

Las vistas de radio ya permiten alternar entre tarjetas y lista mediante un control global en la cabecera, pero las vistas de podcasts que listan podcasts (`/podcasts` y `/podcasts/suscripciones`) muestran siempre una rejilla de tarjetas. Esa incoherencia impide aprovechar una preferencia que el usuario ya ha elegido y hace que la sección de podcasts se perciba como un producto distinto dentro de la misma aplicación.

## What Changes

- **Reutilizar el modo de vista global**: los listados de podcasts respetan el mismo estado `card`/`list` del store `useViewModeStore` y el mismo control de cabecera que ya usan explorar, favoritos e historial de radio. No se crea una preferencia nueva ni se duplica el toggle.
- **Nuevo listado de podcasts con dos presentaciones**: un componente `PodcastList` recibe los podcasts y renderiza la rejilla actual de `PodcastCard` en modo tarjeta o filas densas de un nuevo `PodcastListItem` en modo lista.
- **Nuevo componente de fila de podcast**: `PodcastListItem` muestra la portada, el título, el autor, el número de episodios, la insignia de suscripción y un hueco para la acción contextual (por ejemplo, «Cancelar» suscripción), con la misma información accesible que la tarjeta.
- **Aplicación en las vistas que listan podcasts**: se sustituyen las rejillas inline de `PodcastHome` («Tus podcasts», hasta 8) y `PodcastSubscriptions` (todas las suscripciones, con acción de cancelar) por `PodcastList`.
- **Portada completa en modo lista**: en `/podcasts`, las secciones «Continuar escuchando» y «Novedades» pasan de una rejilla de dos columnas a una lista de una sola columna cuando el modo global es lista; «Tus podcasts» ya lo hace mediante `PodcastList`.
- **Descarte persistente en «Continuar escuchando»**: cada episodio en progreso SHALL poder descartarse desde la portada. El descarte se guarda en el servidor (`dismissed_at` en `podcast_progress`), desaparece de «Continuar escuchando» en todos los dispositivos y se limpia si el usuario vuelve a registrar progreso en ese episodio.
- **Sin tarjeta de resumen de cola**: se elimina el bloque «Cola de reproducción» de la portada de podcasts; el acceso a la cola se mantiene en la cabecera y en la navegación.
- **Contador de cola en la navegación**: el ítem «Cola» del menú de Podcasts SHALL mostrar un badge con el número de episodios en cola (solo si es mayor que cero), mediante un endpoint ligero de conteo.
- **Persistencia y valor por defecto sin cambios**: se mantiene la clave `tolocha:viewMode` de localStorage y el modo tarjeta como predeterminado; cambiar el modo en radio afecta también a podcasts y viceversa.

**Supuestos (decisiones de alcance):**

- Se comparte una única preferencia global tarjeta/lista para radio y podcasts, en lugar de preferencias independientes por sección, para maximizar la coherencia que motiva el cambio.
- Los resultados de descubrimiento (`/podcasts/descubrir`) no se incluyen porque usan `PodcastSearchResult` (sin id interno ni estado de suscripción) y ya se presentan como filas compactas con su propia acción de suscribirse.
- Los listados de episodios (cola, favoritos, novedades, ficha del podcast) y las estadísticas ya usan filas o gráficos; no se ven afectados.

## Capabilities

### New Capabilities

<!-- Ninguna: la funcionalidad se integra en la capacidad web existente. -->

### Modified Capabilities

- `web-ui`: el modo de vista global tarjeta/lista pasa a aplicarse también a los listados de podcasts y a las secciones «Continuar escuchando» y «Novedades» de la portada; además, se añade el descarte de episodios y el badge de cola en la navegación.
- `podcast-library`: la portada agregada excluye los episodios descartados de «Continuar escuchando», se añade el endpoint de descarte persistente y un endpoint ligero de conteo de cola.

## Impact

- **Web** (`apps/web`): nuevos `components/podcasts/PodcastList.tsx` y `components/podcasts/PodcastListItem.tsx`; adaptación de `pages/podcasts/PodcastHome.tsx`, `pages/podcasts/PodcastSubscriptions.tsx`, `components/podcasts/EpisodeRow.tsx`, `components/AppShell.tsx`, `lib/api.ts` y `lib/types.ts`.
- **API** (`apps/api`): nueva columna `dismissed_at` en `podcast_progress` con migración Drizzle, método de descarte en `PodcastProgressService`, filtrado de descartados en la consulta de `home`, y endpoints autenticados de descarte y conteo de cola; actualización de OpenAPI y tests.
- **Sin cambios** en `stores/viewMode.ts`, `components/ViewModeToggle.tsx` ni en el control de modo de la cabecera.
- **Sin cambios** en reproducción, estadísticas, ingesta de feeds ni suscripciones.
- **Especificaciones**: deltas de `web-ui` y `podcast-library`.
