## Purpose

Define el contrato público de la API REST de TolochaRadio para que otras aplicaciones propias puedan consumirla: versionado, documentación OpenAPI/Swagger accesible, formato de errores estándar y acceso con token JWT.

## ADDED Requirements

### Requirement: API versionada
El sistema SHALL exponer la API bajo un prefijo de versión (`/api/v1`) de modo que cambios incompatibles se introduzcan en versiones nuevas sin romper clientes existentes.

#### Scenario: Acceso mediante prefijo de versión
- **WHEN** un cliente llama a un endpoint de la API usando el prefijo de versión actual
- **THEN** el sistema procesa la solicitud según el comportamiento de esa versión

#### Scenario: Ruta desconocida
- **WHEN** un cliente llama a una ruta inexistente o un prefijo de versión no soportado
- **THEN** el sistema responde con un error 404 en el formato estándar

### Requirement: Documentación OpenAPI accesible
El sistema SHALL servir documentación OpenAPI (Swagger UI) de la API en una ruta pública, incluyendo todos los endpoints, parámetros, esquemas de respuesta y requisitos de autenticación.

#### Scenario: Consulta de la documentación
- **WHEN** un cliente accede a la ruta de documentación de la API
- **THEN** el sistema muestra la interfaz Swagger con todos los endpoints documentados y sus esquemas

#### Scenario: Spec OpenAPI descargable
- **WHEN** un cliente solicita el documento JSON/YAML de la especificación
- **THEN** el sistema entrega la especificación OpenAPI completa

### Requirement: Formato de errores estándar
Todos los errores de la API SHALL devolverse en un formato JSON consistente que incluya un código, un mensaje legible y el estado HTTP correspondiente.

#### Scenario: Respuesta de error estructurada
- **WHEN** un endpoint responde con un error
- **THEN** el cuerpo es JSON con código, mensaje y estado HTTP, coherente para todos los errores de la API

### Requirement: Acceso autenticado con JWT
Los endpoints protegidos de la API SHALL ser accesibles para aplicaciones externas mediante token JWT de acceso en la cabecera de autorización (`Bearer`), igual que el frontend.

#### Scenario: Aplicación externa autenticada
- **WHEN** una aplicación externa envía un token JWT de acceso válido a un endpoint protegido
- **THEN** el sistema atiende la solicitud y devuelve los datos correspondientes al usuario del token

#### Scenario: Aplicación externa sin credenciales
- **WHEN** una aplicación externa llama a un endpoint protegido sin token o con token inválido
- **THEN** el sistema responde con un error 401

### Requirement: CORS configurable
El sistema SHALL permitir configurar los orígenes (CORS) que pueden consumir la API, con un valor por defecto que permita al propio frontend y, cuando se configure, a aplicaciones externas.

#### Scenario: Origen permitido
- **WHEN** un navegador de un origen permitido llama a la API
- **THEN** la respuesta incluye las cabeceras CORS que permiten la lectura de la respuesta

#### Scenario: Origen no permitido
- **WHEN** un navegador de un origen no incluido en la configuración llama a la API
- **THEN** la respuesta no autoriza al origen a leer la respuesta