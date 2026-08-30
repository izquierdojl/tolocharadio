## 1. Mostrar información técnica en el reproductor

- [x] 1.1 En `apps/web/src/components/PlayerBar.tsx`, junto al nombre/país/idioma de la emisora, mostrar el bitrate (formato "N kbps") y el códec de audio (`station.bitrate`, `station.codec`) cuando estén disponibles, omitiendo por separado cualquier dato ausente. Verificar: `npm run typecheck --workspace @tolocharadio/web` pasa y, con una emisora con bitrate/códec, el reproductor los muestra; con emisora sin ellos, no rompe el diseño ni muestra los datos faltantes.

## 2. Botón de copiar enlace de emisión

- [x] 2.1 Añadir en `PlayerBar.tsx` un botón "Copiar enlace de emisión" que copie al portapapeles `playbackUrl(station.id)` (via `navigator.clipboard.writeText` con catch de errores) usando un icono coherente con `lucide-react`. Verificar: al pulsarlo se copia la URL del stream y aparece una confirmación visual breve; los textos son en español.

- [x] 2.2 Implementar el estado local "copiado" con `useState` (p. ej. cambiar a "¡Enlace copiado!" durante unos segundos y luego restablecerse). Verificar: la confirmación aparece tras copiar y vuelve a su estado inicial.

## 3. Verificación de integración

- [x] 3.1 Ejecutar `npm run lint --workspace @tolocharadio/web`, `npm run typecheck` y `npm run build` en la raíz y confirmar que no hay errores ni avisos nuevos.
- [x] 3.2 Probar manualmente el reproductor (reproducir una emisora, copiar el enlace, pausar/cambiar de emisora) y confirmar que el enlace copiado corresponde al stream de la emisora y reproduce correctamente al pegarlo.
