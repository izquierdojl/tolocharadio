# Design

## Context

Ver `proposal.md` para la motivación. Actualmente `apps/api` gestiona emisoras de radio desde RadioBrowser y emisoras personalizadas (`custom_stations`) sobre SQLite (`better-sqlite3` + Drizzle ORM). El endpoint `GET /api/v1/config` solo devuelve `{ appName, registrationEnabled }` y `fetchFollowingRedirects` en `apps/api/src/lib/upstream.ts` sigue redirecciones sin validar rangos IP privados.

## Goals / Non-Goals

**Goals:**
- Incorporar el catálogo global de podcasts (`podcasts`, `podcast_episodes`) y suscripciones por usuario (`podcast_subscriptions`) en la misma instancia SQLite.
- Asegurar todas las peticiones salientes de feeds/streams contra SSRF en `upstream.ts`.
- Parsear RSS 2.0 (+ namespace `itunes`) y Atom de forma segura y tolerante con `fast-xml-parser`.
- Mantener los feeds actualizados en segundo plano sin requerir colas externas (Redis/BullMQ).
- Ampliar `/api/v1/config` manteniendo retrocompatibilidad con clientes actuales.

**Non-Goals:**
- Reproducción de audio, tokens de playback, progreso, cola, favoritos y estadísticas (cubiertos en los changes 2, 3 y 4).
- Interfaz gráfica de usuario para podcasts (se introduce en los changes 2 y 3; por eso `PODCASTS_ENABLED` nace en `false` por defecto en este change).
- Almacenar archivos de audio en disco o base de datos.

## Decisions

### D1. Catálogo global compartido y suscripciones por usuario
- **Decisión**: `podcasts` (único por `feed_url` normalizada) y `podcast_episodes` (único por `podcast_id, guid`) son tablas globales; `podcast_subscriptions(user_id, podcast_id)` modela la relación de cada usuario.
- **Alternativa descartada**: duplicar feeds y episodios por cada `user_id`. Multiplicaría las descargas HTTP de feeds y el tamaño de SQLite cuando varios usuarios siguen el mismo programa.

### D2. Guardia SSRF centralizada en `upstream.ts`
- **Decisión**: añadir validación de protocolo (`http:`/`https:`), puerto (`80`/`443` en producción; configurable en tests locales) y resolución DNS (`dns.lookup(..., { all: true })`) antes de cada `fetch` en `fetchFollowingRedirects`, rechazando IPs privadas (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`, `fe80::/10`), CGNAT (`100.64.0.0/10`) y rangos multicast/reservados.
- **Por qué**: validar solo la URL inicial permite un bypass trivial con un `302 Found` hacia `http://127.0.0.1` o `http://169.254.169.254`. Hacerlo en cada salto de `fetchFollowingRedirects` protege feeds, streams de episodios y emisoras personalizadas.

### D3. Parser con `fast-xml-parser` y transacciones cortas
- **Decisión**: usar `fast-xml-parser` con entidades externas desactivadas, límite de cuerpo de 5 MB (`readBodyCapped`) y normalización en memoria antes de abrir la transacción SQLite. La escritura en SQLite se hace en una única transacción síncrona rápida de *upserts* por lote.
- **Por qué**: `better-sqlite3` es síncrono; descargar y parsear XML fuera de la transacción evita bloquear el *event loop* y el escritor WAL durante operaciones de red.

### D4. Identificación estable de episodios (`guid`) y poda sin huérfanos
- **Decisión**: usar el `<guid>` del item RSS (o `<id>` en Atom). Si falta, calcular `sha256(audio_url + "\n" + (published_at ?? title))`. Retener hasta 500 episodios por feed en cada ingesta; si un feed supera ese tope, solo se eliminan episodios antiguos que no estén referenciados en tablas de usuario, y a los desaparecidos del feed se les marca `removed_at`.

### D5. Planificador en proceso (`PodcastRefreshService`)
- **Decisión**: `setInterval(..., PODCAST_REFRESH_INTERVAL_MS).unref()` (15 min por defecto) con mapa `inFlight: Map<number, Promise<void>>` (*single-flight*), concurrencia máxima de 3 feeds simultáneos, cabeceras `If-None-Match` / `If-Modified-Since` y backoff exponencial (`15m -> 1h -> 6h -> 24h`) según `error_count`.
- **Alternativa descartada**: worker externo con Redis. Sobredimensionado para una instancia autoalojada.

### D6. Descubrimiento configurable (`itunes` por defecto)
- **Decisión**: `PODCAST_DISCOVERY_PROVIDER=itunes|podcastindex|none` (`itunes` por defecto para funcionar sin API keys tras `docker compose up`). Los resultados se cachean en `CacheService` (TTL 15 min).La importación/exportación OPML y la suscripción por URL RSS directa están siempre activas independientemente del proveedor.

## Risks / Trade-offs

- **[Feeds XML malformados o heterogéneos]** → Normalizadores defensivos para fechas RFC 822/ISO 8601, duraciones (`HH:MM:SS`, `MM:SS`, segundos), URLs relativas e imágenes, ignorando entradas sin enclosure de audio válido en lugar de tumbar todo el feed.
- **[Bloqueo del event loop en importación OPML masiva]** → `POST /podcasts/subscriptions/bulk` procesa en lotes con concurrencia limitada y tope de `podcastOpmlMaxFeeds = 200`.
- **[Tests locales contra servidores HTTP en `127.0.0.1`]** → La guardia SSRF permitirá loopback únicamente cuando el entorno sea `NODE_ENV=test` (o flag interno de test en `AppContext`), manteniendo el bloqueo activo por defecto y verificándolo explícitamente en los tests unitarios de SSRF.

## Migration Plan

1. Añadir nueva migración SQL en `apps/api/drizzle/` creando `podcasts`, `podcast_episodes` y `podcast_subscriptions` con sus índices.
2. Mantener `PODCASTS_ENABLED=false` por defecto en este primer change hasta que la interfaz de reproducción y biblioteca esté lista en el Change 3.
3. Rollback: desactivar `PODCASTS_ENABLED=false`; las tablas nuevas son independientes y no afectan a `users`, `favorites`, `history`, `custom_stations` ni `playback_sessions`.
