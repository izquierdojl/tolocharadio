## 1. Implementación

- [x] 1.1 En `apps/web/src/components/PlayerBar.tsx`, reemplazar `playbackUrl(station.id)` por `station.url` en la función `copyLink`. Verificar que el botón "Copiar enlace" copia la URL del stream al portapapeles.
- [x] 1.2 Eliminar el import de `playbackUrl` de `PlayerBar.tsx` si ya no se usa en el archivo. Verificar que no hay errores de compilación con `npm run typecheck` en `apps/web`.
