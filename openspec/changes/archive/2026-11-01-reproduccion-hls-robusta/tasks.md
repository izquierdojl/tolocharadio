# Tasks

## 1. Spike: validar el empalme HLS antes de construir

- [x] 1.1 Medir el TTL real de la sesión de StreamTheWorld y la alineación de `EXT-X-PROGRAM-DATE-TIME` entre dos sesiones consecutivas (script temporal fuera del repo); verificar anotando el TTL observado y si la alineación permite continuidad sin repetir ni saltar audio, y ajustar `design.md` si contradice lo previsto.
- [x] 1.2 Comprobar el atajo progresivo (`.../OCAAC.m3u8` → `.../OCAAC.aac`) con `curl`, verificando que el `Content-Type` y los primeros bytes son audio; anotar si entra en la v1 o queda como mejora.

## 2. Clasificación del contenedor HLS (API)

- [x] 2.1 Implementar la detección de contenedor por primeros bytes (`ID3`/`0xFFFx` → concatenable, `ftyp`/`styp` → fMP4, `0x47` → MPEG-TS) y la detección de `EXT-X-KEY` en el manifiesto; verificar con tests unitarios de cada caso.
- [x] 2.2 Cubrir casos límite (segmento truncado, bytes insuficientes, manifiesto sin clave y con clave) con tests unitarios; verificar que `npm -w apps/api test` pasa.

## 3. Endpoint `/live` y puente HLS (API)

- [x] 3.1 Añadir `GET /api/v1/playback/:stationId/live` con la misma autenticación y clasificación que las rutas actuales (directo, lista, HLS); verificar con tests de integración de las tres ramas.
- [x] 3.2 Implementar el puente con arranque honesto (sin `200` hasta el primer segmento), `chunked`, sin `Content-Length`, `Cache-Control: no-store` y contrapresión; verificar con un origen falso que compruebe cabeceras y bytes.
- [x] 3.3 Implementar el ritmo de tiempo real y la resincronización cuando el puente se retrasa; verificar con un origen falso que publica segmentos y comprobar que no se descarga por delante del directo.
- [x] 3.4 Implementar la renovación por `404`/`410` con re-resolución de la cadena y alineación por PDT, con límite de 3 intentos; verificar con un origen falso que caduca a los N segundos y comprobar que el flujo sigue entregando audio.
- [x] 3.5 Implementar el rechazo `415 HLS_UNSUPPORTED_CONTAINER` para fMP4, MPEG-TS y cifrado; verificar con tests de integración que no se envían bytes de audio.
- [x] 3.6 Registrar historial una vez por conexión y contabilizar la escucha con `trackListening`/`pulse`; verificar con el test de estadísticas existente adaptado al nuevo flujo.

## 4. Diagnóstico de cierres en el proxy (API)

- [x] 4.1 Registrar al cerrar cada stream la duración, los bytes enviados y el motivo (cliente, origen, error); verificar con un test de integración que el log aparece al cortar el cliente y al cortar el origen.

## 5. Supervisor de reproducción (web)

- [x] 5.1 Extraer a un módulo puro la política de reconexión (clasificación de error, backoff 0/1/2/4/8/15 s, reset tras 60 s estables); verificar con tests unitarios de cada transición.
- [x] 5.2 Integrar el supervisor en `apps/web/src/stores/player.ts`: watchdog de 15 s, `ended`, `error`, `requestId` contra carreras y refresco de token antes de reasignar `src`; verificar con tests usando un elemento de audio simulado.
- [x] 5.3 Consumir `/live` desde `apps/web/src/lib/api.ts` con cache-buster y decidir el fallback a `/playback/:id` cuando llegue `415` y el navegador soporte HLS nativo; verificar con tests unitarios de la decisión y comprobando que una emisora directa sigue usando la misma ruta.

## 6. Interfaz del reproductor

- [x] 6.1 Mostrar en `PlayerBar` los estados de conexión, reconexión y fallo con textos en español, sin spinner indefinido; verificar manualmente contra el origen falso que corta y contra una emisora caída.
- [x] 6.2 Añadir la acción de reintentar tras agotar los reintentos y limpiar el error al recuperarse; verificar manualmente que el botón relanza la emisora y que el mensaje desaparece al volver el audio.
- [x] 6.3 Consultar `/playback/:stationId/status` antes de reproducir y avisar cuando la emisora no esté disponible; verificar con una emisora no disponible que el aviso aparece antes de intentar el audio.

## 7. Documentación

- [x] 7.1 Añadir a `docs/despliegue.md` una sección de proxy inverso Apache con `ProxyTimeout`, `flushpackets=on`, `timeout=`, exclusión de compresión y revisión de `H2StreamTimeout`; verificar revisando el snippet contra la configuración real y confirmando que los comandos y rutas documentados existen.
- [x] 7.2 Documentar en `docs/arquitectura.md` el flujo `/live`, la clasificación del origen y la renovación de sesión HLS; verificar que el diagrama y los nombres de endpoint coinciden con el código.
- [x] 7.3 Actualizar `docs/uso.md` con el comportamiento de reconexión y los mensajes de error visibles; verificar que los textos documentados coinciden con los de la interfaz.

## 8. Integración y compatibilidad

- [x] 8.1 Ejecutar `npm run verify:full` y comprobar que typecheck, lint, tests y build pasan.
- [x] 8.2 Probar con las emisoras reales: Onda Cero (HLS) suena en web y en Tauri, y Litera aguanta la escucha y se recupera tras un corte forzado; verificar reproduciendo al menos 5 minutos y provocando un corte de red.
- [x] 8.3 Comprobar que `/playback/:id`, `/playback/:id/hls` y `/playback/:id/status` conservan sus tipos de contenido y formas de respuesta para una emisora HLS y una directa; verificar con `curl` comparando con el comportamiento anterior.
- [x] 8.4 Verificar el cliente Tauri en Linux (WebKitGTK) y Windows (WebView2): reproducción HLS y reconexión sin MSE; verificar manualmente en ambas plataformas.

## Workflow follow-up

- Archivar el change tras la revisión, commiteando también el código según las reglas del proyecto.
- Generar la release desde `main` con `node scripts/bump.js minor` y publicar el tag tras el CI en verde.
