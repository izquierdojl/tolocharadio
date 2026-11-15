# Tasks

## 1. Servicio `PodcastStatsService` y endpoints en API

- [x] 1.1 Extraer los helpers compartidos de rango, granularidad y `zeroFill` e implementar `apps/api/src/services/podcasts/stats.ts` (`summary`, `topPodcasts`, `topEpisodes`, `timeline`, `habits`, `categories`, `recent` y purga de retención), verificándolo con tests unitarios en `apps/api/test/podcasts-stats.test.ts`.
- [x] 1.2 Exponer los endpoints `GET /api/v1/podcasts/stats/summary`, `top-podcasts`, `top-episodes`, `timeline`, `habits`, `categories` y `recent` en `apps/api/src/routes/podcasts.ts`, documentarlos en `apps/api/src/openapi.ts` y `docs/api.md`, y verificar que los tests de integración y `apps/api/test/openapi.test.ts` pasan.

## 2. Vista web `/podcasts/estadisticas` y componentes gráficos

- [x] 2.1 Crear `PodcastStatsSummary.tsx`, `TopPodcasts.tsx`, `TopEpisodes.tsx`, `CategoryChart.tsx` y `RecentEpisodes.tsx` en `apps/web/src/components/podcasts/`, reutilizando `StatsFilters`, `TimelineChart`, `HabitsHeatmap` y `SectionCard`, y verificar con tests de componente.
- [x] 2.2 Crear la página `apps/web/src/pages/podcasts/PodcastStats.tsx`, registrarla en `/podcasts/estadisticas` en `apps/web/src/App.tsx` y en la navegación de Podcasts de `apps/web/src/components/AppShell.tsx`, actualizar `docs/uso.md` y verificar con `npm run verify:full` y smoke test en Docker (`docker compose up --build -d`).
