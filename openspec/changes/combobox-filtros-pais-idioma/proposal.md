## Why

Los filtros de país e idioma de la exploración de emisoras son ahora campos de texto libre: el usuario debe adivinar valores exactos («España», «español») y no hay forma de descubrir qué países o idiomas existen en el catálogo. Esto degrada la usabilidad de la búsqueda combinada.

## What Changes

- **Nuevos endpoints en la API** (`GET /stations/countries`, `GET /stations/languages` y `GET /stations/tags`): listas ordenadas y únicas de países, idiomas y géneros (tags) disponibles en el catálogo, obtenidas de radio-browser.info con el mismo patrón de caché y degradación que `/stations`.
- **Filtros de país, idioma y género como combobox en la web**: se sustituyen los inputs de texto por controles desplegables que ofrecen las opciones disponibles del catálogo y permiten filtrar/buscar escribiendo directamente en el campo de texto del control (busca-sobre-lista).
- **Consulta tipada desde el frontend** de las opciones (nuevas funciones en el cliente API y tipos), con estados de carga, error y degradación si el origen no está disponible.

## Capabilities

### New Capabilities
<!-- Ninguna: la funcionalidad se integra en capacidades existentes (estaciones y web). -->

### Modified Capabilities
- `stations`: la API expone ahora tres nuevos recursos consultables (países, idiomas y géneros del catálogo) además de la búsqueda de emisoras.
- `web-ui`: los filtros de país, idioma y género de la exploración pasan de texto libre a controles combobox con búsqueda, alimentados por el catálogo.

## Impact

- **API** (`apps/api`): nuevas rutas en `routes/stations.ts`, llamadas nuevas al cliente de radio-browser (`services/radiobrowser.ts`), lógica de lista/distinción en `services/stations.ts`, caché existente reutilizada, y documentación OpenAPI/Swagger actualizada.
- **Web** (`apps/web`): `pages/Explore.tsx` (filtros), tipos y cliente API (`lib/types.ts`, `lib/api.ts`), nuevo componente reutilizable de combobox con búsqueda (`components/`).
- **Especificaciones**: deltas de `stations` y `web-ui`.
- Sin cambios de esquema de base de datos ni de despliegue.