# Tasks

## 1. API: servicio de ranking

- [x] 1.1 Comprobar contra Apple si el feed nuevo admite filtro por categoría y anotar el resultado en `design.md`; verificar con `curl` documentado en el commit o en la nota del diseño
- [x] 1.2 Añadir `getTop(country, genre?, limit)` a `PodcastDiscoveryService` (ranking del feed nuevo sin `genre`, feed antiguo con `genre`) con validación de país/categoría/límite y verificar con tests unitarios (`fetch` simulado) de orden, límite y entradas inválidas
- [x] 1.3 Resolver `feedUrl` con `itunes.apple.com/lookup` en lote, omitiendo programas sin `feedUrl` válido, y verificar con tests del mapeo a `PodcastSearchResult`
- [x] 1.4 Cachear por `country:genre:limit` con TTL propio de varias horas y verificar con un test de que la segunda petición no llama a `fetch`
- [x] 1.5 Gestionar proveedores y errores (`DISCOVERY_DISABLED` con `none`, error controlado con `podcastindex`, `DISCOVERY_UNAVAILABLE` ante fallos de Apple) y verificar con tests de cada caso, incluido el fallo aislado del origen por categoría

## 2. API: ruta y documentación

- [x] 2.1 Añadir `GET /podcasts/top` en `routes/podcasts.ts` con autenticación, parámetros `country`, `genre` y `limit`, y verificar con tests de ruta (200, 400 por país no válido, 401 sin sesión, 403 con podcasts deshabilitados)
- [x] 2.2 Documentar el endpoint en `apps/api/src/openapi.ts` y verificar que el test del OpenAPI existente sigue pasando

## 3. Web: store y cliente

- [x] 3.1 Añadir `fetchTopPodcasts` al cliente de API y tipos, y verificar con un test como el de `podcastSearchApi.test.ts`
- [x] 3.2 Crear el store `topCharts` (país por defecto `es`, categoría opcional, persistido en `localStorage` con try/catch) con la lista fija de países y categorías, y verificar con tests del valor por defecto y la persistencia

## 4. Web: sección «Populares»

- [x] 4.1 Mostrar «Populares» en `PodcastSearch.tsx` con la caja vacía, con selector de país y de categoría, reutilizando las tarjetas y la suscripción existentes; verificar con un test de componente o, en su defecto, de forma manual en el navegador
- [x] 4.2 Gestionar estados de carga, error con reintento, aviso discreto si falla el filtro por categoría y ocultar la sección con el descubrimiento deshabilitado; verificar cada estado con tests o de forma manual
- [x] 4.3 Reutilizar el mismo diseño responsive de los resultados de búsqueda (rejilla de 1 columna en móvil y 2 en pantallas anchas; esa pantalla no depende del modo tarjeta/lista global) y verificarlo en móvil y escritorio

## 5. Verificación integral

- [x] 5.1 Ejecutar `npm run verify:full` y verificar que typecheck, lint, tests y build pasan
- [x] 5.2 Confirmar en Docker con `docker compose up --build -d` y un smoke de `GET /api/v1/podcasts/top` (con `country=es` y con `genre`), y verificar que la UI muestra «Populares»

## Workflow follow-up

- Archivar el change tras commitear todo el código (ver AGENTS.md) y generar la release `minor` desde `main`.
