# Podcast Stats Specification

## Purpose

Analítica y visualización privada de estadísticas personales de escucha de podcasts en TolochaRadio: resumen de tiempo de contenido consumido y tasa de finalización sobre episodios únicos, rankings de podcasts y episodios, evolución temporal, hábitos horarios, categorías y sesiones recientes.


## Requirements


### Requirement: Resumen de estadísticas y tasa de finalización por episodio único
El endpoint autenticado `GET /api/v1/podcasts/stats/summary?from=&to=` SHALL devolver para el usuario y rango indicados: `totalMs` (tiempo de contenido consumido), `episodesStarted` (episodios únicos con al menos 30 segundos escuchados), `episodesCompleted` (episodios únicos completados), `completionRate` (`episodesCompleted / episodesStarted`, o `0` si no hay empezados), `podcastsCount` y `averageEpisodeMs`.

#### Scenario: Usuario con episodios escuchados en varias sesiones
- **WHEN** un usuario termina un episodio de 60 minutos repartido en 3 sesiones y consulta `GET /api/v1/podcasts/stats/summary`
- **THEN** el servidor contabiliza `episodesStarted: 1`, `episodesCompleted: 1` y `completionRate: 1`, sin penalizar la tasa por el número de sesiones

### Requirement: Rankings de podcasts, episodios y categorías más escuchados
El sistema SHALL exponer los endpoints autenticados `GET /api/v1/podcasts/stats/top-podcasts`, `GET /api/v1/podcasts/stats/top-episodes` y `GET /api/v1/podcasts/stats/categories` filtrables por rango (`from`, `to`) y límite (`limit`), ordenados de mayor a menor `totalMs`. Si un podcast pertenece a varias categorías, su tiempo SHALL contabilizarse en cada una de ellas; si no tiene categorías, SHALL agruparse bajo `"desconocido"`.

#### Scenario: Consulta de podcasts más escuchados
- **WHEN** un usuario autenticado solicita `GET /api/v1/podcasts/stats/top-podcasts?limit=5`
- **THEN** recibe hasta 5 podcasts ordenados por `totalMs` descendente junto con el conteo de episodios empezados y completados de cada uno

### Requirement: Evolución temporal, hábitos horarios y sesiones recientes de podcasts
El sistema SHALL exponer `GET /api/v1/podcasts/stats/timeline?from=&to=&granularity=day|week|month` (rellenando con cero los cubos sin actividad dentro del rango), `GET /api/v1/podcasts/stats/habits?from=&to=` (agrupado por `weekday` ISO y `hour` en `STATS_TIMEZONE`) y `GET /api/v1/podcasts/stats/recent?limit=` con las últimas sesiones de escucha ordenadas por `startedAt` descendente.

#### Scenario: Evolución temporal con días sin escucha
- **WHEN** un usuario consulta `GET /api/v1/podcasts/stats/timeline?from=2026-10-01&to=2026-10-07&granularity=day` teniendo escuchas solo en dos días
- **THEN** el servidor devuelve los 7 días del rango con `totalMs: 0` en los días sin actividad

### Requirement: Página privada de estadísticas de podcasts (`/podcasts/estadisticas`)
La interfaz web SHALL ofrecer a los usuarios autenticados la ruta `/podcasts/estadisticas` en la navegación de Podcasts, con controles de periodo y granularidad (`StatsFilters`), tarjetas de resumen (`PodcastStatsSummary`), evolución temporal (`TimelineChart`), rankings (`TopPodcasts`, `TopEpisodes`), mapa de calor (`HabitsHeatmap`), desglose por categorías (`CategoryChart`) y sesiones recientes (`RecentEpisodes`).

#### Scenario: Visualización de estadísticas de podcasts con cambio de periodo
- **WHEN** un usuario autenticado abre `/podcasts/estadisticas` y cambia el filtro de periodo de 30 días a 7 días
- **THEN** todos los paneles y gráficos de la página actualizan sus datos para el nuevo rango
