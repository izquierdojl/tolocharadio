## Purpose

Permite escuchar las emisoras en el navegador mediante un proxy de audio del backend que retransmite el stream de la emisora, evitando bloqueos por mixed-content y problemas de CORS. El reproductor del cliente mantiene la reproducción de forma persistente.

## ADDED Requirements

### Requirement: Proxy de streaming por la API
El sistema SHALL exponer un endpoint de streaming por el que el cliente reproduce el audio de una emisora: la API retransmite el stream desde la URL del origen hacia el cliente, sirviéndolo sobre HTTPS con los mismos tipos de contenido de audio.

#### Scenario: Reproducción vía proxy
- **WHEN** un cliente autenticado solicita el stream de una emisora válida mediante el endpoint de streaming
- **THEN** la API retransmite el flujo de audio desde la URL de la emisora al cliente con los tipos de contenido de audio adecuados

#### Scenario: Stream sobre HTTPS seguro
- **WHEN** la URL de origen de la emisora usa HTTP
- **THEN** el flujo llega al cliente a través de la API en HTTPS, sin bloqueos de mixed-content

#### Scenario: Emisora sin stream o sin acceso
- **WHEN** un cliente solicita el stream de una emisora sin URL válida o que no puede reproducirse
- **THEN** el sistema responde con un error de audio/no disponible (4xx/5xx según el caso) y mensaje claro

### Requirement: Descubrimiento de reproducción
El cliente SHALL poder comprobar si una emisora es reproducible antes de iniciar la escucha, consultando el estado de disponibilidad de su stream.

#### Scenario: Verificación de disponibilidad
- **WHEN** el cliente consulta la disponibilidad de stream de una emisora
- **THEN** el sistema devuelve si la emisora es reproducible y, si no lo es, el motivo

### Requirement: Reproducción persistente en el cliente
El reproductor del frontend SHALL mantener la emisora sonando y su estado (emisora actual, reproduciendo/pausado, volumen) aunque el usuario navegue entre vistas de la aplicación.

#### Scenario: La música continúa al navegar
- **WHEN** un usuario está reproduciendo una emisora y navega a otra sección
- **THEN** la emisora sigue sonando y el reproductor muestra la misma emisora y estado

#### Scenario: Control de reproducción
- **WHEN** un usuario usa los controles del reproductor flotante
- **THEN** el sistema inicia, pausa o cambia el volumen/emisora de forma inmediata