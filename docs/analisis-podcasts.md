# Análisis: podcasts en TolochaRadio

> **Estado:** análisis cerrado y desglosado en 4 changes de OpenSpec listos para implementar.
>
> **Fecha:** 2026-10-24 (actualizado 2026-11-15)
>
> **Objetivo:** evaluar la viabilidad de añadir podcasts, fijar el enfoque de producto y arquitectura, y dejar por escrito las decisiones técnicas cerradas y la hoja de ruta de implementación.
>
> **Nota:** los artefactos de planificación están creados en `openspec/changes/` (`podcasts-catalogo-y-descubrimiento`, `podcasts-reproduccion-y-progreso`, `podcasts-biblioteca-y-cola` y `podcasts-estadisticas`).

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Punto de partida del repositorio](#2-punto-de-partida-del-repositorio)
3. [Enfoque de producto](#3-enfoque-de-producto)
4. [Viabilidad funcional](#4-viabilidad-funcional)
5. [Arquitectura recomendada](#5-arquitectura-recomendada)
6. [Modelo de datos](#6-modelo-de-datos)
7. [API y contrato para web y Android](#7-api-y-contrato-para-web-y-android)
8. [Ingesta de feeds](#8-ingesta-de-feeds)
9. [Reproducción y proxy](#9-reproducción-y-proxy)
10. [Token de reproducción](#10-token-de-reproducción)
11. [Autenticación web y Android](#11-autenticación-web-y-android)
12. [Progreso y cola sincronizada](#12-progreso-y-cola-sincronizada)
13. [Estadísticas de podcasts](#13-estadísticas-de-podcasts)
14. [Configuración pública: `/config`](#14-configuración-pública-config)
15. [Frontend](#15-frontend)
16. [Consideraciones para Android](#16-consideraciones-para-android)
17. [Seguridad y privacidad](#17-seguridad-y-privacidad)
18. [Riesgos](#18-riesgos)
19. [No objetivos de la primera versión](#19-no-objetivos-de-la-primera-versión)
20. [Fases preliminares (borrador)](#20-fases-preliminares-borrador)
21. [Decisiones pendientes](#21-decisiones-pendientes)
22. [Referencias de código](#22-referencias-de-código)
23. [Anexo (fuera del alcance): ¿SQLite es suficiente? MariaDB y PostgreSQL](#23-anexo-fuera-del-alcance-planificado-sqlite-es-suficiente-mariadb-y-postgresql)

---

## 1. Resumen ejecutivo

**Los podcasts son viables y encajan en el proyecto**, pero no como un añadido menor: suponen una segunda naturaleza de contenido (audio bajo demanda) junto a la radio en vivo. La base actual reutiliza casi todo lo difícil: autenticación, SQLite/Drizzle, proxy de audio, reproductor persistente, React Query, Zustand, PWA y cliente de escritorio.

**Recomendación principal:**

- **Integrar en el mismo servicio (monolito modular)**, no crear un microservicio.
- **Generalizar el reproductor, no el dominio.** `Station` y `Podcast/Episode` siguen siendo entidades separadas; se unifican solo en el cliente mediante un tipo `NowPlaying`/`Playable`.
- **Separar claramente Radio y Podcasts en el frontend**, con navegación de primer nivel, rutas propias y favoritos separados.
- **Diseñar la API pensando en Android desde el principio.** Un solo contrato, versionado y documentado en OpenAPI, con autenticación Bearer para nativos y cookie para el `<audio>` web.
- **Añadir estadísticas de podcasts** con un servicio paralelo al de radio, midiendo tiempo escuchado por episodio y podcast, finalización y hábitos.
- **Introducir un token de reproducción específico para podcasts** para evitar el problema de caducidad del access token de 15 minutos durante episodios largos y búsquedas (*seek*).
- **Extender `/config` con capacidades y límites** para que web y Android detecten qué está habilitado sin probar endpoints a ciegas.
- **No se plantea migrar de base de datos en esta ampliación**: se mantiene SQLite. La evaluación de MariaDB/PostgreSQL queda como nota de seguimiento fuera del alcance planificado (anexo 23).

**La app Android no cambia la recomendación de monolito; la refuerza.** Si los podcasts vivieran en otro servicio, Android tendría dos URLs base, dos flujos de autenticación y dos modelos de token. Un solo backend con un contrato estable es mucho mejor para dos clientes.

---

## 2. Punto de partida del repositorio

### 2.1 Stack actual

- Monorepo npm con workspaces:
  - `apps/api`: Express 5, TypeScript, zod, Drizzle ORM + better-sqlite3, jose, bcryptjs.
  - `apps/web`: React 19, Vite, Tailwind 4, React Router, TanStack Query, Zustand.
  - `apps/desktop`: Tauri (Windows/Linux), envuelve la interfaz web.
- La API sirve también el frontend compilado (`STATIC_DIR`).
- Base de datos SQLite con migraciones Drizzle en `apps/api/drizzle/`.
- OpenAPI 3.1 manual en `apps/api/src/openapi.ts` y Swagger UI.
- Tests de API con Vitest + Supertest.

### 2.2 Piezas reutilizables

| Pieza | Uso para podcasts |
|---|---|
| `apps/api/src/middleware/auth.ts` | Acepta JWT por cabecera **o cookie**; el `<audio>` puede autenticarse igual que hoy. |
| `apps/api/src/routes/playback.ts` | El proxy reenvía `Range`, copia `content-range`/`accept-ranges` y sirve `206`. Base para el *seek*. |
| `apps/api/src/lib/upstream.ts` | Redirecciones, timeouts y lectura con tope de bytes. |
| `apps/api/src/services/cache.ts` | Caché en memoria con TTL para búsquedas y feeds. |
| `apps/api/src/services/stats.ts` | Patrón de `setInterval().unref()`, pulsos, cubos horarios y agregación. |
| `apps/api/src/db/schema.ts` + Drizzle | Añadir tablas y migraciones es directo. |
| `apps/web/src/stores/player.ts` | Estado del reproductor y volumen persistido; se puede generalizar. |
| `apps/web/src/pages/Favorites.tsx` | Patrón de reordenación con `@dnd-kit`. |
| `apps/web/src/components/stats/*` | Filtros, timeline, heatmap y tarjetas reutilizables. |
| PWA (`vite.config.ts`) | `/api/*` y audio ya están en `NetworkOnly`; correcto para streaming. |
| Cliente de escritorio | Ya envuelve la web; solo hay que ampliar mandos multimedia. |

### 2.3 Limitaciones actuales relevantes

- El modelo es radio-céntrico: `favorites`, `history` y `playback_sessions` giran alrededor de `station_id`.
- `history` tiene índice único `(user_id, station_id)`: no sirve para progreso por episodio.
- El reproductor no tiene `currentTime`, `duration`, `seek`, cola ni velocidad.
- El access token y la cookie de acceso duran **15 minutos** por defecto. En radio no importa porque la conexión de streaming se mantiene; en podcast, cada *seek* es una petición HTTP nueva y puede caducar.
- El proxy actual convierte un `416 Range Not Satisfiable` en `503`, y envía `Range: ""` cuando no hay cabecera.
- El escritorio tiene `Next`/`Previous` desactivados porque “las emisoras no tienen cola”.
- `openapi.ts` es manual (~1.000 líneas); cada endpoint nuevo hay que documentarlo.
- El proxy de emisoras personalizadas acepta URLs arbitrarias; conviene revisar SSRF antes de aceptar feeds de usuario.

---

## 3. Enfoque de producto

### 3.1 Dos secciones, un solo producto

TolochaRadio deja de ser “solo radio” para ser un producto de audio autoalojado con dos modos:

| Radio | Podcasts |
|---|---|
| Explorar | Inicio |
| Favoritos | Descubrir |
| Historial | Suscripciones |
| Mis emisoras | Cola |
| Estadísticas | Favoritos |
| | Estadísticas |

Compartido: `AppShell`, `PlayerBar`, tema, perfil, “Acerca de”, login/registro.

**No** metería podcasts como una pestaña dentro de “Explorar”. Deben ser una sección de primer nivel con su propia navegación, y el reproductor debe ser común para que la música/podcast no se interrumpa al navegar.

### 3.2 Regla de oro: generalizar la reproducción, no el dominio

- Backend: `Station` (radio en vivo) y `Podcast`/`Episode` (bajo demanda) separados.
- Cliente: un tipo `NowPlaying` discriminado y un solo elemento `<audio>`.
- No crear una tabla `media` genérica ni un DTO con veinte campos opcionales.
- La radio no tiene duración, *seek* ni cola; el podcast sí. Forzar ambos al mismo modelo complica todo.

### 3.3 Rutas propuestas

```text
/radio/explorar
/radio/favoritos
/radio/historial
/radio/mis-emisoras
/radio/estadisticas

/podcasts
/podcasts/descubrir
/podcasts/suscripciones
/podcasts/:podcastId
/podcasts/cola
/podcasts/favoritos
/podcasts/estadisticas
```

Las rutas actuales (`/explorar`, `/favoritos`, `/historial`, `/mis-emisoras`, `/estadisticas`) deberían redirigir a `/radio/...` para no romper marcadores, PWA ni futuros deep links de Android.

### 3.4 Inicio y vista por defecto

Hoy `Home` es una portada pública que redirige al usuario autenticado a `defaultView` (`explorar | favoritos | historial`). Con dos secciones, no inflaría ese enum con ocho valores. Mejor:

- `defaultSection: "radio" | "podcasts"`.
- Cada sección tiene su propia vista inicial: Radio → Explorar; Podcasts → Inicio.

Es un cambio aditivo que toca `apps/api/src/config/env.ts`, `apps/api/src/routes/users.ts`, `apps/web/src/lib/types.ts`, `apps/web/src/lib/defaultView.ts` y `Profile.tsx`. Para Android también es más fácil de consumir.

### 3.5 Favoritos separados

- Radio → emisoras.
- Podcasts → episodios (y, si se decide, podcasts/shows).
- Una “Biblioteca” global con pestañas puede llegar más adelante; en la primera versión, separados para evitar ambigüedad.

### 3.6 Lenguaje visual

- Badge claro en el reproductor: **EN DIRECTO** vs **PODCAST**.
- Iconografía: antena/radio para emisoras; micrófono/ondas para podcasts.
- Misma paleta Tolocha; no dos temas distintos.
- Decidir si la marca sigue siendo “TolochaRadio” con tagline “Radio y podcasts” o si evoluciona a otro nombre. Es una decisión de producto, pero afecta a README, PWA, About y landing.

### 3.7 Reproductor: controles por tipo

| Control | Radio | Podcast |
|---|---|---|
| Play / pausa | Sí | Sí |
| Volumen / mute | Sí | Sí |
| Barra de progreso | No (en vivo) | Sí |
| Saltos ±15/30 s | No | Sí |
| Velocidad 1×–2× | No | Sí |
| Cola | No | Sí |
| Siguiente / anterior | No | Sí (cola) |
| “EN DIRECTO” | Sí | No |
| Reanudar posición | No | Sí |
| Media Session | Metadatos | Metadatos + progreso + seek |

Detalles:

- **Un solo `<audio>`**: iniciar un podcast detiene la radio y viceversa.
- **Volumen global** persistido; no duplicarlo por tipo.
- **Radio sin duración ni seek**; no simular una barra de progreso.
- **Podcast con `currentTime`, `duration`, `seek`, `skip` y `playbackRate`**.
- La `PlayerBar` actual es de una fila y 64 px. Para podcast necesita progreso y tiempos; en móvil, barra compacta + hoja expandible con cola y velocidad.
- **Media Session API** en web y **Media3/MediaSession** en Android para pantalla de bloqueo y teclas multimedia.
- Progreso: guardar cada 10–15 s, al pausar, al ocultar la pestaña y al terminar. Reanudar si `position` está entre 5 s y `duración − 30 s`; marcar completado si supera el 95 % con suficiente tiempo escuchado.

---

## 4. Viabilidad funcional

| Función | Viabilidad | Qué falta | Riesgo |
|---|---|---|---|
| **Buscar y explorar podcasts** | Alta, con matiz | Un directorio externo o importación manual/OPML. Un feed RSS no se “busca” solo | Medio: dependencia externa y calidad de resultados |
| **Reproductor básico con saltos, volumen, etc.** | Alta | Generalizar player: `currentTime`, `duration`, `seek`, `skip`, velocidad, cola. El volumen ya existe | Medio: tocar el player sin romper radio |
| **Gestión de colas sincronizable** | Alta | Tablas de cola + revisión/versión + endpoints. “Offline-first” es otro proyecto | Medio: conflictos entre dispositivos |
| **Pantalla de favoritos** | Alta | Tabla de episodios favoritos; decidir si “favorito” es podcast o episodio | Bajo |
| **Pantalla principal con criterios de visualización/ordenación** | Alta | Dashboard nuevo, consultas con orden/filtro/paginación y, si se quiere, `defaultSection` | Medio: cambio transversal pequeño pero repartido |
| **Estadísticas de podcasts** | Alta, con matiz | Medición de tiempo por episodio, agregación, API y UI. La radio mide en servidor; podcast necesita datos del cliente para ser preciso | Medio-alto: definición de métricas y precisión |

### 4.1 Descubrimiento: el único punto con dependencia externa

El README afirma hoy: *“Sin dependencias de servicios externos más allá de RadioBrowser”*. Buscar podcasts rompe esa promesa salvo que se haga un crawler propio, que no recomiendo.

Opciones:

1. **iTunes Search API**
   - Gratuita, sin clave.
   - Devuelve `feedUrl`, portada, autor y géneros.
   - Tiene límites de uso y es una dependencia de Apple.
   - Es la vía más rápida para un MVP.

2. **Podcast Index**
   - API gratuita pero requiere clave/secreto.
   - Ecosistema más abierto y metadatos mejores.
   - Buena opción si se quiere evitar a Apple.

3. **Solo URL manual + importación OPML**
   - 100 % autoalojado, sin dependencia externa.
   - Sin “descubrimiento” integrado, pero cubre a quien migra desde otra app.

**Recomendación:** soportar siempre **URL manual + OPML** y añadir búsqueda con un flag:

```env
PODCAST_DISCOVERY_PROVIDER=none | itunes | podcastindex
```

Para el MVP, `itunes` por defecto si se acepta la dependencia; `none` si el principio de privacidad es irrenunciable. La búsqueda se cachea en servidor para no golpear al proveedor.

### 4.2 Qué significa “cola sincronizable”

Hay dos lecturas:

- **Online, entre dispositivos** (web ↔ Android ↔ escritorio): el servidor es la fuente de verdad y los clientes reconcilian. Es asumible en la primera versión.
- **Offline-first**: IndexedDB/Room, *outbox*, resolución de conflictos y reproducción sin red. Es una fase aparte.

Recomendación: empezar por la primera. Documentar claramente que “sincronizable” no implica descargas ni uso offline.

---

## 5. Arquitectura recomendada

### 5.1 Monolito modular

```text
apps/api/src/
  routes/
    stations.ts          # radio (sin cambios)
    podcasts.ts          # nuevo
  services/
    podcasts/
      feedParser.ts
      feedFetcher.ts
      catalog.ts
      subscriptions.ts
      progress.ts
      queue.ts
      favorites.ts
      discovery.ts
      stats.ts
      playbackToken.ts
      refreshScheduler.ts
```

```text
apps/web/src/
  pages/podcasts/
    PodcastHome.tsx
    PodcastShow.tsx
    PodcastSearch.tsx
    PodcastFavorites.tsx
    PodcastQueue.tsx
    PodcastStats.tsx
  components/podcasts/
    PodcastCard.tsx
    EpisodeRow.tsx
    EpisodePlayerControls.tsx
    QueuePanel.tsx
    PodcastStatsSummary.tsx
    TopPodcasts.tsx
    TopEpisodes.tsx
```

Ventajas:

- Una sola autenticación y un solo modelo de usuario.
- Cola, favoritos y progreso comparten `userId` sin llamadas entre servicios.
- Un solo `docker compose`, un solo volumen SQLite, un solo CI.
- El frontend reutiliza el shell, el player y el sistema de diseño.
- SQLite es suficiente para una instancia personal o familiar; el cuello de botella será el ancho de banda y el refresco de feeds, no la base de datos.

### 5.2 Por qué no un servicio nuevo

Un microservicio de podcasts obligaría a:

- Duplicar o compartir secretos JWT y validar usuarios en dos sitios.
- Compartir SQLite entre procesos (mala idea) o montar otra base de datos.
- Añadir CORS, otro contenedor, otro pipeline de CI, otra migración, otro backup y otra versión.
- Hacer llamadas entre servicios para cola, favoritos y progreso, con más latencia y más modos de fallo.
- Duplicar el contrato para Android.

Para este tamaño es coste sin beneficio. **Extraer un servicio solo si** en el futuro se añaden transcodificación, descargas, transcripción o búsqueda full-text pesada. Entonces tendría sentido un `podcast-worker` separado, no un “podcast API” completo.

### 5.3 Flags de configuración

```env
PODCASTS_ENABLED=true
PODCAST_DISCOVERY_PROVIDER=itunes|podcastindex|none
PODCAST_STREAM_MODE=proxy|redirect
PODCAST_FEED_MAX_BYTES=5242880
PODCAST_REFRESH_INTERVAL_MS=900000
PODCAST_PLAYBACK_TOKEN_TTL=6h
PODCASTINDEX_API_KEY=
PODCASTINDEX_API_SECRET=
```

`PODCASTS_ENABLED=false` debe ocultar la sección en web/Android y hacer que las rutas de podcasts respondan con un error claro (`403 PODCASTS_DISABLED` o `404`, a decidir).

---

## 6. Modelo de datos

### 6.1 Entidades de catálogo y usuario

```sql
podcasts (
  id INTEGER PRIMARY KEY,
  feed_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  image_url TEXT,
  language TEXT,
  link TEXT,
  categories TEXT,              -- JSON array
  last_fetched_at INTEGER,
  etag TEXT,
  last_modified TEXT,
  last_error TEXT,
  created_at INTEGER NOT NULL
);

podcast_episodes (
  id INTEGER PRIMARY KEY,
  podcast_id INTEGER NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  published_at INTEGER,
  duration_sec INTEGER,
  image_url TEXT,
  episode_number INTEGER,
  season_number INTEGER,
  explicit INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER,
  removed_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(podcast_id, guid)
);

CREATE INDEX podcast_episodes_podcast_published
  ON podcast_episodes(podcast_id, published_at DESC);

podcast_subscriptions (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  podcast_id INTEGER NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  subscribed_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, podcast_id)
);

podcast_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  position_sec INTEGER NOT NULL,
  duration_sec INTEGER,
  completed_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, episode_id)
);

podcast_favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  position INTEGER,
  PRIMARY KEY(user_id, episode_id)
);

podcast_queue_state (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

podcast_queue_items (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, episode_id)
);
```

### 6.2 Estadísticas

```sql
podcast_listen_sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  podcast_id INTEGER NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  client_session_id TEXT NOT NULL,
  source TEXT NOT NULL,             -- web | android | desktop
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  listened_ms INTEGER NOT NULL,
  last_position_sec INTEGER,
  duration_sec INTEGER,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, client_session_id)
);

CREATE INDEX podcast_listen_sessions_user_started
  ON podcast_listen_sessions(user_id, started_at);
CREATE INDEX podcast_listen_sessions_user_podcast
  ON podcast_listen_sessions(user_id, podcast_id);
CREATE INDEX podcast_listen_sessions_user_episode
  ON podcast_listen_sessions(user_id, episode_id);

user_podcast_stats_hourly (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  podcast_id INTEGER NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  episode_id INTEGER NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,             -- YYYY-MM-DDTHH en STATS_TIMEZONE
  total_ms INTEGER NOT NULL,
  PRIMARY KEY(user_id, episode_id, bucket)
);

CREATE INDEX user_podcast_stats_hourly_user_podcast_bucket
  ON user_podcast_stats_hourly(user_id, podcast_id, bucket);
```

### 6.3 Notas de modelado

- **`podcasts` y `podcast_episodes` son globales**, no por usuario. Si dos usuarios se suscriben al mismo feed, se descarga y parsea una vez. `podcast_subscriptions` es la relación por usuario.
- **`guid` es la clave estable** para progreso, cola y favoritos. Si un feed no trae `guid`, generar un hash estable de `audio_url + published_at`.
- **No guardar audio**. Solo metadatos. Así SQLite no crece de forma desmedida.
- **No borrar episodios referenciados** por progreso, cola, favoritos o estadísticas. Usar `removed_at`/`last_seen_at` y filtrar en la UI.
- **No unificar `Station` y `Episode`**. Los snapshots JSON de radio no encajan con podcasts y el historial de radio tiene semántica distinta.
- **Límite por feed** (p. ej. 500–1.000 episodios) y política de poda; conservar los referenciados.
- Los IDs expuestos pueden ser enteros; el `guid` no necesita salir al cliente.

---

## 7. API y contrato para web y Android

### 7.1 Endpoints propuestos

```http
GET    /api/v1/podcasts/search?q=...
POST   /api/v1/podcasts/resolve                 # preview de un feed
POST   /api/v1/podcasts/subscriptions
GET    /api/v1/podcasts/subscriptions
DELETE /api/v1/podcasts/subscriptions/:podcastId
GET    /api/v1/podcasts/:podcastId
GET    /api/v1/podcasts/:podcastId/episodes?sort=&filter=&offset=&limit=

POST   /api/v1/podcasts/episodes/:episodeId/playback   # token/URL de reproducción
GET    /api/v1/podcasts/episodes/:episodeId/stream     # Range, 206/416

GET    /api/v1/podcasts/episodes/:episodeId/progress
PUT    /api/v1/podcasts/episodes/:episodeId/progress
POST   /api/v1/podcasts/episodes/:episodeId/progress   # alias para sendBeacon

GET    /api/v1/podcasts/queue
POST   /api/v1/podcasts/queue
DELETE /api/v1/podcasts/queue/:episodeId
PUT    /api/v1/podcasts/queue/order

GET    /api/v1/podcasts/favorites
POST   /api/v1/podcasts/favorites
DELETE /api/v1/podcasts/favorites/:episodeId

GET    /api/v1/podcasts/home                    # dashboard agregado

GET    /api/v1/podcasts/stats/summary
GET    /api/v1/podcasts/stats/top-podcasts
GET    /api/v1/podcasts/stats/top-episodes
GET    /api/v1/podcasts/stats/timeline
GET    /api/v1/podcasts/stats/habits
GET    /api/v1/podcasts/stats/categories
GET    /api/v1/podcasts/stats/recent
```

No renombrar `/stations` ni `/favorites` existentes. En OpenAPI, etiquetas `Radio` y `Podcasts`.

### 7.2 Convenciones del contrato

| Tema | Recomendación |
|---|---|
| Fechas | Epoch en milisegundos, como ya hace la API |
| IDs | Enteros internos estables; `guid` solo para deduplicar |
| Paginación | `{ items, pagination: { offset, limit, hasMore } }` |
| Orden/filtro | `sort=recent|title|duration`, `filter=unplayed|in_progress|completed` |
| URLs | Rutas relativas (`/api/v1/...`); el cliente las resuelve contra su base |
| Audio | No exponer la URL original del enclosure; solo el stream autenticado de la API |
| Errores | Formato actual `{ error: { code, message, status } }` |
| Capacidades | `/api/v1/config` con `features` y `limits` |
| Versión | Mantener `/api/v1`; cambios aditivos; deprecaciones documentadas |

### 7.3 OpenAPI

- `apps/api/src/openapi.ts` es manual. Cada endpoint y esquema nuevo debe añadirse.
- Hay un test (`apps/api/test/openapi.test.ts`) que valida la especificación; ampliarlo.
- Para Android, generar un cliente Kotlin (Retrofit + kotlinx.serialization) desde `openapi.json` evita divergencias.
- Añadir un test de contrato en CI: rutas documentadas existentes y respuestas conformes a los esquemas.
- Mantener `openapi.json` como artefacto descargable para el proyecto Android.

---

## 8. Ingesta de feeds

### 8.1 Parser

- Dependencia recomendada: `fast-xml-parser` (ligera, mantenida, sin resolución de entidades externas por defecto).
- Soportar RSS 2.0 con namespace iTunes; valorar Atom si es sencillo.
- Campos:
  - `channel`: title, description, link, language, image, categories.
  - `item`: title, guid, pubDate, enclosure (`url`, `type`, `length`), `itunes:duration`, `itunes:episode`, `itunes:season`, `itunes:image`, `itunes:explicit`, `content:encoded`.
  - Atom: `entry`, `link rel="enclosure"`, `published`, `updated`, `summary`, `content`.
- Normalizar:
  - Fechas RFC 822/ISO 8601 con *fallbacks*.
  - Duración `HH:MM:SS`, `MM:SS` o segundos.
  - URLs relativas resueltas contra la URL del feed.
  - `enclosure` debe ser audio; ignorar vídeo en la primera versión.
  - `guid` vacío → hash estable.
- Límites:
  - Tamaño máximo del feed (5 MB por defecto).
  - Número máximo de episodios por ingesta.
  - Profundidad y entidades XML limitadas.
  - Timeout de 10 s.

### 8.2 Fetcher

- `ETag`/`Last-Modified` para recibir `304`.
- `User-Agent` identificable (`TolochaRadio/<versión>`).
- Redirecciones limitadas (máximo 5) y validadas en cada salto.
- `Accept: application/rss+xml, application/atom+xml, application/xml, text/xml`.
- Tope de bytes con `readBodyCapped` o equivalente.
- Guardar `last_fetched_at`, `etag`, `last_modified`, `last_error`.

### 8.3 Scheduler

- `PodcastRefreshService` con `setInterval(..., 15 min).unref()`.
- Concurrencia 2–4 y *single-flight* por feed.
- Refresco inmediato al suscribirse.
- Refresco bajo demanda si el show se abre y está obsoleto (> 1 h).
- Backoff exponencial en errores: 15 min, 1 h, 6 h, 24 h.
- No hace falta Redis/BullMQ a esta escala.

### 8.4 OPML

- Parsear en el navegador con `DOMParser` y enviar feeds en lotes de 10–20 a `POST /podcasts/subscriptions/bulk`.
- Evita subir XML grande y aumentar `express.json` (hoy 128 kb).
- Alternativa server-side: `express.text({ type: ["application/xml", "text/xml"], limit: "2mb" })` y un job; más complejo.
- Exportar OPML desde `GET /podcasts/subscriptions/opml`.

---

## 9. Reproducción y proxy

### 9.1 Lo que ya funciona

En `apps/api/src/routes/playback.ts`:

- `upstreamHeaders()` reenvía `Range`.
- `pipeOrigin()` copia `content-range`, `accept-ranges`, `content-type`, etc., y usa `res.status(origin.status)`.
- Un `206` llega bien al cliente porque `Response.ok` es cierto para 2xx.

### 9.2 Lo que hay que corregir o adaptar

- `fetchOriginOrThrow()` trata cualquier respuesta no `ok` como error. Un **`416 Range Not Satisfiable`** se convierte en `503`. Para podcasts hay que permitir `416` o manejarlo explícitamente.
- Enviar `Range: ""` cuando no hay cabecera; en podcast conviene omitirla.
- El endpoint resuelve `ctx.stations.getStation(...)`, que va a RadioBrowser o a emisoras personalizadas. **No reutilizar este endpoint para episodios**: crear `GET /podcasts/episodes/:id/stream` reutilizando `pipeOrigin`/`fetchFollowingRedirects`.
- `trackListening()` y `history.record()` están pensados para radio. Si se reutilizan en podcast, **cada petición de rango contaría como una escucha nueva**. Para podcast usar progreso por episodio.
- Añadir soporte de `HEAD` si se quiere que algunos clientes obtengan duración/tipo sin descargar.
- Mantener `Accept-Encoding: identity` y `Accept: audio/*, */*`.
- Modo de streaming configurable:
  - `proxy` (recomendado): privacidad, sin CORS/mixed-content, estadísticas.
  - `redirect`: ahorra ancho de banda, pero el cliente revela su IP al host del podcast y puede fallar por HTTP/CORS.

### 9.3 Qué no hacer

- No cachear audio en disco.
- No descargar el archivo completo para servirlo.
- No reutilizar `playback_sessions` ni `history` para podcasts.
- No exponer la URL original del enclosure si se usa el proxy.

---

## 10. Token de reproducción

### 10.1 El problema

Hoy:

- `JWT_ACCESS_TTL` por defecto es `15m`.
- La cookie `tolocha-access` se emite con `maxAge = jwtAccessTtlMs` (`apps/api/src/routes/auth.ts`).
- `apps/web/src/stores/player.ts` llama a `ensureValidToken()` al iniciar una emisora, pero **no antes de cada seek**.
- Un episodio puede durar 1–3 horas. Pasados 15 minutos, un *seek* genera una nueva petición Range con cookie/token caducados → 401.
- En Android, Media3/ExoPlayer haría peticiones con un token caducado si se usa `Authorization` de 15 minutos.

En radio no se nota porque la conexión de streaming se mantiene abierta. En podcast, cada *seek* es una petición nueva.

### 10.2 Opciones

| Opción | Pros | Contras |
|---|---|---|
| **A. Refrescar el access token periódicamente** | Sin cambios de backend | Frágil; hay que integrarlo en cada cliente; carreras con seeks; no sirve para Chromecast/descargas |
| **B. Alargar el access token** | Simple | Mala seguridad; afecta a toda la API |
| **C. Token de reproducción firmado, específico del episodio** | Multiplataforma, sin cookie, sin cabeceras especiales, apto para Android/Chromecast | Hay que implementarlo y documentarlo; token en URL |
| **D. Cookie de reproducción de larga duración** | Cómodo en web | Android no usa cookies con la misma naturalidad; difícil de renovar sin recargar |

### 10.3 Recomendación: token de reproducción firmado

Flujo:

1. El cliente autenticado pide `POST /api/v1/podcasts/episodes/:id/playback`.
2. El servidor valida que el episodio existe y que el usuario puede reproducirlo.
3. Firma un token con HMAC-SHA256: `userId`, `episodeId`, `exp`, contexto `tolocharadio/podcast-playback/v1`.
4. Devuelve `{ url, expiresAt }`, por ejemplo:
   ```json
   {
     "url": "/api/v1/podcasts/episodes/123/stream?exp=1699999999&sig=...",
     "expiresAt": 1699999999000
   }
   ```
5. El cliente usa esa URL en `<audio>` o Media3.
6. El endpoint de stream valida firma y caducidad; **no requiere access token ni cookie**.
7. Si caduca, el cliente pide otro token.

Características:

- **TTL recomendado: 6 h** (configurable 1–24 h). Cubre un episodio normal sin renovar y evita recargar `src` a mitad.
- **Ámbito:** usuario + episodio + expiración. No atar a IP (rompe cambios de red móvil).
- **Solo lectura**: el token no sirve para otros endpoints.
- **Sin estado**: verificación HMAC; no hace falta tabla de tokens.
- **Revocación:** rotar el secreto invalida todos; opcionalmente `tokenVersion` por usuario si se necesita revocar uno.
- **Rate limit** en la emisión de tokens.
- **`Cache-Control: no-store`** en la respuesta del token.
- **`Referrer-Policy: no-referrer`** en páginas que puedan exponer la URL.
- **Redactar `sig`/`exp` en logs** del proxy inverso.
- **Comparación timing-safe** y validación de `exp`.
- **HLS:** si un episodio es HLS, el manifiesto firmado debe propagar la firma a los subrecursos. Se puede reutilizar el patrón de `apps/api/src/lib/hls.ts` con contexto de episodio. Si es complejo, dejar HLS de podcasts fuera del MVP (la mayoría son MP3).
- **Descargas:** para descargas offline se necesitará un token de mayor duración o reemisión; no es MVP.

Implementación sugerida:

```ts
const CONTEXT = "tolocharadio/podcast-playback/v1";

function signPlayback(secret: string, userId: number, episodeId: number, exp: number): string {
  return createHmac("sha256", secret)
    .update(`${CONTEXT}\n${userId}\n${episodeId}\n${exp}`)
    .digest("hex");
}
```

La verificación debe comprobar `episodeId` de la ruta, `exp` y firma. No hace falta consultar la base de datos para validar la firma, solo para obtener la URL del episodio.

### 10.4 Por qué no basta con refrescar la cookie

- En web se podría refrescar cada 10 minutos, pero Android y Chromecast no comparten ese modelo.
- Actualizar `audio.src` para renovar la URL puede provocar un reinicio o un *glitch* de buffering.
- Un TTL de 6 h elimina la renovación en la mayoría de los casos y sigue siendo un riesgo bajo para audio de solo lectura.

### 10.5 Alternativa de compromiso

Si se prefiere no poner tokens en URL:

- Web: cookie `tolocha-playback` httpOnly, `SameSite=Lax`, TTL 6 h, emitida por el endpoint de playback; `<audio>` la envía automáticamente.
- Android: `Authorization: Playback <token>` en un `DataSource` de Media3.
- Más código y dos caminos; solo si la exposición del token en URL es inaceptable.

---

## 11. Autenticación web y Android

### 11.1 Web

- Access token en memoria.
- Refresh token en cookie httpOnly `tolocha-refresh`.
- `/auth/refresh` rota tokens y vuelve a emitir cookies.
- `ensureValidToken()` antes de iniciar reproducción.
- `<audio>` usa la cookie `tolocha-access` para autenticarse.
- Para podcasts, el `<audio>` usará la URL firmada del token de reproducción.

### 11.2 Android

- Access token en memoria.
- Refresh token en almacenamiento seguro (`EncryptedSharedPreferences`/Keystore).
- `/auth/refresh` acepta `refreshToken` en el cuerpo (`loadRefreshToken` ya lo soporta).
- Peticiones API con `Authorization: Bearer`.
- `OkHttp Authenticator` o interceptor para refrescar en 401.
- Para audio, usar la URL firmada de reproducción; evita cabeceras personalizadas en ExoPlayer y funciona con descargas/Chromecast.
- No usar cookies para la API nativa; simplifica y evita problemas de SameSite/CSRF.

### 11.3 Escritorio

- La webview usa el mismo flujo que web (cookies).
- Los mandos multimedia de Tauri (`apps/desktop/src-tauri/src/media.rs`) hoy ignoran `Next`/`Previous`; habrá que ampliarlos para la cola.
- `PlayerUpdate` en `bridge.rs` no tiene `duration`, `position` ni `kind`; añadirlos si se quiere barra del sistema y teclas multimedia completas.

---

## 12. Progreso y cola sincronizada

### 12.1 Progreso

Endpoint:

```http
PUT /api/v1/podcasts/episodes/:episodeId/progress
POST /api/v1/podcasts/episodes/:episodeId/progress   # alias para sendBeacon/keepalive
```

Payload:

```json
{
  "sessionId": "uuid",
  "sequence": 12,
  "positionSec": 1234,
  "durationSec": 3600,
  "listenedMs": 1200000,
  "completed": false,
  "occurredAt": 1699999999000,
  "source": "web"
}
```

Diseño:

- `sessionId` lo genera el cliente al empezar a reproducir un episodio.
- `listenedMs` es **acumulativo de la sesión**, no un delta. Así los reintentos son idempotentes.
- El servidor calcula `delta = max(0, listenedMs - listenedMs_anterior)` y lo agrega al cubo horario.
- `sequence` permite ignorar actualizaciones antiguas.
- `positionSec`/`durationSec` actualizan `podcast_progress`.
- `completed` se marca si el cliente lo envía o si `positionSec >= 0.95 * durationSec` **y** se ha escuchado al menos el 80 % de la duración.
- `occurredAt` es opcional; si falta, se usa la hora del servidor. Para sincronización offline, aceptar timestamps dentro de una ventana razonable (p. ej. últimos 30 días, no futuros).
- Validar y recortar: `positionSec` en `[0, durationSec]`, `listenedMs` máximo razonable (p. ej. 3× duración o 24 h).
- Si el usuario busca hacia atrás y reescucha, `listenedMs` sigue creciendo; es tiempo real escuchado.
- Definir si el tiempo es **tiempo de contenido** (posición) o **tiempo de reloj**. Recomendación: contenido; a 2× un episodio de 60 min cuenta 60 min, no 30. Documentarlo.
- Guardar al pausar, al buscar, al terminar y cada 10–15 s mientras se reproduce.
- En web, `visibilitychange`/`pagehide` con `fetch(..., { keepalive: true })` o `sendBeacon` al alias POST.

### 12.2 Cola

- Fuente de verdad: servidor.
- `GET /podcasts/queue` → `{ items, revision, updatedAt }`.
- `POST /podcasts/queue` → añadir al final o “reproducir siguiente”.
- `DELETE /podcasts/queue/:episodeId`.
- `PUT /podcasts/queue/order` → `{ episodeIds, baseRevision }`; si `baseRevision` no coincide, `409`.
- Tamaño máximo (p. ej. 200) y sin duplicados.
- Al terminar un episodio: eliminarlo de la cola y reproducir el siguiente; si no hay siguiente, detener.
- Web: React Query, `refetchOnWindowFocus`, polling suave (30–60 s) mientras la cola está abierta; `BroadcastChannel` entre pestañas.
- Android: Room + WorkManager; reconciliar al arrancar/volver a primer plano. En conflicto, refrescar y avisar (“La cola se actualizó en otro dispositivo”).
- No usar WebSockets/SSE en la primera versión; no aportan suficiente para el coste.

---

## 13. Estadísticas de podcasts

Requisito adicional: **los podcasts también deben tener estadísticas como la radio**. No basta con el progreso; se quiere saber qué se escucha, cuánto, cuándo y qué se completa.

### 13.1 Qué medir

| Métrica | Descripción |
|---|---|
| Tiempo total escuchado | Suma de tiempo de contenido consumido |
| Tiempo por podcast | Ranking de podcasts por tiempo |
| Tiempo por episodio | Ranking de episodios por tiempo |
| Evolución temporal | Día/semana/mes |
| Hábitos | Día de la semana y hora |
| Categorías | Tiempo por categoría del podcast |
| Episodios empezados | Episodios con al menos 30 s escuchados |
| Episodios completados | Episodios terminados o ≥ 95 % con ≥ 80 % escuchado |
| Tasa de finalización | Completados / empezados |
| Recientes | Últimas sesiones con episodio, podcast y tiempo |
| Tiempo medio por episodio | Total / episodios empezados |

Opcional más adelante:

- Tiempo saltado (si se registra).
- Velocidad media de reproducción.
- Rachas de escucha.
- Comparativa radio vs podcasts.
- Estadísticas por podcast concreto.

### 13.2 Cómo medir

La radio mide en servidor: mientras los bytes fluyen por el proxy, `StatsService` acumula tiempo con pulsos y un tope de 15 s (`STATS_PULSE_CAP_MS`). Para podcast, medir solo los bytes del proxy es problemático:

- El cliente puede bufferizar mucho más de lo que escucha.
- Cada *seek* es una petición Range distinta.
- Un *seek* hacia delante no debería contar como tiempo escuchado.
- El servidor no sabe si el usuario pausó o solo dejó de consumir.

**Recomendación: medición híbrida.**

1. **Fuente principal: el cliente**, que conoce `currentTime` y el estado de reproducción. Envía `listenedMs` acumulado y `positionSec`.
2. **Validación en servidor**: recortar valores, limitar incrementos, comprobar duración y sesión. Para una instancia personal no hace falta anti-fraude; si se abre a multiusuario, añadir topes.
3. **Opcional**: registrar sesiones de streaming del proxy (inicio, fin, bytes) para diagnósticos y para contrastar. No usarlas como fuente principal de tiempo.

Ventajas:

- El tiempo escuchado es real (no incluye buffering ni pausas).
- Los *seeks* hacia delante no inflan las estadísticas.
- Reescuchar cuenta como tiempo escuchado.
- Funciona igual en web, Android y escritorio.

Limitaciones:

- Si el cliente no envía el último tramo (cierre abrupto), se pierden como máximo 10–15 s.
- Requiere confianza básica en el cliente; aceptable en autoalojado.
- Si se quiere anti-fraude fuerte, habría que cruzar con bytes del proxy.

### 13.3 Agregación idempotente

Algoritmo:

```text
Cliente, cada 10-15 s y en pausa/seek/fin:
  listenedMs += max(0, currentTime - lastTime) * 1000   // solo si está reproduciendo
  lastTime = currentTime
  PUT /progress {
    sessionId, sequence, positionSec, durationSec,
    listenedMs, completed, occurredAt, source
  }

Servidor:
  sesión = upsert por (userId, sessionId)
  anterior = sesión.listenedMs
  entrante = clamp(payload.listenedMs, anterior, máximo)
  delta = entrante - anterior
  sesión.listenedMs = entrante
  sesión.positionSec = clamp(...)
  sesión.completed = ...
  progreso.upsert(...)
  si delta > 0:
    hourly.upsert(userId, podcastId, episodeId, bucket(occurredAt), delta)
```

Detalles:

- `listenedMs` acumulativo hace que un reintento no duplique tiempo.
- `sequence` evita aplicar actualizaciones antiguas.
- El `bucket` se calcula con `STATS_TIMEZONE`, igual que la radio.
- Si una sesión cruza medianoche, cada actualización cae en su cubo.
- `source` permite saber si viene de web, Android o escritorio.
- `client_session_id` es único por usuario; si el cliente no lo envía, el servidor genera uno (pero entonces no es idempotente entre reintentos).

### 13.4 Consultas y agregados

- `summary`: `sum(total_ms)` de `user_podcast_stats_hourly` + conteos de `podcast_listen_sessions`.
- `top-podcasts`: `group by podcast_id` sobre hourly; join con `podcasts`.
- `top-episodes`: `group by episode_id`; join con `podcast_episodes` y `podcasts`.
- `timeline`: `group by` cubo día/semana/mes; misma forma que radio.
- `habits`: `group by` día de semana/hora; misma forma que radio.
- `categories`: join `podcasts.categories`; sumar tiempo por categoría. Un podcast con varias categorías puede sumar en varias, igual que los tags de radio.
- `recent`: `podcast_listen_sessions` ordenadas por `started_at desc`, join con episodio y podcast.
- `completionRate`: completados / empezados; definir “empezado” como `listened_ms >= 30_000`.
- Rango `from`/`to` y granularidad igual que radio; reutilizar `parseRange`, `parseLimit`, `parseGranularity` extrayéndolos a un helper compartido.

### 13.5 API de estadísticas

```http
GET /api/v1/podcasts/stats/summary?from=&to=
GET /api/v1/podcasts/stats/top-podcasts?from=&to=&limit=
GET /api/v1/podcasts/stats/top-episodes?from=&to=&limit=
GET /api/v1/podcasts/stats/timeline?from=&to=&granularity=day|week|month
GET /api/v1/podcasts/stats/habits?from=&to=
GET /api/v1/podcasts/stats/categories?from=&to=&limit=
GET /api/v1/podcasts/stats/recent?limit=
```

Respuestas orientativas:

```json
// summary
{
  "totalMs": 123456,
  "episodesStarted": 10,
  "episodesCompleted": 4,
  "completionRate": 0.4,
  "podcastsCount": 5,
  "averageEpisodeMs": 12345
}
```

```json
// top-podcasts
{
  "items": [
    { "podcast": { "id": 1, "title": "..." }, "totalMs": 123456, "episodesStarted": 3, "episodesCompleted": 1 }
  ]
}
```

```json
// timeline / habits
{ "granularity": "day", "items": [{ "bucket": "2026-10-24", "totalMs": 123456 }] }
{ "items": [{ "weekday": 0, "hour": 8, "totalMs": 123456 }] }
```

```json
// recent
{
  "items": [
    { "episode": { "id": 10, "title": "..." }, "podcast": { "id": 1, "title": "..." }, "startedAt": 1699999999000, "listenedMs": 123456, "completed": false }
  ]
}
```

### 13.6 UI

- Ruta `/podcasts/estadisticas`, accesible desde la navegación de Podcasts y desde el perfil.
- Reutilizar:
  - `StatsFilters` (periodo y granularidad).
  - `TimelineChart`.
  - `HabitsHeatmap`.
  - `SectionCard`.
  - `formatDurationMs`, `formatAxisDuration`, `CHART_COLORS`.
- Crear:
  - `PodcastStatsSummary` (tiempo total, podcasts, episodios empezados/completados, tasa de finalización, media por episodio).
  - `TopPodcasts` (portada, título, tiempo, episodios).
  - `TopEpisodes` (episodio, podcast, tiempo, completado).
  - `CategoryChart`.
  - `RecentEpisodes`.
- No reutilizar `TopStations`, `GenreChart`, `CountryChart` ni `RecentList` tal cual: son radio-céntricos. Se pueden extraer primitivas comunes.
- Copy de privacidad igual que radio: “solo tú puedes ver estos datos”.
- Opcional: pestaña “Radio | Podcasts” en una página global de estadísticas; en la primera versión, separadas.

### 13.7 Retención y rendimiento

- `user_podcast_stats_hourly` es compacta; mantenerla indefinidamente.
- `podcast_listen_sessions` puede crecer; definir retención (p. ej. 730 días) o purgar sesiones antiguas manteniendo agregados.
- La radio no parece tener purga periódica en `StatsService`; para podcasts conviene definirla desde el principio.
- Índices por `(user_id, started_at)`, `(user_id, podcast_id)`, `(user_id, episode_id)` y `(user_id, podcast_id, bucket)`.
- No borrar episodios referenciados por estadísticas; usar `removed_at`.

### 13.8 Relación con las estadísticas de radio

- No refactorizar `StatsService` en la primera versión: está acoplado a `Station` y `stationId`.
- Crear `PodcastStatsService` paralelo.
- Mantener `/api/v1/stats/me/*` para radio y `/api/v1/podcasts/stats/*` para podcast.
- Si más adelante se quiere una vista unificada, añadir `media_type` y migrar con cuidado; no hacerlo ahora.
- Documentar que las definiciones difieren: radio mide flujo en servidor; podcast mide tiempo de contenido reportado por el cliente.

---

## 14. Configuración pública: `/config`

### 14.1 Estado actual

`GET /api/v1/config` devuelve hoy:

```json
{ "appName": "TolochaRadio", "registrationEnabled": true }
```

Es público y lo usa la web para decidir si mostrar el registro.

### 14.2 Propuesta de extensión

Mantener los campos actuales y añadir `features`, `limits`, `auth`, `version` y `apiVersion`:

```json
{
  "appName": "TolochaRadio",
  "version": "0.28.0",
  "apiVersion": 1,
  "registrationEnabled": true,
  "features": {
    "radio": true,
    "podcasts": true,
    "podcastDiscovery": "itunes",
    "podcastOpml": true,
    "podcastQueue": true,
    "podcastFavorites": true,
    "podcastStats": true,
    "podcastDownloads": false
  },
  "limits": {
    "podcastQueueMax": 200,
    "podcastFeedMaxBytes": 5242880,
    "podcastEpisodesPageSize": 50,
    "podcastOpmlMaxFeeds": 200
  },
  "auth": {
    "accessTokenTtlSec": 900,
    "playbackTokenTtlSec": 21600
  }
}
```

### 14.3 Por qué

- **Web y Android** detectan qué está habilitado sin probar endpoints a ciegas.
- Permite despliegues solo-radio (`podcasts: false`) sin romper clientes.
- `podcastDiscovery: "none"` permite ocultar la búsqueda y dejar URL manual/OPML.
- `limits` evita duplicar constantes en los clientes; el servidor sigue validando.
- `auth` permite refrescar de forma proactiva; no son secretos.
- `version`/`apiVersion` ayudan a diagnosticar y a mostrar avisos de compatibilidad.
- Un solo endpoint de arranque, ya existente, en lugar de un `/capabilities` separado.

### 14.4 Reglas

- Solo información no sensible: nunca claves de Podcast Index, secretos JWT, rutas internas ni configuración de base de datos.
- Campos aditivos; los clientes deben ignorar los desconocidos.
- Si `features.podcasts=false`:
  - La web oculta la sección.
  - Android oculta la sección.
  - Las rutas de podcasts responden `403 PODCASTS_DISABLED` (o `404`, a decidir) con el formato de error habitual.
- Cache: `Cache-Control: no-store` o `max-age=60`; el payload es pequeño. Si se quiere ETag, añadirlo más adelante.
- Tests: `apps/api/test/config.test.ts`, `openapi.test.ts` y el tipo `PublicConfig` de la web.
- No convertir `/config` en un cajón de sastre; solo capacidades, límites y versiones.

### 14.5 Qué no incluir

- `RADIOBROWSER_BASE_URL`, `DATABASE_PATH`, secretos o rutas de disco.
- Estado de salud detallado (para eso está `/health`).
- Datos por usuario (es público).
- Precios, cuotas o información de facturación (no aplica).

---

## 15. Frontend

### 15.1 Navegación y rutas

- Selector de sección **Radio | Podcasts** en el header.
- Subnavegación contextual por sección.
- Rutas `/radio/*` y `/podcasts/*`.
- Redirecciones desde las rutas actuales.
- Actualizar `NAV_ITEMS` en `AppShell.tsx` (está duplicado para escritorio y móvil).
- Actualizar atajos de PWA y `manifest` (categorías, descripción, shortcuts).
- Deep links estables para Android.

### 15.2 Reproductor

- Un solo `<audio>`.
- `NowPlaying` discriminado (`radio` | `podcast`).
- Controles condicionales por tipo.
- Media Session API.
- Progreso y reanudación.
- Cola visible en hoja/panel.
- Velocidad y saltos configurables.
- Persistir volumen/mute; no persistir “estado de reproducción” de radio (es en vivo).

### 15.3 Componentes

- Nuevos: `PodcastCard`, `EpisodeRow`, `EpisodePlayerControls`, `QueuePanel`, `PodcastStatsSummary`, `TopPodcasts`, `TopEpisodes`, `CategoryChart`, `RecentEpisodes`.
- Reutilizar: `EmptyState`, `Combobox`, `ViewModeToggle`, `SectionCard`, `StatsFilters`, `TimelineChart`, `HabitsHeatmap`, `formatDurationMs`.
- No forzar `StationCard`/`StationList` a servir podcasts; son radio-céntricos.

### 15.4 Estado

- `usePlayerStore`: estado del motor y cola.
- React Query: datos de servidor (suscripciones, episodios, progreso, estadísticas, cola).
- No meter estado de servidor en Zustand.
- `defaultSection` en el perfil; `defaultView` por sección si se necesita.

---

## 16. Consideraciones para Android

### 16.1 Cliente y contrato

- Generar el cliente Kotlin desde `openapi.json` (Retrofit + kotlinx.serialization) o mantener DTOs a mano con tests de contrato.
- Mismos endpoints; no duplicar lógica de iTunes/Podcast Index en la app.
- Fechas epoch ms, paginación y errores iguales que web.
- `/config` para feature flags y límites.

### 16.2 Autenticación

- Access token en memoria; refresh token en Keystore/EncryptedSharedPreferences.
- `Authorization: Bearer` en API.
- `OkHttp Authenticator` para 401.
- Audio con URL firmada de reproducción.
- No cookies para API nativa.

### 16.3 Reproducción

- Media3/ExoPlayer con `MediaSessionService` para segundo plano y notificación.
- `MediaItem` con título, podcast, portada, duración y URI firmada.
- Soporte de MP3/AAC por Range y HLS si se decide.
- Audio focus, *noisy receiver*, pausa en llamadas.
- Velocidad y saltos.
- Descargas: fase posterior; `DownloadManager` de Media3 y token de descarga.

### 16.4 Cola y progreso

- Room para cache local de cola y progreso.
- WorkManager para sincronizar cuando vuelva la red.
- Reconciliación al arrancar/foreground; `baseRevision` y `409`.
- `sessionId` estable por sesión de escucha; `listenedMs` acumulativo.
- `occurredAt` para sesiones offline; validación en servidor.

### 16.5 Autoalojado

- Configuración de URL del servidor (como el escritorio).
- Validar `/api/v1/health` y `/api/v1/config`.
- HTTPS recomendado; si se permite HTTP en LAN, documentar `usesCleartextTraffic`/network security config.
- Certificados autofirmados: documentar limitaciones.

### 16.6 Notificaciones

- Push de nuevos episodios (FCM) es una fase posterior.
- Requiere tokens de dispositivo en servidor y consentimiento.
- No es necesario para el MVP; la sincronización al abrir la app basta.

---

## 17. Seguridad y privacidad

### 17.1 SSRF

- Validar URLs de feeds y audio: solo `http`/`https`, puertos 80/443.
- Resolver DNS y bloquear rangos privados, loopback, link-local y metadatos cloud.
- Validar **cada redirección**, no solo la URL inicial.
- Timeouts, tamaño máximo y límite de redirecciones.
- Esto también aplica a las emisoras personalizadas actuales.

### 17.2 XML

- Limitar tamaño y profundidad.
- Desactivar entidades externas.
- Parseador tolerante pero seguro (`fast-xml-parser`).
- No confiar en el contenido del feed para HTML: React escapa por defecto; si se renderiza HTML de notas, sanitizar con DOMPurify.

### 17.3 Tokens y logs

- Token de reproducción de duración corta o media, solo lectura, ámbito usuario+episodio.
- `Cache-Control: no-store` en la emisión.
- `Referrer-Policy: no-referrer`.
- Redactar `sig`/`exp` en logs del proxy inverso.
- Rotación de secreto para revocar.
- Rate limit en emisión.

### 17.4 Artefactos externos

- Portadas: enlaces directos filtran IP al host del podcast. Opciones:
  - Proxy de imágenes con caché y límite de tamaño (más privacidad, más código).
  - Hotlink con `referrerpolicy="no-referrer"` y `loading="lazy"` (más simple).
- La web ya hotlinkea favicons de RadioBrowser; para podcasts, decidir si se mantiene la coherencia o se proxya.
- Validar URLs de imagen y evitar `data:`/`javascript:`.

### 17.5 Límites y abuso

- Máximo de suscripciones por usuario.
- Máximo de feeds en OPML.
- Rate limit de búsquedas y de emisión de tokens.
- Tamaño máximo de feed y de respuesta de búsqueda.
- No permitir subida de audio.

### 17.6 Privacidad

- Estadísticas privadas por usuario.
- No enviar datos de escucha a terceros.
- La búsqueda externa (iTunes/Podcast Index) se hace desde el servidor, no desde el cliente; el proveedor ve la IP del servidor, no la del usuario.
- Documentar la dependencia si se habilita.

---

## 18. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Caducidad del token durante episodios largos | Alto | Token de reproducción firmado con TTL amplio; probar *seek* tras 15+ min |
| Precisión/definición de estadísticas | Medio-alto | Medición híbrida, `listenedMs` acumulativo, documentar métricas |
| Variabilidad de feeds RSS/Atom | Alto | Parser tolerante, fixtures, límites, *fallbacks* |
| SSRF y XML malicioso | Alto | Validación DNS/IP, redirecciones, tamaño, entidades |
| Ancho de banda del proxy | Medio-alto | Modo `proxy`/`redirect`, no descargas en MVP |
| Regresión del reproductor de radio | Medio | Un solo `<audio>`, tests de estado, probar ambos tipos |
| Conflictos de cola entre dispositivos | Medio | Revisión, `409`, reconciliación, no last-write-wins ciego |
| Crecimiento o contención de SQLite | Bajo-medio | No se aborda en esta ampliación: se mantiene SQLite y se reevalúa solo si cambia el despliegue o aparecen métricas que lo justifiquen (anexo 23) |
| Deriva de OpenAPI | Medio | Test de contrato, generar cliente Android |
| Alcance del proyecto | Alto | No objetivos claros, fases pequeñas |
| Marca y navegación | Medio | Decidir tagline/rename y arquitectura de información antes de UI |
| Compatibilidad Android | Medio | Cambios aditivos, `/config`, versión de API |

---

## 19. No objetivos de la primera versión

- Descargas offline y reproducción sin conexión.
- Transcodificación o normalización de audio.
- Transcripciones, capítulos y búsqueda dentro del audio.
- Recomendaciones por ML.
- Funciones sociales, comentarios o listas compartidas.
- Cola colaborativa en tiempo real con WebSockets.
- Un microservicio o migrar a Postgres/MariaDB en la primera versión.
- Alojamiento o subida de podcasts.
- Video podcasts (audio solamente en la primera versión).
- Push notifications (fase posterior).
- Estadísticas públicas o de administración.
- Refactor de las estadísticas de radio a un modelo `media` genérico.

---

## 20. Plan de changes en OpenSpec (aprobado)

La implantación se divide en **4 changes secuenciales** en `openspec/changes/`, con partición de specs sin solapamiento para poder archivarlos en orden:

| Change OpenSpec | Specs afectadas | Contenido principal |
|---|---|---|
| `1. podcasts-catalogo-y-descubrimiento` | `public-api` (mod), `podcast-catalog` (nueva) | `/config` extendido, guardia SSRF en `upstream.ts`, tablas de catálogo y suscripciones, parser RSS/Atom (`fast-xml-parser`), fetcher ETag/304, scheduler, búsqueda (`itunes`/`podcastindex`/`none`) y OPML (`PODCASTS_ENABLED=false` inicial) |
| `2. podcasts-reproduccion-y-progreso` | `podcast-playback` (nueva) | Token firmado HMAC (`6h`), streaming con `Range` (`206`/`416`), tablas y endpoints idempotentes de progreso/sesiones/cubos horarios, generalización de `PlaybackEngine`/`usePlayerStore` y `PlayerBar` bajo demanda |
| `3. podcasts-biblioteca-y-cola` | `podcast-library` (nueva), `web-ui` (mod), `desktop-app` (mod) | Cola sincronizada (`revision` + `409`), episodios favoritos, `/podcasts/home`, `defaultSection` en perfil, selector `Radio \| Podcasts`, vistas web `/podcasts/*`, mandos `Next`/`Previous` en escritorio Tauri y `PODCASTS_ENABLED=true` por defecto |
| `4. podcasts-estadisticas` | `podcast-stats` (nueva) | `PodcastStatsService` (`summary`, `top-podcasts`, `top-episodes`, `timeline`, `habits`, `categories`, `recent`), endpoints `/api/v1/podcasts/stats/*` y vista web `/podcasts/estadisticas` |

---

## 21. Decisiones cerradas

Todas las decisiones previas a la implementación han quedado acordadas:

1. **Proveedor de descubrimiento por defecto:** `itunes` por defecto (`podcastindex` y `none` soportados por configuración), con caché en servidor y soporte permanente de URL RSS manual + OPML.
2. **Estadísticas:** **tiempo de contenido** consumido (no tiempo de reloj) y tasa de finalización calculada sobre **episodios únicos** (`episodesCompleted / episodesStarted`, con umbral de inicio `>= 30 s`).
3. **TTL del token de reproducción:** **6 h** (`PODCAST_PLAYBACK_TOKEN_TTL=6h`), firmado con HMAC-SHA256.
4. **Cola y favoritos:** “favorito” es exclusivamente un **episodio** (los programas se guardan mediante **suscripciones**); la cola **retira automáticamente el episodio al terminar** y avanza al siguiente.
5. **Offline:** primera versión **solo online**; descargas offline quedan fuera de alcance.
6. **Marca:** se mantiene **TolochaRadio** con subtítulo *"Radio en vivo y podcasts"*.
7. **Vista inicial y rutas:** `defaultSection: "radio" | "podcasts"` en perfil (`"radio"` por defecto); se conservan las rutas cortas canónicas de radio (`/explorar`, `/favoritos`, `/historial`, `/mis-emisoras`, `/estadisticas`) con alias desde `/radio/*`, y todo podcasts vive bajo `/podcasts/*`.
8. **Podcasts habilitados por defecto:** `false` durante los changes 1 y 2 (cimientos) y `true` por defecto a partir del change 3 (cuando la UI está completa).
9. **Portadas:** **hotlink directo** con `referrerPolicy="no-referrer"`, `loading="lazy"` y validación `http`/`https` al ingerir el feed.
10. **HLS de podcasts:** fuera del MVP (solo audio progresivo MP3/AAC/M4A/OGG mediante `Range`).
11. **Estadísticas en UI:** **dos páginas separadas** (`/estadisticas` en Radio y `/podcasts/estadisticas` en Podcasts) reutilizando componentes gráficos comunes.
12. **Límites operativos:** cola máxima `200`, suscripciones por usuario `200`, feeds por importación OPML `200`, tamaño máximo de feed `5 MB` y retención de hasta `500` episodios por feed (sin eliminar nunca episodios referenciados por usuarios).

> **Fuera de esta lista:** la evaluación de almacenamiento (SQLite vs MariaDB/PostgreSQL) queda como nota de seguimiento en el anexo 23. No es una decisión ni una tarea de esta ampliación.

---

## 22. Referencias de código

| Archivo | Relevancia |
|---|---|
| `apps/api/src/db/schema.ts` | Tablas actuales y punto de partida para las nuevas |
| `apps/api/src/db/client.ts` | Conexión SQLite: WAL, `busy_timeout`, `foreign_keys` |
| `apps/api/src/db/migrate.ts` | Migraciones Drizzle |
| `apps/api/test/helpers.ts` | Tests con SQLite en memoria; impacto de una futura migración |
| `docker-compose.yml` | Despliegue de un solo contenedor con volumen local |
| `apps/api/src/routes/playback.ts` | Proxy de audio, Range, HLS, estadísticas de radio |
| `apps/api/src/lib/upstream.ts` | Redirecciones y lectura con tope |
| `apps/api/src/lib/hls.ts` | Firmas HMAC de subrecursos; patrón para el token de podcast |
| `apps/api/src/middleware/auth.ts` | Auth por Bearer o cookie |
| `apps/api/src/routes/auth.ts` | Cookies de acceso/refresco y TTL |
| `apps/api/src/services/stats.ts` | Pulsos, cubos horarios y sesiones de radio |
| `apps/api/src/routes/stats.ts` | Endpoints `/stats/me/*` |
| `apps/api/src/services/customStations.ts` | Validación de URLs; revisar SSRF |
| `apps/api/src/openapi.ts` | Especificación manual |
| `apps/api/src/config/env.ts` | Variables de entorno y tipos |
| `apps/web/src/stores/player.ts` | Reproductor actual; generalizar |
| `apps/web/src/components/PlayerBar.tsx` | Barra actual; ampliar |
| `apps/web/src/App.tsx` | Rutas; añadir `/radio/*` y `/podcasts/*` |
| `apps/web/src/components/AppShell.tsx` | Navegación duplicada escritorio/móvil |
| `apps/web/src/lib/defaultView.ts` | Vista inicial; añadir sección |
| `apps/web/src/pages/Favorites.tsx` | Patrón DnD para favoritos/cola |
| `apps/web/src/pages/Stats.tsx` | Estructura de estadísticas reutilizable |
| `apps/web/src/components/stats/*` | Componentes de gráficos |
| `apps/web/src/lib/stats.ts` | Tipos y utilidades de estadísticas |
| `apps/web/vite.config.ts` | PWA y `NetworkOnly` para audio/API |
| `apps/desktop/src-tauri/src/media.rs` | Teclas multimedia; Next/Previous desactivados |
| `apps/desktop/src-tauri/src/bridge.rs` | `PlayerUpdate` sin duración/posición/tipo |
| `docs/arquitectura.md` | Visión general actual |
| `docs/api.md` | Documentación de API |
| `docs/uso.md` | Funcionalidad visible |

---

## 23. Anexo (fuera del alcance planificado): ¿SQLite es suficiente? MariaDB y PostgreSQL

> **Nota de seguimiento, no feature planificada.** Esta sección se conserva como referencia para una decisión futura de infraestructura. No forma parte de la ampliación de podcasts, no se implementará en las fases de este documento y no bloquea el proposal.

### 23.1 La pregunta

Con radio, SQLite es más que suficiente. Al añadir podcasts aparecen nuevas escrituras: progreso cada pocos segundos, cola, suscripciones, refresco de feeds y estadísticas. La pregunta razonable es:

- ¿SQLite se queda corto?
- ¿Habrá problemas de sincronización o colisiones?
- ¿Merece la pena migrar a MariaDB?

**Respuesta corta:** para una instancia personal o familiar, SQLite sigue siendo suficiente. Los problemas de “sincronización” y “colisiones” son, sobre todo, **de lógica de aplicación**, no del motor. MariaDB no los resuelve por sí sola. La migración tiene sentido cuando aparecen **varias instancias, alta concurrencia, HA o un worker separado**, no por el hecho de añadir podcasts.

### 23.2 Qué hace SQLite hoy

En `apps/api/src/db/client.ts`:

- `journal_mode = WAL`.
- `busy_timeout = 5000`.
- `foreign_keys = ON`.

En `apps/api/src/index.ts`:

- Un solo proceso Node.
- `better-sqlite3` es **síncrono**: cada consulta bloquea el event loop mientras se ejecuta.
- Migraciones Drizzle al arrancar.
- Tests con `DATABASE_PATH=:memory:` (`apps/api/test/helpers.ts`).
- Docker con un único contenedor y un volumen local (`docker-compose.yml`).

Con WAL:

- Muchos lectores concurrentes.
- **Un solo escritor a la vez**; los escritores se serializan.
- Los lectores no bloquean al escritor y viceversa.
- `busy_timeout` absorbe bloqueos breves.

Esto no significa “sin concurrencia”: significa que las escrituras hacen cola. Para el volumen previsto, es una cola corta.

### 23.3 Qué carga añaden los podcasts

| Operación | Frecuencia estimada | Escrituras |
|---|---|---|
| Progreso de escucha | Cada 10–15 s por oyente activo | Sesión + progreso + cubo horario (3 *upserts*) |
| Cola | Al añadir/quitar/reordenar | 1–2 |
| Suscripción | Al suscribirse/desuscribirse | 1 |
| Refresco de feed | Cada 15 min el scheduler; cada feed cada 6 h | Lote de episodios en una transacción |
| Estadísticas | Incluidas en el progreso | 1 *upsert* adicional |
| Lecturas | Listados, dashboard, estadísticas | Muchas, pero indexadas |

Órdenes de magnitud orientativos:

- 20 oyentes simultáneos → ~4–6 escrituras/s.
- 100 oyentes simultáneos → ~20–30 escrituras/s.
- El refresco de feeds no es continuo: son ráfagas cada X horas.
- No se guarda audio; solo metadatos. Un catálogo grande (10.000 podcasts × 500 episodios = 5 millones de filas) puede ocupar varios GB, pero SQLite lo maneja; la poda y los índices son más importantes que el motor.

Escrituras simples de este tamaño son rápidas en SQLite. El riesgo real es que **una transacción larga o una consulta pesada bloquee el event loop** por culpa de `better-sqlite3`. Por eso importan más la disciplina de escritura y el benchmark que el motor.

### 23.4 “Sincronización” y “colisiones”: qué resuelve la base de datos

Los clientes (web, Android, escritorio) **no acceden a SQLite directamente**. Hablan con la API. Por tanto:

- La “sincronización” entre dispositivos es estado de servidor, no replicación de base de datos.
- Una colisión de dos dispositivos no se evita con MariaDB; se evita con revisión optimista, *idempotencia* y restricciones únicas.

| Escenario | Qué puede pasar | Solución | ¿Necesita MariaDB? |
|---|---|---|---|
| Dos móviles reordenan la cola | Uno pisa al otro | `revision` + `409` + reconciliación | No |
| Dos progresos del mismo episodio | Tiempo duplicado | `sessionId` + `listenedMs` acumulativo + *upsert* | No |
| Dos feeds iguales | Podcast duplicado | `UNIQUE(feed_url)` + *single-flight* | No (con una instancia) |
| Refresco y lectura a la vez | Bloqueo breve | WAL + transacción corta | No |
| Estadísticas concurrentes | *Upsert* atómico | `ON CONFLICT DO UPDATE` | No |
| Varias réplicas de la API | SQLite no es adecuado | SGDB cliente-servidor | Sí |

Matices:

- SQLite ya ofrece *upserts* atómicos (`ON CONFLICT DO UPDATE`), transacciones y restricciones únicas. Son exactamente las herramientas que necesitas para progreso, cola y deduplicación.
- MariaDB añade concurrencia de escritores a nivel de fila, pero **no resuelve conflictos lógicos**. Si dos dispositivos pisan la cola, seguirás necesitando revisión y `409`.
- La ventaja de MariaDB/Postgres aparece cuando hay **varias instancias** o **muchos escritores concurrentes**, no por la semántica de sincronización.

### 23.5 Cuándo SQLite deja de ser suficiente

Señales claras para evaluar un SGDB cliente-servidor:

1. **Varias réplicas de la API** (varios contenedores, varios hosts, balanceador). SQLite no está pensado para compartirse entre hosts; entre procesos del mismo host es posible, pero no es recomendable para varias réplicas. Mucho menos sobre NFS/SMB.
2. **Alta disponibilidad, replicación o point-in-time recovery.** SQLite no las ofrece de serie.
3. **Concurrencia de escritura sostenida** con transacciones largas, `SQLITE_BUSY` frecuente o *event-loop lag* visible.
4. **Worker separado** (refresco de feeds, transcodificación, descargas) que necesite escribir en la misma base de datos desde otro proceso.
5. **Analítica pesada** que compita con las escrituras y haga crecer el WAL o bloquee checkpoints.
6. **Búsqueda full-text/transcripciones a gran escala.** SQLite tiene FTS5 y puede servir al principio, pero Postgres escala mejor.
7. **Requisitos operativos** del equipo: backups centralizados, réplicas, monitorización estándar, etc.

Añadir podcasts, por sí solo, **no cruza ninguno de estos umbrales** en una instancia personal. El despliegue actual (un contenedor, un volumen local) es el caso ideal para SQLite.

### 23.6 MariaDB frente a PostgreSQL

Si algún día se migra, no elegiría MariaDB “porque SQLite es pequeño”. Elegiría según operación y ecosistema.

| Criterio | SQLite | MariaDB | PostgreSQL |
|---|---|---|---|
| Operación | Cero | Contenedor/servicio, credenciales, backups | Contenedor/servicio, credenciales, backups |
| Concurrencia | Un escritor | MVCC + bloqueos de fila | MVCC |
| Varias instancias | No | Sí | Sí |
| JSON | Texto/JSON1 | JSON (alias de texto validado) | JSONB |
| Full-text | FTS5 | Full-text | `tsvector`/GIN |
| `RETURNING` | Sí (3.35+) | Parcial según versión | Completo |
| Drizzle | Excelente | Bueno | Excelente |
| Coste de migración | — | Medio-alto | Medio-alto |

- **PostgreSQL** suele ser la opción por defecto si no hay infraestructura previa: SQL más estándar, mejor concurrencia, JSONB, full-text y ecosistema Drizzle.
- **MariaDB** es perfectamente válida si ya la operas o si el equipo tiene experiencia; pero arrastra peculiaridades de MySQL (índices con prefijo, `ON DUPLICATE KEY UPDATE`, diferencias de `RETURNING`).
- Ninguna de las dos resuelve por sí sola la sincronización lógica entre dispositivos.

### 23.7 Coste real de migrar

No es un cambio de una tarde:

- **Dialecto y esquema:** `AUTO_INCREMENT`, índices sobre textos con prefijo, JSON, `ON CONFLICT` vs `ON DUPLICATE KEY UPDATE`, `RETURNING`, funciones de fecha, sensibilidad a mayúsculas.
- **Asincronía:** hoy `better-sqlite3` es síncrono. `StatsService` tiene métodos síncronos (`.all()`, `.run()`) y las rutas los llaman de forma síncrona. Con `mysql2`/`pg` todo pasa a promesas; hay que revisar servicios, rutas y tests.
- **Tests:** hoy usan SQLite en memoria. Con MariaDB/Postgres harían falta contenedores de test (Testcontainers o similar) o una abstracción de repositorio que permita ambos.
- **Infraestructura:** segundo servicio, credenciales, healthcheck, backups, actualizaciones, consumo de memoria (MariaDB no sale gratis en un VPS pequeño) y monitorización.
- **Migración de datos:** script de copia, validación de hashes/IDs, downtime y plan de rollback.
- **OpenAPI, docs y Docker:** actualizar `docs/instalacion.md`, `docs/despliegue.md`, `docker-compose.yml` y CI.

Estimación orientativa: **semanas, no horas**. Cuenta con 1–2 semanas de desarrollo y validación, además de la operación posterior; más si se añaden réplicas o HA. Hacerlo sin una necesidad medida añade riesgo y retrasa los podcasts.

### 23.8 Recomendación: mantener SQLite con disciplina

**Primera versión: SQLite.** Es suficiente para una instancia personal/familiar y para un despliegue pequeño. Para que siga siéndolo:

- **Parsear feeds fuera de la transacción** y escribir en lotes; transacciones cortas.
- **Upserts idempotentes** y restricciones únicas para suscripciones, episodios, progreso y cola.
- **Single-flight** en el refresco de feeds para no duplicar descargas.
- **Índices** en `(user_id, started_at)`, `(user_id, podcast_id)`, `(podcast_id, published_at)`, etc.
- **Paginación con límite** y estadísticas preagregadas; evitar consultas sin rango sobre tablas grandes.
- **Monitorizar** el *event-loop lag* (`perf_hooks.monitorEventLoopDelay`), el tamaño del WAL y los `SQLITE_BUSY`.
- **Backups correctos**: `VACUUM INTO` o `.backup`; no copiar el `.db` y el `-wal` en caliente sin precaución.
- Opcional: `synchronous=NORMAL` (con WAL) si se prioriza rendimiento sobre durabilidad máxima; documentar el trade-off.
- Opcional: `PRAGMA optimize` periódico y `wal_checkpoint` en mantenimiento.

**Portabilidad para el futuro:**

- Mantener el acceso a datos en `services/`, no en rutas.
- Los nuevos servicios de podcasts deben exponer métodos `async` aunque SQLite sea síncrono; así el cambio de driver no obliga a reescribir firmas.
- Evitar SQL exclusivo de SQLite (`INSERT OR REPLACE`, `rowid`, funciones de fecha propias) y usar Drizzle.
- Guardar JSON como texto con esquema validado, fechas en epoch ms e IDs enteros estables.
- Usar `varchar` acotado en campos indexados si se quiere facilitar una futura migración a MariaDB.
- **Una sola base de datos** para radio y podcasts; no dividir en SQLite + MariaDB.

### 23.9 Benchmark futuro (si algún día se abre la decisión)

Esto **no es una tarea de la ampliación actual**; solo describe cómo se decidiría en el futuro. Antes de decidir, medir en el hardware real (VPS/contenedor), no en el portátil:

- 50–100 clientes simulados enviando progreso cada 15 s.
- Operaciones de cola, lecturas de dashboard/episodios y consultas de estadísticas.
- Refresco de feeds concurrente con lo anterior.
- Métricas: p95 de latencia, `SQLITE_BUSY`, *event-loop lag* p99, tamaño del WAL, duración del refresco, CPU/RAM.
- Umbrales orientativos (no dogma): p95 de progreso < 200 ms, sin `SQLITE_BUSY` sostenido, *event-loop lag* p99 < 100 ms, refresco de feed < 2 s, WAL estable.

Si se cruzan los umbrales: primero optimizar (índices, lotes, preagregación, worker de escritura). Si aun así no llega, migrar.

### 23.10 Conclusión

- **SQLite no es el problema de los podcasts.** El volumen de escritura es modesto y no se almacena audio.
- **Las colisiones de sincronización son de aplicación**, no del motor: revisión, idempotencia y restricciones únicas.
- **No migrar ahora.** Mantener SQLite, diseñar portable y medir.
- **Si hay que migrar**, PostgreSQL es la opción por defecto; MariaDB si ya existe infraestructura/experiencia. El disparador será la operación (réplicas, HA, concurrencia), no el simple hecho de añadir podcasts.

---

## Nota final

Este documento es un punto de partida, no una decisión cerrada. Las dos piezas que más condicionan el resto son:

1. **El contrato de reproducción** (token, Range, auth web/Android).
2. **La definición de estadísticas** (qué se mide y cómo se agrega).

Si esas dos se fijan bien, el resto —feeds, suscripciones, cola, favoritos y pantallas— es trabajo más predecible. La evaluación de almacenamiento queda como nota de seguimiento (anexo 23), fuera del alcance planificado. La propuesta OpenSpec se hará más adelante, cuando se confirmen las decisiones pendientes.
