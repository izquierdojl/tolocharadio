# Tasks

## 1. Fila de transporte en el reproductor de podcasts

- [x] 1.1 En `apps/web/src/components/PlayerBar.tsx`, renderizar el botón de reproducir/pausar de la fila superior solo cuando **no** sea podcast, y pasar a `EpisodePlayerControls` lo necesario para pintar el play en el transporte (`isPlaying`, `isBuffering`, `canRetry`, `onToggle`); verificar con `npm run typecheck` en `apps/web` que los tipos de las props cuadran
- [x] 1.2 En `apps/web/src/components/podcasts/EpisodePlayerControls.tsx`, añadir un grupo de transporte centrado (`justify-center`) con el botón de retroceder 15 s a la izquierda, el play en el centro (56 px, `Pause`/`Play`/`Loader2`/`RotateCcw` según estado, conservando el reintento cuando la reproducción falla) y el de avanzar 30 s a la derecha; verificar en el navegador que el orden visual es retroceder → play → avanzar y que la fila superior de podcast ya no muestra play
- [x] 1.3 Aumentar los botones de salto a 44 px de alto y ancho (~`size-11`) con icono `RotateCcw`/`RotateCw` y etiqueta `15 s`/`30 s`, manteniendo `aria-label="Retroceder 15 segundos"` y `aria-label="Avanzar 30 segundos"`; verificar con las herramientas de desarrollo que cada control mide al menos 44×44 px y que el play es el mayor del grupo

## 2. Progreso, velocidad y reproductor de radio

- [x] 2.1 Colocar la barra de progreso con tiempos y el selector de velocidad en una fila inmediatamente debajo del transporte, conservando el `seek`, el ciclo `1x`–`2x` y el estado deshabilitado cuando no hay duración; verificar reproduciendo un episodio que el `seek` y la velocidad siguen funcionando
- [x] 2.2 Mantener intacta la fila superior de radio en vivo (miniatura, título, copiar enlace, reintentar, play, volumen y stop) sin controles de salto; verificar con una emisora que el reproductor se ve y funciona igual que antes

## 3. Accesibilidad y espacio reservado

- [x] 3.1 Añadir `apps/web/src/components/podcasts/EpisodePlayerControls.test.tsx` con `renderToStaticMarkup` que compruebe que el HTML contiene los `aria-label` de retroceder, play y avanzar y que aparecen en ese orden; ejecutar `npm test` en `apps/web` y confirmar que pasa
- [x] 3.2 Revisar el `padding-bottom` de `main` en `apps/web/src/components/AppShell.tsx` (hoy `pb-44`) y subirlo si la barra de podcast lo supera; verificar en 360 px y 768 px de ancho que la última fila de una lista no queda tapada por el reproductor
- [x] 3.3 Comprobar los nombres accesibles y el orden de tabulación del transporte con el teclado (Tab desde la fila de metadatos hasta velocidad), confirmando que coincide con el orden visual y que los textos están en español

## 4. Verificación final

- [x] 4.1 Ejecutar `npm run verify:full` en la raíz y corregir typecheck, lint, tests o build si fallan
- [x] 4.2 Smoke manual con sesión: reproducir un episodio y comprobar el grupo centrado con saltos grandes, pausar/reanudar, saltar ±15/30 s, cambiar velocidad y arrastrar el progreso; después reproducir una emisora y confirmar que su reproductor no cambió

## Workflow follow-up

- Archivar el change con el skill `openspec-archive-change` una vez revisado, asegurando que todo el código está commiteado antes de fusionar a `main`.
- Tras archivar y actualizar `main`, generar la release con `node scripts/bump.js minor` desde `main` y publicar `main` y el tag conforme a `AGENTS.md`.
