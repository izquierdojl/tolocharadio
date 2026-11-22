# Design

## Context

Ver `proposal.md` para la motivación. Hoy `PodcastDiscoveryService` (`apps/api/src/services/podcasts/discovery.ts`) busca en iTunes/Podcast Index, normaliza a `PodcastSearchResult` y cachea con `Cache`. La ruta `GET /podcasts/search` vive en `routes/podcasts.ts` y la UI en `PodcastSearch.tsx`.

Hechos comprobados contra Apple:
- `https://rss.marketingtools.apple.com/api/v2/{cc}/podcasts/top/{25|50|100}/podcasts.json` devuelve el top general por país, sin `feedUrl` (solo `id`, nombre, autor, carátula y géneros). No se ha confirmado que admita filtro por categoría.
- `https://itunes.apple.com/{cc}/rss/toppodcasts/limit=N/genre={id}/json` permite categoría; es el formato antiguo y puede retirarse.
- `https://itunes.apple.com/lookup?id=a,b,c&entity=podcast` devuelve el `feedUrl` de varios ids en una sola llamada.
- Hubo un 502 puntual en el feed nuevo: hay que tolerar fallos transitorios.

## Goals / Non-Goals

**Goals:**
- Reutilizar `PodcastSearchResult`, `Cache`, `resolveSafeHttpUrl` y el flujo de suscripción existente.
- Que un fallo de Apple en el ranking nunca afecte a la búsqueda manual.

**Non-Goals:**
- Persistir rankings en base de datos o guardar histórico de posiciones.
- Rankings de Podcast Index o de episodios.
- Preferencia de país sincronizada entre dispositivos (no hay cambio de esquema).

## Decisions

1. **Dos orígenes de Apple según el filtro.** Sin `genre` se usa el feed nuevo (más estable); con `genre` se usa el feed antiguo. *Alternativa:* usar siempre el feed antiguo, descartada por su riesgo de retirada para el caso más común.
2. **Resolución de `feedUrl` por lookup en lote.** Una llamada a `lookup` con todos los ids del ranking (hasta 100), en trozos si hiciera falta. Los programas sin `feedUrl` válido se omiten. *Alternativa:* resolver por separado en el cliente, descartada por coste y por exponer más superficie.
3. **Caché en memoria por `country:genre:limit` con TTL de varias horas** (p. ej. 3 h), propio del ranking y separado del TTL de búsqueda, porque los rankings cambian poco. Si el origen falla y existe una entrada caducada, no se sirve: se responde error controlado (comportamiento simple y predecible).
4. **Validación de entrada estricta.** `country` ha de cumplir `^[a-z]{2}$` (minúsculas tras normalizar), `genre` numérico y `limit` acotado a 1–100. Así no se construye una URL de Apple con valores arbitrarios (los hosts son fijos, sin riesgo SSRF).
5. **Mismo patrón de errores que la búsqueda:** `DISCOVERY_DISABLED`, `DISCOVERY_UNAVAILABLE`; para `podcastindex`, un error controlado de ranking no soportado.
6. **Web:** un store Zustand pequeño (`topCharts`) persiste país y categoría en `localStorage` (como `viewMode`/`subscriptionSort`), con España por defecto. «Populares» se muestra solo con la caja vacía; las categorías se obtienen de una lista fija de géneros de Apple definida en el cliente. Si el ranking por categoría falla, se muestra un aviso y se mantiene el top general.
7. **Lista de países** fija en el cliente (España primero, más los principales de habla hispana y otros comunes), sin consultar nada a Apple.

## Risks / Trade-offs

- [Endpoints no documentados por Apple] → Aislarlos en funciones propias, degradar con errores controlados y cubrirlos con tests con `fetch` simulado.
- [Feed antiguo retirado] → El filtro por categoría falla de forma aislada y la UI lo oculta/avisa; el top general no depende de él.
- [Un 502 puntual deja la sección vacía hasta el siguiente intento] → Estado de error con reintento en la UI; sin servir datos caducados.
- [Carga: lookup de hasta 100 ids] → La caché limita las llamadas a una por combinación y TTL.
- [Memoria de caché] → Pocas combinaciones realistas; se respeta `cacheMaxEntries` de `Cache`.

## Migration Plan

Sin migración de datos ni variables nuevas. Despliegue normal; se puede revertir retirando la ruta y la sección de la UI. Tras el cambio de backend, confirmar en Docker (`docker compose up --build -d`) con un smoke de `/api/v1/podcasts/top`.

## Open Questions

Ninguna. Comprobado el 2026-11-22: el feed nuevo ignora `genre`/`genreId` (devuelve el mismo top general), por lo que el filtro por categoría depende del feed antiguo. Además el feed nuevo devolvió algún 502 puntual, de ahí el reintento en la UI.
