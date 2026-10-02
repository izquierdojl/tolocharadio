# Tasks

## 1. Base y dependencias

- [x] 1.1 Añadir `recharts` (versión 3.x compatible con React 19) a `apps/web` y verificar que `npm install`, `npm run typecheck --workspace @tolocharadio/web` y `npm run build --workspace @tolocharadio/web` pasan sin errores.
- [x] 1.2 Crear la ruta privada `/estadisticas` en `apps/web/src/App.tsx` con `RequireAuth` y la entrada de navegación en `AppShell.tsx` (desktop + hamburguesa), y verificar que un invitado es redirigido y un autenticado ve el esqueleto de la página.

## 2. Capa de datos y formato

- [x] 2.1 Crear `apps/web/src/lib/stats.ts` con tipos de los seis endpoints (`top/timeline/habits/genres/countries/recent`), `formatDurationMs` en español, etiquetas de fecha `es-ES`, granularidad automática y densificado 7x24 de hábitos, y verificar con pruebas unitarias o script de comprobación que los formatos y la matriz son correctos.
- [x] 2.2 Crear `apps/web/src/hooks/useStats.ts` con seis `useQuery` (`["stats", endpoint, from, to, ...]`, `recent` solo con `limit`) consumiendo `api.get("/stats/me/*")`, y verificar que con la API levantada cada hook devuelve datos reales y que un 401 sigue el flujo de refresco existente.

## 3. Filtros, resumen, evolución y top

- [x] 3.1 Implementar `StatsFilters` (periodo 7/30/90d, todo y rango personalizado con validación inicio<=fin, más granularidad día/semana/mes automática) y verificar que cambiar el periodo invalida y recarga todas las secciones agregadas.
- [x] 3.2 Implementar `StatsSummary` (tiempo total, emisora destacada con favicon, día pico) y `TimelineChart` (área Recharts con ceros en días vacíos, ejes y tooltip en español), y verificar visualmente que los valores cuadran con el rango y que el estado sin datos muestra neutro.
- [x] 3.3 Implementar `TopStations` (barras horizontales Recharts con imagen, nombre y duración, orden desc) con `EmptyState` sin datos, y verificar que el orden y las duraciones coinciden con `GET /stats/me/top`.

## 4. Hábitos, desgloses y recientes

- [x] 4.1 Implementar `HabitsHeatmap` (grid 7x24 densificado, lunes primero, celdas con `title`/`aria-label` en español y escala pine/ochre) y verificar en desktop y en 360px que es legible sin romper el layout y que cada celda expone día, hora y duración.
- [x] 4.2 Implementar `GenreChart` y `CountryChart` (donut o barras según nº de categorías, "desconocido" para ausentes, `limit=10`) y verificar que las proporciones cuadran con el total y que el tratamiento de desconocido agrupa sin perder tiempo.
- [x] 4.3 Implementar `RecentList` cronológica (emisora, inicio absoluto + relativo con `lib/time.ts`, duración como barra fina) con `EmptyState`, y verificar que el orden desc y los campos coinciden con `GET /stats/me/recent`.

## 5. Integración, responsive y calidad

- [x] 5.1 Componer `pages/Stats.tsx` (filtros arriba, grid 1 col móvil → 2 col `lg`, secciones independientes con carga/error+reintento/vacío en español sin bloquear al resto) y verificar el recorrido completo: sin datos, con datos, error parcial simulado y cambio de tema claro/oscuro con contraste suficiente.
- [x] 5.2 Ejecutar `npm run typecheck`, `npm run lint`, `npm run build` y smoke en Docker (`docker compose up --build -d`, reproducir una emisora, abrir `/estadisticas` y comprobar que filtros, gráficos y recientes reflejan la escucha), y verificar que todo pasa antes de dar el change por listo.
