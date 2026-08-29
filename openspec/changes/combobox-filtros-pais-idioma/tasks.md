## 1. API — listados de países, idiomas y géneros

- [x] 1.1 Añadir métodos `countries()` y `languages()` a `RadioBrowserClient` (`apps/api/src/services/radiobrowser.ts`) que consulten `json/countries` y `json/languages` con el `appname`/`User-Agent` fijo; verificar con un test unitario (mock de `fetch`) que las llamadas incluyen la identificación y devuelven el listado
- [x] 1.2 Extraer y normalizar los nombres de opciones (utilidad en `normalize.ts`): valores no vacíos, sin duplicados, orden alfabético, y descartando entradas con `stationcount === 0` cuando el origen informa ese campo; verificar con tests de valores vacíos/duplicados/count 0
- [x] 1.3 Añadir `listCountries()` y `listLanguages()` a `StationsService` (`apps/api/src/services/stations.ts`) con claves de caché `countries`/`languages` y la misma degradación que `search()` (caché si existe, si no 503 `CATALOG_UNAVAILABLE`); verificar con tests usando un mock del origen (caché, origen caído con/sin caché)
- [x] 1.4 Registrar `GET /stations/countries` y `GET /stations/languages` en `routes/stations.ts` ANTES de `/stations/:id`, respuesta `{ items: string[] }`; verificar que `/stations/countries` no es capturado por `/stations/:id` (test de integración que devuelve 200 y shape correcto; `:id` sigue respondiendo 404 para UUID inexistente)
- [x] 1.5 Documentar ambos endpoints en `apps/api/src/openapi.ts` (tags Emisoras, `security: []`, 200 `{ items: string[] }`, 503); verificar que `GET /api/v1/openapi.json` incluye los nuevos paths y respeta el formato de errores
- [x] 1.6 Añadir `tags()` a `RadioBrowserClient` (`json/tags`, identificación de app) y `listTags()` a `StationsService` con caché clave `tags` y degradación idéntica a países/idiomas; verificar con tests unitarios y de servicio (cache, origen caído con/sin caché)
- [x] 1.7 Registrar `GET /stations/tags` antes de `/stations/:id` (respuesta `{ items: string[] }`), verificar con test de integración que no lo captura `:id`, y documentar el path en `openapi.ts`; verificar que `openapi.json` expone `/stations/tags` y que `<busqueda>?tag=…` filtra emisoras por género

## 2. Web — tipos, cliente API y componente combobox

- [x] 2.1 Añadir a `lib/types.ts` el tipo `StringListPage { items: string[] }` y exponer en `lib/api.ts` consultas tipadas para países e idiomas; verificar con `npm run typecheck -w @tolocharadio/web`
- [x] 2.2 Crear `components/Combobox.tsx`: control con botón/input que abre una lista de opciones, búsqueda as-you-type que filtra las opciones, teclado (↑/↓, Enter para seleccionar, Escape para cerrar), cierre al hacer clic fuera y atributos ARIA (`aria-expanded`, `aria-controls`); verificar en el navegador con foco/teclado y con `npm run typecheck`
- [x] 2.3 Integrar los combobox de país e idioma en `pages/Explore.tsx` en sustitución de los `<input>` de texto, conservando el flujo actual de aplicar filtros con «Buscar»/Enter y los mismos query params; verificar que filtrar país/idioma seleccionado actualiza la rejilla como antes
- [x] 2.4 Cargar las opciones con `useQuery` (`GET /stations/countries` y `/stations/languages`) con `staleTime` largo; si la consulta falla, degradar a un input de texto simple que conserve el filtrado actual e indicar brevemente el problema sin romper la búsqueda; verificar el fallback simulando un fallo de red del endpoint
- [x] 2.5 Exponer `fetchCatalogTags` en `lib/api.ts` y añadir un tercer combobox de género en `pages/Explore.tsx` (cargado con `useQuery` + degradación), alimentando el query param `tag` de `GET /stations` e incluyéndolo en los resets («Quitar filtros»); verificar que seleccionar género filtra la rejilla y la búsqueda combinada incluye el género

## 3. Verificación final

- [x] 3.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` en la raíz sin errores
- [x] 3.2 Levantar `docker compose up --build -d` y verificación smoke: los combobox cargan opciones del catálogo, filtran por país/idioma y la búsqueda combinada funciona; Swagger UI refleja los nuevos endpoints
- [x] 3.3 Smoke Docker: el combobox de género carga los géneros del catálogo, filtra emisoras por género y Swagger refleja `/stations/tags`