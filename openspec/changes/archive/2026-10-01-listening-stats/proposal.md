# Proposal

## Why

Los usuarios no pueden saber cuánto tiempo escuchan ni cuáles son sus emisoras más escuchadas: el historial guarda como máximo la última reproducción por emisora y sin duración. Como todo el audio pasa por el proxy autenticado de la API, el tiempo de escucha se puede medir server-side, sin tocar ningún cliente.

## What Changes

- **Captura server-side de escucha** en `GET /playback/:stationId` (stream directo, `.m3u`, `.pls` y manifiesto `.m3u8`) y en los subrecursos HLS (`/playback/:stationId/hls`, peticiones de segmento).
- **Contabilidad por pulsos con tope**: en directo/listas el pulso es cada escritura de bytes al cliente y en HLS cada petición de segmento; los huecos mayores que un tope no suman. Así pausa y buffering no inflan el tiempo.
- **Acumulación en tablas**: `playback_sessions` (detalle por escucha: usuario, emisora con snapshot, origen, inicio, fin y duración) y `user_station_stats_hourly` (acumulador por usuario + emisora + hora local `Europe/Madrid`).
- **Volcado periódico (~30 s) con cursor de milisegundos ya contados**: sin doble conteo al cerrar la sesión y sin perder más de un intervalo ante un reinicio de la API.
- **Fusión de conexiones simultáneas del mismo usuario y emisora** (varias pestañas/dispositivos) en una sola sesión.
- **`GET /playback/:stationId/status` nunca cuenta**: es un precheck de disponibilidad, no escucha.
- **Endpoints personales autenticados** `GET /api/v1/stats/me/*`: top de emisoras por tiempo, evolución temporal (día/semana/mes), hábitos por hora y día de la semana, desglose por género/país y escuchas recientes con duración.
- **OpenAPI actualizado** con los endpoints nuevos; contrato `/api/v1` solo aditivo.
- **Sin cambios en clientes**: la web y las apps existentes no se tocan y generan estadísticas por el mero uso.

## Capabilities

### New Capabilities

- `listening-stats`: captura server-side del tiempo de escucha por emisora durante el proxy de playback y consulta personal de estadísticas (top, evolución, hábitos, género/país y escuchas recientes) por parte del usuario autenticado.

### Modified Capabilities

<!-- Ninguna: el comportamiento observable de `playback` (proxy, formatos, historial, precheck) no cambia; la captura es un efecto lateral interno. -->

## Impact

- **Backend (`apps/api`)**:
  - `src/routes/playback.ts` — instrumentación de pulsos en los tres caminos (directo/listas, manifiesto HLS, subrecursos HLS).
  - Nuevos `src/services/stats.ts` y `src/routes/stats.ts`.
  - `src/db/schema.ts` y migración Drizzle nueva en `apps/api/drizzle/`.
  - `src/config/env.ts` — nuevos parámetros con valores por defecto (zona horaria de buckets, intervalo de volcado, tope de pulso, retención).
  - `src/context.ts` y `src/factory.ts` — servicio de estadísticas; `src/index.ts` — volcado y cierre ordenado del contador en memoria.
  - `src/openapi.ts` — documentación de los endpoints `/stats/me/*`.
  - Tests nuevos de servicio y de ruta; ajuste de los existentes si la instrumentación lo requiere.
- **Contrato `/api/v1`**: solo aditivo (nuevos endpoints de stats). Los streams de playback no cambian de comportamiento, cabeceras ni códigos.
- **Datos**: dos tablas nuevas en SQLite. Las estadísticas son privadas de cada cuenta (filtradas por token); no hay agregados globales ni datos de otros usuarios.
- **Fuera de alcance**: UI y gráficos (change posterior), estadísticas globales/oyentes únicos, borrado de estadísticas por el usuario (decisión futura) y poda de `playback_sessions`.
