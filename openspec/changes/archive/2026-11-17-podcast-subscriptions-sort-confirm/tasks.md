# Tasks

## 1. API: `latestPendingEpisodeAt` en el listado de suscripciones

- [x] 1.1 Añadir `latestPendingEpisodeAt?: number | null` a `PodcastSummary` en `apps/api/src/services/podcasts/catalog.ts` y al esquema `PodcastSummary` de `apps/api/src/openapi.ts` (opcional y nullable); verificar con `npm run typecheck -w apps/api`.
- [x] 1.2 En `PodcastSubscriptionsService.list` (`subscriptions.ts`) calcular en una sola consulta agregada (`MAX(published_at)` por podcast sobre episodios activos con fecha y sin `completed_at` del usuario) y rellenar el campo (`null` si no hay); mantener el orden `subscribed_at DESC`. Verificar con los tests de 1.3.
- [x] 1.3 Tests en `apps/api/test/` (nuevo `podcasts-subscriptions.test.ts` o ampliando `podcasts-catalog.test.ts`) cubriendo los escenarios del spec `podcast-catalog`: con pendientes, a medias cuenta, todos completados → `null`, episodios eliminados/sin fecha ignorados y aislamiento entre usuarios; verificar con `npm run test -w apps/api`.

## 2. Web: orden de suscripciones

- [x] 2.1 Crear `apps/web/src/lib/subscriptionSort.ts` con el tipo de orden (`recent-episodes` | `name-asc` | `name-desc` | `recent`), la lista de opciones con etiquetas en español y `sortSubscriptions` (colador `Intl.Collator("es", { sensitivity: "base" })`, `null` al final con desempate por nombre, no muta la entrada); añadir `latestPendingEpisodeAt?` a `PodcastSummary` en `lib/types.ts`. Verificar con `subscriptionSort.test.ts` (nombre con acentos/mayúsculas, inverso, episodios recientes con nulos, desempate, `recent` conserva orden).
- [x] 2.2 Crear `apps/web/src/stores/subscriptionSort.ts` (Zustand, clave `tolocha:subscriptionSort`, valor por defecto `recent-episodes`, validación y `try/catch` como `viewMode.ts`); verificar con un test que un valor guardado inválido o un `localStorage` que lanza devuelven `recent-episodes`.
- [x] 2.3 En `PodcastSubscriptions.tsx` añadir el `<select>` accesible «Ordenar por» en la cabecera y aplicar `sortSubscriptions` con `useMemo`; verificar manualmente que cambiar el orden reordena sin peticiones nuevas, que se conserva al recargar y que funciona en vista tarjeta y lista.

## 3. Web: confirmación de baja

- [x] 3.1 En `PodcastSubscriptions.tsx` guardar el podcast pendiente de baja en estado, abrir `ConfirmDialog` destructivo con el nombre del podcast y ejecutar la mutación solo al confirmar, cerrando el diálogo en `onSettled`; verificar manualmente confirmar, cerrar con botón/Escape/clic fuera y error del servidor.
- [x] 3.2 En `PodcastShow.tsx` mostrar el mismo diálogo cuando `podcast.isSubscribed` es verdadero al pulsar el botón (suscribirse sigue siendo inmediato); verificar manualmente ambos sentidos del botón.

## 4. Verificación integral

- [x] 4.1 Ejecutar `npm run verify:full` y comprobar que typecheck, lint, tests y build pasan.
- [x] 4.2 Reconstruir con `docker compose up --build -d` y hacer smoke: `GET /api/v1/podcasts/subscriptions` devuelve `latestPendingEpisodeAt`, el orden y la confirmación funcionan en la UI.

## Workflow follow-up

- Cambio pequeño sin esquema ni dependencias: puede ir directo a `main`; comitear TODO (código + openspec) antes de archivar.
- Archivar el change y, ya en `main`, `node scripts/bump.js minor`; empujar `main`, esperar CI verde y después `git push origin --tags`.
