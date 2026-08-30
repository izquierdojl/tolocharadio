## Context

El reproductor flotante vive en `apps/web/src/components/PlayerBar.tsx` y consume el estado de `apps/web/src/stores/player.ts` (Zustand). El modelo `Station` del frontend (`apps/web/src/lib/types.ts`) ya expone `bitrate: number | null`, `codec: string | null` y `url: string`. El stream se reproduce vía el proxy de playback de la API: `api.ts` → `playbackUrl(station.id)` devuelve `/api/v1/playback/:id`. Motivación del cambio en `proposal.md` - Why.

## Goals / Non-Goals

**Goals:**
- Mostrar bitrate y códec de la emisora en `PlayerBar` cuando estén disponibles, omitiendo los datos ausentes sin romper el diseño.
- Añadir un botón que copie el enlace de emisión de la emisora con confirmación visual.
- Mantener el cambio confinado al frontend, sin tocar la API ni el backend.

**Non-Goals:**
- No añadir nuevas fuentes de datos ni consultas extra (ni a Radio Browser ni a la API) para obtener información técnica.
- No sincronizar la preferencia o el estado de "copiado" con el servidor.
- No alterar la reproducción ni el almacén `player.ts` en su lógica central.

## Decisions

- **Enlace de emisión a copiar = URL del proxy de playback** (`/api/v1/playback/:id`, vía `playbackUrl`). Se elige la URL que el reproductor realmente usa: el origen (`station.url`) puede ser HTTP o inaccesible para otros, mientras que el proxy sirve el stream sobre HTTPS de forma pública y reproducible. Alternativa descartada: copiar `station.homepage` o `station.url`, que no garantizan reproducción directa.
- **Copia con Clipboard API** (`navigator.clipboard.writeText`), con manejo de fallo (catch) y sin lógica asíncrona que bloquee el render. No se introducen dependencias nuevas (se evita `clipboard-copy`).
- **Estado "copiado" local al componente** con `useState`: tras copiar se muestra una confirmación breve (p. ej. icono/cambio de texto a "¡Enlace copiado!") durante unos segundos y luego se restablece. No se persiste.
- **Formato del bitrate**: se muestra como "N kbps" cuando `bitrate` es un número; el códec se muestra tal cual. Ambos se combinan con los textos existentes del reproductor en español.

## Risks / Trade-offs

- [Clipboard API puede no estar disponible o denegar permiso en algunos navegadores/contextos (p. ej. sin interacción o en HTTP)] → Se ejecuta dentro del manejador del clic (interacción de usuario) y se captura el error para no romper la interfaz; si falla, se puede mostrar un fallback de mensaje.
- [El bitrate/códec puede ser nulo en emisoras del catálogo] → El diseño las omite de forma condicional, sin alterar el resto del reproductor.
- [El enlace copiado es el proxy autenticado `/playback/:id`] → Es coherente con la reproducción real; si en el futuro se quiere compartir un enlace público de la emisora, será un cambio aparte.
