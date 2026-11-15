# Spec Delta

## ADDED Requirements

### Requirement: Configuración pública de capacidades y límites
El endpoint público `GET /api/v1/config` SHALL exponer, además de `appName` y `registrationEnabled`, la versión de la aplicación (`version`), la versión de contrato (`apiVersion: 1`), el mapa de capacidades (`features`), los límites operativos (`limits`) y los tiempos de vida públicos de autenticación (`auth`). La respuesta NO SHALL incluir secretos, claves de API ni rutas internas del servidor.

#### Scenario: Consulta de capacidades con podcasts habilitados
- **WHEN** un cliente consulta `GET /api/v1/config` en un servidor con podcasts habilitados y proveedor `itunes`
- **THEN** recibe `200 OK` con `features.radio: true`, `features.podcasts: true`, `features.podcastDiscovery: "itunes"`, los límites configurados en `limits` y los TTL en segundos en `auth`

#### Scenario: Consulta de capacidades con podcasts deshabilitados
- **WHEN** un cliente consulta `GET /api/v1/config` cuando `PODCASTS_ENABLED=false`
- **THEN** recibe `200 OK` con `features.podcasts: false` sin exponer claves ni configuración sensible
