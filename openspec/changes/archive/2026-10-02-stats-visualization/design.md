# Design

## Context

Ver `proposal.md` — Why. Estado actual relevante:

- La API ya expone `GET /stats/me/{top,timeline,habits,genres,countries,recent}` con JWT, documentados en `docs/api.md` y `apps/api/src/openapi.ts`. No hay que tocar el backend.
- La web (`apps/web`) usa React 19 + Vite + Tailwind 4 con vars de tema (`data-theme="light|dark"` en `index.css`), `react-router-dom` con `RequireAuth`, `tanstack/react-query` para datos (`History.tsx` como patrón), `EmptyState` para vacíos/errores y `lucide-react` para iconos.
- No hay librería de gráficos. El heatmap de hábitos (7x24 = 168 celdas) y la serie temporal con huecos a cero son los dos visuales que condicionan la elección.

## Goals / Non-Goals

**Goals:**

- Panel `/estadisticas` privado que consume los seis endpoints existentes con filtros de periodo compartidos.
- Gráficos legibles en móvil y en ambos temas sin duplicar configuración de colores.
- Bundle contenido: una sola dependencia nueva y heatmap sin librería.

**Non-Goals:**

- Cambios en la API, el esquema o el contrato OpenAPI.
- Mapa de países (coropletas), exportación CSV/PDF, comparativas entre usuarios o rankings globales.
- Borrado de estadísticas (`DELETE /stats/me`, futuro).
- Tiempo real / refresco en vivo mientras suena (los datos se recargan al cambiar filtros o al volver a la página).

## Decisions

### D1. Recharts como única librería de gráficos

Se añade `recharts` a `apps/web` para `top` (barras horizontales), `timeline` (área), `genres` y `countries` (donut + barras). Es declarativa React (`<ResponsiveContainer>`, `<BarChart>`, `<AreaChart>`, `<PieChart>`), resuelve el responsive sin scroll horizontal y permite tooltips y ejes en español con formateadores propios.

**Alternativas descartadas:** Chart.js + react-chartjs-2 (imperativa, theming manual, sin ventaja de peso); ECharts (heatmap y mapa nativos pero ~doble de bundle para 2-4 países); Nivo/Tremor (tema propio que choca con `data-theme`); D3 puro o SVG 100% manual (el timeline con 30-90 puntos, tooltip y ceros se vuelve coste de mantenimiento sin aportar valor).

### D2. Mapa de calor de hábitos con CSS grid propio

`habits` llega disperso (`{ weekday, hour, totalMs }`); el frontend densifica a matriz 7x24 y la pinta con `grid` Tailwind (168 `button/div` con opacidad o escala `pine/ochre` según `totalMs/max`). Cada celda lleva `title` y `aria-label` en español ("lunes 08:00 — 45 min"). En móvil la cuadrícula admite scroll-x contenido o se colapsa a franjas; la decisión fina queda en tasks con prueba en 360px.

**Alternativa descartada:** forzar el heatmap en Recharts (`ScatterChart` con rectángulos) — más código, peor nitidez y peor accesibilidad que el grid nativo.

### D3. Estructura de página y datos

- Ruta `/estadisticas` bajo `RequireAuth` en `App.tsx` + entrada en `NAV_ITEMS` de `AppShell.tsx` (nuevo icono `ChartColumn` de lucide).
- `pages/Stats.tsx` como composición: `StatsFilters` (periodo + granularidad + rango custom), `StatsSummary` (KPI), `TimelineChart`, `TopStations`, `HabitsHeatmap`, `GenreChart`, `CountryChart`, `RecentList`.
- `lib/stats.ts`: tipos de los seis endpoints, `formatDurationMs` ("45 min", "3 h 12 min"), `formatDayEs`, granularidad automática (`<=62 días → day`, `<=370 → week`, si no `month`), y densificado del heatmap.
- `hooks/useStats.ts`: seis `useQuery` con clave `["stats", endpoint, from, to, ...]` y `enabled` por sesión; `recent` independiente del rango (solo `limit`). Reutiliza `api.get` con su renovación de token; el 401 sigue el flujo existente.
- `top/genres` resuelven nombre/favicon del snapshot más reciente (ya lo hace la API); el frontend solo muestra `favicon ?? fallback`.

### D4. Formato y zona horaria

Los buckets y rangos son fechas locales `YYYY-MM-DD` en `Europe/Madrid` (servidor). El frontend no recalcula zonas: envía `from/to` tal cual, muestra etiquetas con `Intl.DateTimeFormat("es-ES")` y duraciones con `formatDurationMs`. Los días sin actividad de `timeline` ya vienen a cero desde la API y se pintan como tal.

### D5. Tema claro/oscuro sin config duplicada

Paleta fija pequeña (`pine-500/400`, `ochre-400/500`, `moss-400`) leída desde las CSS vars de `index.css`; `CartesianGrid stroke="var(--line)"`, `Tick fill="var(--muted)"`, tooltip con `contentStyle` sobre `var(--surface-raised)`. Al alternar `data-theme` no hay que reconstruir nada. Contraste verificado en ambos temas.

### D6. Layout responsive y accesibilidad

Grid `1 col` en móvil → `2 col` en `lg` para emparejar evolución+top y hábitos+géneros/países; recientes a ancho completo. Cada gráfico lleva `aria-label`, tabla oculta o `title` equivalente, y foco visible en celdas del heatmap. Secciones independientes: el fallo de una no oculta las demás (error + reintentar por sección con `EmptyState`).

## Risks / Trade-offs

- [Peso del bundle de Recharts] → Mitigación: importar solo los módulos usados, verificar `npm run build` y tamaño del chunk; si se dispara, diferir con `React.lazy` la página de estadísticas.
- [Heatmap ilegible en 360px] → Mitigación: prueba manual en móvil; fallback a franjas de 3h o scroll-x acotado, sin romper el layout.
- [React 19 + Recharts] → Mitigación: fijar versión 3.x compatible con React 19 y validar `typecheck/lint/build` en la primera tarea de setup.
- [Sesgo de segundos entre secciones tras cierre abrupto] → Ya documentado en `listening-stats`; el resumen indica "datos aproximados" si aplica, sin lógica nueva.
- [Géneros con muchas etiquetas] → Mitigación: `limit=10` por defecto y resto agrupado; barras horizontales en vez de donut cuando hay >6 categorías.

## Migration Plan

1. `npm install recharts` en `apps/web` (solo aditivo); resto de cambios confinados a archivos nuevos + `App.tsx`/`AppShell.tsx`.
2. Despliegue estándar (`docker compose up --build -d`); sin migraciones ni variables nuevas.
3. Rollback: revertir el change; la API de stats queda intacta y sin uso visible.

## Open Questions

- ¿La entrada de navegación debe llamarse "Estadísticas" y vivir junto a Historial, o dentro de Perfil? El diseño asume ruta propia con entrada en el nav; cambiarlo es solo mover el enlace.
- ¿El rango personalizado necesita selector de calendario propio o bastan dos `<input type="date">`? Se asumen dos inputs nativos localizados.
