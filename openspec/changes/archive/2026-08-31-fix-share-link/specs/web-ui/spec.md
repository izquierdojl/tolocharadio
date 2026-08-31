## MODIFIED Requirements

### Requirement: Reproductor flotante persistente
La interfaz SHALL mostrar un reproductor fijo en la parte inferior, visible en todas las vistas mientras haya una sesión abierta, que muestre la emisora en reproducción (o la última seleccionada) con controles de reproducir/pausar, siguiente, volumen y eliminar/cambiar emisora. Cuando haya una emisora seleccionada, el reproductor SHALL mostrar la información técnica de la emisora (bitrate y formato/códec de audio, cuando estén disponibles) y SHALL ofrecer un botón para copiar el enlace de emisión al portapapeles. La reproducción SHALL continuar al cambiar de vista.

#### Scenario: Copiar enlace de emisión
- **WHEN** un usuario pulsa el botón de copiar enlace de emisión en el reproductor
- **THEN** la aplicación copia al portapapeles la URL pública del stream de la emisora (`station.url`) y confirma visualmente que se ha copiado
