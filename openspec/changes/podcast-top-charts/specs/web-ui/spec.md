# Spec Delta

## ADDED Requirements

### Requirement: Sección «Populares» en la búsqueda de podcasts
Cuando la caja de búsqueda de podcasts esté vacía y el descubrimiento externo esté habilitado, la pantalla de búsqueda SHALL mostrar la sección «Populares» con el ranking del país seleccionado, reutilizando las tarjetas de resultado y la acción de suscripción existentes. El país por defecto SHALL ser España y la elección de país y categoría SHALL recordarse en el navegador. Al escribir un término, la sección SHALL dar paso a los resultados de búsqueda.

#### Scenario: Populares con la búsqueda vacía
- **WHEN** un usuario abre la búsqueda de podcasts sin haber elegido país antes
- **THEN** se muestra «Populares» con el ranking de España y se puede suscribir a cualquier elemento

#### Scenario: Cambio de país recordado
- **WHEN** un usuario elige otro país en el selector y recarga la página
- **THEN** «Populares» muestra el ranking del país elegido

#### Scenario: Filtro por categoría no disponible
- **WHEN** el ranking por categoría responde con error
- **THEN** la sección muestra un aviso discreto, mantiene el ranking general y la búsqueda manual sigue operativa

#### Scenario: Descubrimiento deshabilitado
- **WHEN** el servidor tiene el descubrimiento externo deshabilitado
- **THEN** la sección «Populares» no se muestra
