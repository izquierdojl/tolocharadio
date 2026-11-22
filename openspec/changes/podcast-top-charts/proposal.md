# Proposal

## Why

Hoy el descubrimiento de podcasts es totalmente manual: hay que saber qué buscar en el directorio de Apple. Apple publica rankings públicos de los programas más populares por país (y, en el feed antiguo, por categoría), sin clave de API. Mostrarlos permite descubrir podcasts sin teclear nada y reutiliza el flujo de suscripción existente.

## What Changes

- Nuevo endpoint autenticado `GET /api/v1/podcasts/top?country=es&genre=<id>&limit=` que devuelve el ranking de Apple como `PodcastSearchResult[]` (mismo formato que la búsqueda, con `feedUrl`).
- El servidor obtiene el ranking de Apple (feed nuevo `rss.marketingtools.apple.com` para el top general por país; feed antiguo `itunes.apple.com/{cc}/rss/toppodcasts` cuando se filtra por categoría), resuelve los `feedUrl` con `itunes.apple.com/lookup` en lote y cachea el resultado varias horas por país y categoría.
- País seleccionable, **España (`es`) por defecto**; la elección se recuerda en el navegador.
- Filtro opcional por categoría con degradación elegante: si el feed antiguo falla, el ranking por categoría se oculta o responde error controlado sin afectar al top general ni a la búsqueda manual.
- En la pantalla de búsqueda de podcasts, cuando la caja de texto está vacía, se muestra la sección «Populares» con selector de país (y de categoría), reutilizando las tarjetas y la suscripción existentes.
- Solo aplica con `PODCAST_DISCOVERY_PROVIDER=itunes`; con `none` queda deshabilitado igual que la búsqueda; con `podcastindex` el endpoint responde con error controlado de «no soportado».

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `podcast-catalog`: nuevo requisito de descubrimiento por ranking (países, categorías, caché, degradación y proveedor).
- `web-ui`: nuevo requisito de sección «Populares» con selector de país/categoría en la búsqueda de podcasts.

## Impact

- API: `apps/api/src/services/podcasts/discovery.ts` (ranking + lookup + caché), `apps/api/src/routes/podcasts.ts` (ruta `/podcasts/top`), `apps/api/src/openapi.ts`.
- Web: `apps/web/src/pages/podcasts/PodcastSearch.tsx`, cliente API y tipos, un pequeño store para país/categoría persistido en `localStorage`.
- Sin cambios de esquema de base de datos, sin dependencias nuevas, sin variables de entorno nuevas obligatorias.
- Riesgo: los endpoints de ranking de Apple no están documentados oficialmente; la función debe degradarse sin romper nada.
- Fuera de alcance: rankings de Podcast Index, rankings de episodios, histórico de posiciones.
