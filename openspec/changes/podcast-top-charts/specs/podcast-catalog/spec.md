# Spec Delta

## ADDED Requirements

### Requirement: Ranking de podcasts populares por país
El endpoint autenticado `GET /api/v1/podcasts/top?country=&limit=` SHALL devolver el ranking de podcasts más populares del directorio de Apple para el país indicado (código ISO de dos letras, `es` por defecto), con el mismo formato normalizado que la búsqueda (título, autor, portada, `feedUrl`, categorías) y en orden de posición. El `limit` SHALL acotarse a un máximo de 100. Los programas cuyo `feedUrl` no pueda resolverse SHALL omitirse.

#### Scenario: Ranking general de España por defecto
- **WHEN** un usuario autenticado llama a `GET /api/v1/podcasts/top` sin parámetros
- **THEN** el servidor devuelve el ranking de España ordenado por posición, con `feedUrl` en cada elemento

#### Scenario: Ranking de otro país
- **WHEN** un usuario autenticado llama a `GET /api/v1/podcasts/top?country=mx`
- **THEN** el servidor devuelve el ranking de México

#### Scenario: País no válido
- **WHEN** un usuario llama a `GET /api/v1/podcasts/top?country=xyz`
- **THEN** el servidor responde con un error de validación sin consultar a Apple

### Requirement: Ranking de podcasts filtrado por categoría
El endpoint `GET /api/v1/podcasts/top` SHALL aceptar un parámetro opcional `genre` con el identificador de categoría de Apple para devolver el ranking de esa categoría en el país indicado. Si el origen del ranking por categoría no está disponible, el servidor SHALL responder con un error controlado `DISCOVERY_UNAVAILABLE` sin afectar al ranking general ni a la búsqueda.

#### Scenario: Ranking por categoría
- **WHEN** un usuario autenticado llama a `GET /api/v1/podcasts/top?country=es&genre=1303`
- **THEN** el servidor devuelve el ranking de la categoría indicada en España

#### Scenario: Origen por categoría caído
- **WHEN** el origen del ranking por categoría falla o no responde
- **THEN** el servidor responde con `DISCOVERY_UNAVAILABLE` y el ranking general y la búsqueda siguen funcionando

### Requirement: Caché y dependencia del proveedor en el ranking
El servidor SHALL cachear en memoria cada ranking por combinación de país, categoría y límite durante varias horas. El ranking SHALL estar disponible únicamente con `PODCAST_DISCOVERY_PROVIDER=itunes`: con `none` SHALL responder `DISCOVERY_DISABLED` y con `podcastindex` SHALL responder con un error controlado indicando que el ranking no está soportado por ese proveedor.

#### Scenario: Petición repetida servida desde caché
- **WHEN** dos usuarios piden el mismo ranking (país, categoría y límite) dentro del periodo de caché
- **THEN** el servidor consulta a Apple una sola vez y sirve el segundo resultado desde caché

#### Scenario: Descubrimiento deshabilitado
- **WHEN** un usuario llama a `GET /api/v1/podcasts/top` con `PODCAST_DISCOVERY_PROVIDER=none`
- **THEN** el servidor responde con `DISCOVERY_DISABLED`

#### Scenario: Proveedor sin soporte de ranking
- **WHEN** un usuario llama a `GET /api/v1/podcasts/top` con `PODCAST_DISCOVERY_PROVIDER=podcastindex`
- **THEN** el servidor responde con un error controlado de ranking no soportado
