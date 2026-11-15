# Design

## Context

Ver `proposal.md` para la motivación. El Change 2 ya creó las tablas `podcast_listen_sessions` y `user_podcast_stats_hourly` y las alimenta de forma idempotente en cada actualización de progreso. Este change añade el servicio de consulta `PodcastStatsService`, los endpoints `/api/v1/podcasts/stats/*` y la página `/podcasts/estadisticas` paralela a `/estadisticas` de radio.

## Goals / Non-Goals

**Goals:**
- Ofrecer paridad analítica con la radio en vivo pero con métricas adaptadas a podcasts (tiempo de contenido, episodios empezados/completados y tasa de finalización sobre episodios únicos).
- Reutilizar las primitivas temporales (`zonedBucket`, `zonedDayBounds`, `startOfIsoWeek`, `isoWeekday` en `apps/api/src/lib/time.ts`) y los componentes gráficos de `apps/web/src/components/stats/`.
- Mantener el tamaño de `podcast_listen_sessions` acotado mediante retención periódica sin perder los agregados horarios.

**Non-Goals:**
- Unificar las tablas o endpoints de estadísticas de radio y podcasts en un único esquema polimórfico (sus fuentes de medición —flujo de bytes en servidor vs tiempo de contenido reportado— tienen semánticas distintas).

## Decisions

### D1. `PodcastStatsService` paralelo a `StatsService` con helpers compartidos
- **Decisión**: extraer la validación de parámetros de consulta (`parseRange`, `parseLimit`, `parseGranularity`) y el rellenado de cubos vacíos (`zeroFill`) a un módulo compartido entre `apps/api/src/routes/stats.ts` y `apps/api/src/services/podcasts/stats.ts`, manteniendo `PodcastStatsService` separado de `StatsService`.
- **Por qué**: evita tocar la lógica de pulsos en memoria de la radio en vivo y mantiene contratos OpenAPI limpios y específicos por dominio.

### D2. Métricas sobre episodios únicos en el rango
- **Decisión**:
  - `episodesStarted`: `COUNT(DISTINCT episode_id)` de sesiones del usuario en el rango donde la suma de `listened_ms` del episodio sea `>= 30_000`.
  - `episodesCompleted`: `COUNT(DISTINCT episode_id)` de episodios del usuario con `completed = 1` dentro del rango.
  - `completionRate`: `episodesStarted > 0 ? Math.min(1, episodesCompleted / episodesStarted) : 0`.
- **Por qué**: medir por episodio único evita que escuchar un episodio largo en varias sesiones reduzca artificialmente la tasa de finalización.

### D3. Páginas separadas `/estadisticas` (Radio) y `/podcasts/estadisticas` (Podcasts)
- **Decisión**: mantener cada panel de estadísticas dentro de su propia sección de navegación, reutilizando `StatsFilters`, `TimelineChart`, `HabitsHeatmap`, `SectionCard` y `formatDurationMs`.

### D4. Retención de sesiones detalladas (`podcast_listen_sessions`)
- **Decisión**: purgar periódicamente filas de `podcast_listen_sessions` con `started_at` anterior a 730 días (configurable), conservando indefinidamente `user_podcast_stats_hourly` y `podcast_progress`.

## Risks / Trade-offs

- **[Episodios eliminados de un feed RSS]** → Como estableció el Change 1, los episodios referenciados por sesiones o cubos horarios nunca se borran físicamente (`removed_at` solo los oculta del catálogo activo), por lo que los `JOIN` de `top-episodes` y `recent` nunca pierden título ni portada.

## Migration Plan

1. No requiere migración de esquema si las tablas e índices ya se crearon en el Change 2 (o añade únicamente índices compuestos adicionales si fueran necesarios).
2. Despliegue directo de endpoints y vista web `/podcasts/estadisticas`.
