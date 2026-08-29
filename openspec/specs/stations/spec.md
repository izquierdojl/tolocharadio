# Stations Specification

## Purpose

Provee el catálogo de emisoras de radio de TolochaRadio, obteniéndolo de la API pública de radio-browser.info con un identificador fijo de aplicación, normalizando los datos y aportando búsqueda, filtrado y detalle con caché y degradación ante fallos.

## Requirements

### Requirement: Listado de países, idiomas y géneros del catálogo
El sistema SHALL exponer los países, los idiomas y los géneros (tags de tipo de emisora) disponibles en el catálogo como listas consultables por separado, sin valores duplicados ni vacíos, y con la misma política de caché y degradación que la búsqueda de emisoras. Los países y los idiomas se devuelven ordenados alfabéticamente; los géneros se devuelven ordenados por número de emisoras asociadas (de mayor a menor), de modo que los géneros más populares aparezcan primero.

#### Scenario: Conjunto de opciones disponible
- **WHEN** un cliente consulta el listado de países, de idiomas o de géneros del catálogo
- **THEN** el sistema devuelve una lista sin duplicados ni valores vacíos de las opciones disponibles —los países e idiomas ordenados alfabéticamente y los géneros por popularidad (más emisoras primero)—

#### Scenario: Filtrado de búsqueda por género
- **WHEN** un cliente busca emisoras indicando un género
- **THEN** el sistema devuelve únicamente emisoras cuyo tipo coincide con el género indicado

#### Scenario: Origen no disponible con caché
- **WHEN** radio-browser.info no responde pero existe una copia en caché del listado
- **THEN** el sistema sirve el listado desde caché, sin interrumpir el servicio

#### Scenario: Origen no disponible sin caché
- **WHEN** radio-browser.info no responde y no existe caché del listado
- **THEN** el sistema responde con un error 503 indicando que el catálogo no está disponible