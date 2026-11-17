# Design

## Context

La cola ya devuelve `isFavorite` por episodio (`GET /api/v1/podcasts/queue` usa `toEpisodeItem` con el set de favoritos del usuario) y los endpoints de favoritos existen. `EpisodeRow` ya implementa un botón de corazón con mutación, toast e invalidación de caché, mientras que `QueuePanel` mantiene una copia local de los episodios para la reordenación por arrastre y la reinicia por `revision`. Ver `proposal.md` para la motivación y `specs/podcast-library/spec.md` para el contrato.

## Goals / Non-Goals

**Goals:**

- Reutilizar un único control de favorito entre las filas de listas y las filas de la cola.
- Mantener el corazón de la cola sincronizado aunque la revisión de la cola no cambie.
- Unificar el término «cola de reproducción» en la interfaz, la API y la documentación.

**Non-Goals:**

- Añadir el favorito al reproductor persistente o al episodio activo oculto de la cola.
- Cambiar endpoints, tablas, migraciones o el modelo de revisión de la cola.
- Renombrar la ruta `/podcasts/cola`, el ítem de navegación «Cola» o los helpers internos `podcastQueue`.

## Decisions

### Componente compartido `EpisodeFavoriteButton`

Se extrae el corazón de `EpisodeRow` a `apps/web/src/components/podcasts/EpisodeFavoriteButton.tsx`. El componente recibe `episodeId`, `isFavorite`, un `onChange` opcional y `className`, y encapsula la mutación (`addPodcastFavorite`/`removePodcastFavorite`), el estado local del corazón, el toast y la invalidación de `podcast-home`, `podcast-favorites`, `podcast-queue`, `podcast-queue-count` y `podcast-episodes`.

- **Por qué**: evita duplicar estilos y textos accesibles entre dos vistas y centraliza qué cachés se refrescan al cambiar un favorito.
- **Alternativa descartada**: dejar dos implementaciones separadas; el estado del corazón y la invalidación se desincronizarían con facilidad.

El estado local se inicializa desde la prop y se resincroniza cuando la prop cambia, de modo que funciona tanto con listas controladas por consultas como con la copia local de la cola. El cambio se aplica solo tras la respuesta correcta; si falla, se conserva el estado anterior y se muestra el error.

### Sincronización explícita en `QueuePanel`

`QueuePanelList` mantiene `items` en estado local y se reinicia con `key={queue.revision}`. Marcar un favorito no altera la revisión de la cola, así que invalidar `podcast-queue` no actualiza esa copia local. Por eso la fila recibe un callback `onFavoriteChange(episodeId, isFavorite)` que actualiza `items` con `setItems`, además de la invalidación de caché del componente.

- **Por qué**: el corazón de la fila queda sincronizado al instante y la copia local conserva el orden existente.
- **Alternativa descartada**: forzar un remount de `QueuePanel` cambiando la clave con el estado de favoritos; perdería el orden local y complicaría el arrastre.

### Textos y renombrado acotado

`PodcastQueue.tsx` muestra «Cola de reproducción» como `h1` y «Episodios a continuación» como subtítulo, eliminando el párrafo descriptivo anterior. El mensaje de `QUEUE_LIMIT_REACHED` en `apps/api/src/services/podcasts/queue.ts` pasa a «La cola de reproducción permite un máximo de … episodios» (con tilde). Se actualizan `docs/uso.md`, `docs/api.md`, `docs/arquitectura.md` y el comentario de `apps/desktop/src-tauri/src/media.rs`.

- **Por qué**: el cambio de término es de producto y documentación; no requiere tocar rutas ni contratos de datos.
- **Alternativa descartada**: renombrar la ruta o los identificadores internos, que rompería enlaces y el cliente de escritorio sin aportar valor.

### Pruebas

- Test de markup estático de `EpisodeFavoriteButton` con `QueryClientProvider`: estados favorito/no favorito, textos accesibles, `aria-pressed` y deshabilitado mientras está pendiente.
- Ampliar el test de API de cola para comprobar que `GET /podcasts/queue` devuelve `isFavorite: true` tras marcar un episodio y `false` tras quitarlo.
- Verificación final con `npm run verify:full` y smoke manual de la cola (marcar, quitar, error simulado y comprobación de que el orden no cambia).

## Risks / Trade-offs

- [La invalidación de `podcast-queue` no actualiza la copia local] → El callback `onFavoriteChange` actualiza `items` en el mismo instante; la invalidación queda para el resto de vistas.
- [Dobles peticiones por pulsaciones rápidas] → El botón se deshabilita mientras la mutación está pendiente y usa `aria-pressed` para reflejar el estado.
- [El toast de error de la API muestra un texto distinto al esperado] → El mensaje se actualiza en el servicio y se cubre con el test de API y el smoke manual.
- [Invalidar todas las listas de episodios al cambiar un favorito] → Es una operación poco frecuente; se prefiere la simplicidad y la coherencia entre vistas al ahorro de una petición.

## Migration Plan

Sin migración de datos ni cambios de esquema. Despliegue normal con la aplicación; rollback = revertir el change. No hay cambios incompatibles para clientes existentes.
