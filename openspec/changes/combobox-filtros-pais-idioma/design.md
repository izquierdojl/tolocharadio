## Context

La web filtra el catálogo con dos `<input>` de texto libre en `apps/web/src/pages/Explore.tsx` (líneas ~77-94) para país e idioma, enviados como query params `country`/`language` a `GET /stations`. El backend (`apps/api/src/services/stations.ts` + `routes/stations.ts`) solo ofrece búsqueda de emisoras; radio-browser.info tiene endpoints propios de listados (`json/countries`, `json/languages`). El frontend usa React 19 + TanStack Query v5 + Tailwind; no hay librería de dropdowns en las dependencias. Motivación y comportamiento esperado: ver `proposal.md` y los deltas de `stations` y `web-ui` en `specs/`.

## Goals / Non-Goals

**Goals:**
- Exponer listas de países e idiomas del catálogo vía API, reutilizando el patrón de caché/degradación existente de `StationsService`.
- Sustituir los filtros de texto por combobox con búsqueda directa (filtra opciones mientras se escribe) y selección.
- Mantener la coherencia visual Tolocha y no introducir dependencias nuevas en la web.

**Non-Goals:**
- No se cambia el modelo de envío del formulario (el botón «Buscar» / Enter sigue aplicando los filtros).
- No se añade paginación, búsqueda remota ni valores multiselección en los combobox.
- No se toca el almacenamiento en base de datos ni el proxy de playback.

## Decisions

### D1. Dos endpoints nuevos en el backend: `GET /stations/countries` y `GET /stations/languages`
Devuelven `{ items: string[] }` con los valores únicos ordenados alfabéticamente.
- El cliente radio-browser (`radiobrowser.ts`) añade `countries()` y `languages()` contra `json/countries` y `json/languages`.
- `StationsService` añade `listCountries()` y `listLanguages()` usando la misma `Cache` (claves `countries`/`languages`) y las mismas reglas de degradación que `search()`: origen caído + caché → sirve caché; origen caído sin caché → `503 CATALOG_UNAVAILABLE`.
- Se filtran valores vacíos/nulos y duplicados (normalización en `normalize.ts` o en el propio servicio) y, cuando el origen informa `stationcount`, solo se incluyen opciones con `stationcount > 0` («disponibles» en el catálogo).
- **Gotcha de enrutado**: registrar estas rutas antes que `/stations/:id` en `routes/stations.ts` (si no, `:id` capturaría `"countries"`).

*Alternativas:* exponer un único endpoint `/stations/options` con ambos listados. Se descarta por simplicidad de consumo en la web (dos consultas independientes y cacheables) y porque sigue el patrón recurso-por-ruta del resto de la API.

### D2. Componente combobox propio sin dependencias
Nuevo `apps/web/src/components/Combobox.tsx` (accesible: teclado ↑/↓, Enter para seleccionar, Escape para cerrar, `aria-expanded`, cierre al hacer clic fuera), con búsqueda-as-you-type sobre las opciones. Se reutiliza para país e idioma en `Explore.tsx`.

*Alternativas:* Radix / headless UI (dependencia nueva) o `<select>` nativo (sin búsqueda por texto). Se descarta la dependencia por el estilo minimalista del repo; se descarta el `select` nativo porque no cumple «buscar en un control de texto directo».

### D3. Opciones cargadas con TanStack Query
`Explore.tsx` usa `useQuery` para `GET /stations/countries` y `GET /stations/languages` (react-query v5, como la rejilla). TTL largo de *staleTime* para amortizar caché (el backend ya cachea). Si la consulta falla, el combobox degrada a un input de texto simple que conserva el comportamiento actual de filtrado (sin romper la búsqueda) y se muestra una indicación breve del problema — cumple el escenario «Opciones del catálogo no disponibles» del spec de `web-ui`.

### D4. Contrato consumido por el frontend
Se añade a `lib/types.ts` un tipo `StringListPage { items: string[] }` y helpers en `lib/api.ts` (p. ej. `api.get<{ items: string[] }>("/stations/countries")`), reutilizando los headers/refresh existentes.

### D5. Documentación OpenAPI
Se añaden los paths `/stations/countries` y `/stations/languages` en `apps/api/src/openapi.ts`, ambos `security: []`, respuesta 200 con `{ items: string[] }` y error 503, coherentes con el `stations` existente.

### D6. Filtro por género (tipo de emisora)
Radio-browser.info permite buscar por `tag` (género/tipo) en `stations/search` — el backend ya lo acepta desde el change inicial aunque no se expone en la web. Para que el combobox ofrezca «géneros disponibles»:
- Nuevo endpoint `GET /stations/tags` que proxya `json/tags`, siguiendo exactamente el patrón de D1 (`RadioBrowserClient.tags()`, `StationsService.listTags()` con caché clave `tags` y degradación 503, ruta antes de `:id`, path en OpenAPI).
- La lista se normaliza con `normalizeOptions` (igual que países/idiomas: vacías/duplicadas fuera) pero se ordena por `stationcount` descendente (los géneros más populares primero, desempate alfabético) en lugar de alfabético — `listOptions("tags", …, "stationcount")`.
- Dado que el origen limita la lista a 1000 tags por defecto, `RadioBrowserClient.tags()` pide `limit=100000` para obtener el catálogo completo (~12k géneros).
- En la web, un tercer `FilterControl`/`Combobox` reutilizable («Género») junto a país e idioma, que alimenta el query param `tag` de `GET /stations` (mismo flujo «Buscar»/Enter y degradación a input).
- Reutiliza `StringListPage`, `fetchCatalogTags`, tipos y degradación del frontend ya definidos (D3/D4).

*Alternativa:* no exponer la lista y dejar `tag` como texto libre. Se descarta: el objetivo es descubrir géneros con busqueda sobre lista, como país/idioma.

## Risks / Trade-offs

- [El origen devuelve listados muy voluminosos] → Mitigación: filtrado de opciones vacías y con `stationcount === 0`, dedupe y caché compartida; la lista final por idioma/país queda acotada y ordenada.
- [Ruta capturada por `:id`] → Mitigación: orden de registro de rutas (D1). Validable con un test del router.
- [Latencia del origen en el primer render de la web al cargar dos listados nuevos] → Mitigación: `staleTime` largo + caché del backend + degradación a input si falla (D3).
- [Combobox propio con accesibilidad incompleta] → Mitigación: aplicar pautas ARIA básicas (D2) y probar teclado; es un componente pequeño y acotado.

## Migration Plan

Despliegue monolítico en un paso (API + web en el mismo contenedor): basta `docker compose up --build -d` tras implementar. La web fallbackea a input de texto si la API antigua no expone aún los endpoints (degradación por definición), por lo que no hay ventana de compatibilidad crítica. Sin cambios de esquema de BD.

## Open Questions

Ninguna: los supuestos menores (modelo «Buscar» persistente, semántica de «disponibles» = con emisoras) quedan fijados en D1/D2/D3.