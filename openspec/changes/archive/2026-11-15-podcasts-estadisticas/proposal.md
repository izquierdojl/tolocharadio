# Proposal

## Why

La radio en vivo cuenta con una sección completa de estadísticas personales de escucha, y los podcasts necesitan paridad analítica adaptada a contenido bajo demanda: medir tiempo de contenido consumido por podcast y por episodio, episodios empezados y completados, tasa de finalización sobre episodios únicos, evolución temporal, hábitos horarios, categorías y sesiones recientes.

## What Changes

- **Servicio `PodcastStatsService` (`apps/api/src/services/podcasts/stats.ts`)**:
  - Consultas agregadas sobre `user_podcast_stats_hourly` y `podcast_listen_sessions` respetando `STATS_TIMEZONE` y rangos `from`/`to`.
  - Cálculo de `summary` (`totalMs`, `episodesStarted` con `>= 30 s` escuchados, `episodesCompleted`, `completionRate` sobre episodios únicos, `podcastsCount`, `averageEpisodeMs`), `top-podcasts`, `top-episodes`, `timeline` (`day | week | month`), `habits` (día de la semana y hora), `categories` (desglose por categorías del podcast) y `recent` (últimas sesiones de escucha).
  - Política de retención para purgar sesiones antiguas en `podcast_listen_sessions` conservando indefinidamente los agregados horarios en `user_podcast_stats_hourly`.
- **Endpoints REST y OpenAPI de estadísticas de podcasts**:
  - `GET /api/v1/podcasts/stats/summary`
  - `GET /api/v1/podcasts/stats/top-podcasts`
  - `GET /api/v1/podcasts/stats/top-episodes`
  - `GET /api/v1/podcasts/stats/timeline`
  - `GET /api/v1/podcasts/stats/habits`
  - `GET /api/v1/podcasts/stats/categories`
  - `GET /api/v1/podcasts/stats/recent`
- **Pantalla web `/podcasts/estadisticas`**:
  - Nueva vista privada integrada en la navegación de Podcasts que reutiliza `StatsFilters`, `TimelineChart`, `HabitsHeatmap` y utilidades de formato de duración, e incorpora `PodcastStatsSummary`, `TopPodcasts`, `TopEpisodes`, `CategoryChart` y `RecentEpisodes`.

## Capabilities

### New Capabilities
- `podcast-stats`: agregación, consulta y visualización de estadísticas personales de escucha de podcasts (resumen con tasa de finalización por episodio único, rankings de podcasts y episodios, evolución temporal, mapa de calor de hábitos, categorías y sesiones recientes).

### Modified Capabilities

## Impact

- **Backend (`apps/api`)**:
  - Nuevo servicio `src/services/podcasts/stats.ts` y extracción de helpers comunes de rango/granularidad junto a `src/services/stats.ts`.
  - Nuevas rutas en `src/routes/podcasts.ts` y documentación en `src/openapi.ts`.
- **Frontend (`apps/web`)**:
  - Nueva página `src/pages/podcasts/PodcastStats.tsx` y componentes en `src/components/podcasts/` (`PodcastStatsSummary.tsx`, `TopPodcasts.tsx`, `TopEpisodes.tsx`, `CategoryChart.tsx`, `RecentEpisodes.tsx`).
  - Entrada de navegación hacia `/podcasts/estadisticas` en la sección Podcasts de `AppShell.tsx`.
