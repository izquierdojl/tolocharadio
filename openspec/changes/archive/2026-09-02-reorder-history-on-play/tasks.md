## 1. Invalidación de query al reproducir

- [x] 1.1 En `History.tsx`, suscribirse al store del player para detectar cuando cambia la estación en reproducción y invalidar la query `["history"]` cuando el usuario está en la pestaña de historial. Verificar: al reproducir una emisora desde el historial, la lista se reordena automáticamente sin recargar.
- [x] 1.2 Verificar que la reproducción no se interrumpe durante el reordenamiento. Verificar: el audio sigue sonando mientras la lista se actualiza.

## 2. Verificación de comportamiento

- [x] 2.1 Verificar que el reordenamiento solo ocurre cuando se reproduce desde la pestaña de historial (no afecta otras pestañas). Verificar: reproducir desde favoritos o búsqueda no provoca refetch del historial.
- [x] 2.2 Ejecutar `npm run typecheck` y `npm run lint` para confirmar que no hay errores.
