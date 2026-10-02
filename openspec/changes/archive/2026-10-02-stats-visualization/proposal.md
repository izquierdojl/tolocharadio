# Proposal

## Why

El change `listening-stats` deja seis endpoints personales (`/stats/me/*`) funcionando y probados, pero el usuario aún no puede ver ese valor en la web: hay que reproducir y luego consultar la API a mano. Visualizar top, evolución, hábitos, géneros, países y escuchas recientes cierra el círculo y da motivo para volver a la app.

## What Changes

- Nueva página privada `/estadisticas` con panel de estadísticas personales: tarjetas resumen (tiempo total, emisora destacada), evolución temporal, top de emisoras, hábitos por hora y día, desglose por género y país, y escuchas recientes.
- Filtros globales de periodo (`7d / 30d / 90d / todo` + rango personalizado) y granularidad de la evolución (`día/semana/mes`, automática por defecto) que alimentan todas las consultas.
- Gráficos con Recharts (barras horizontales, área temporal, donut) + mapa de calor 7x24 artesanal con CSS grid para hábitos; lista cronológica para escuchas recientes.
- Estados de carga, vacío ("escucha algo y vuelve") y error con reintento, coherentes con `EmptyState`; textos en español y soporte de tema claro/oscuro y móvil.
- Entrada de navegación hacia `/estadisticas` (nav principal + menú hamburguesa) y nueva dependencia `recharts` en `apps/web`.

## Capabilities

### New Capabilities

- `stats-visualization`: panel personal de visualización de estadísticas de escucha en la web (resúmenes, evolución, top, hábitos, géneros, países y recientes con filtros de periodo).

### Modified Capabilities

<!-- Sin cambios de requisitos en capacidades existentes: la API de `listening-stats` se consume tal cual y `web-ui` no cambia sus requisitos, solo gana un punto de navegación propiedad de la nueva capacidad. -->

## Impact

- `apps/web`: nueva ruta, página, componentes de gráficos, hooks de consulta (`/stats/me/*`), tipos y dependencia `recharts`; integración en `App.tsx` y `AppShell.tsx`.
- Sin cambios en `apps/api` ni en el contrato OpenAPI (solo consumo de endpoints existentes documentados en `docs/api.md`).
- Riesgo principal: peso del bundle y legibilidad en móvil del heatmap; se mitiga con importación acotada de Recharts y heatmap CSS propio.
