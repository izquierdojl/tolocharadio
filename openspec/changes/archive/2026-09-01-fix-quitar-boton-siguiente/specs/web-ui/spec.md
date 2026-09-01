## MODIFIED Requirements

### Requirement: Reproductor flotante persistente
La interfaz SHALL mostrar un reproductor fijo en la parte inferior, visible en todas las vistas mientras haya una sesión abierta, que muestre la emisora en reproducción (o la última seleccionada) con controles de reproducir/pausar, volumen y eliminar/cambiar emisora. Cuando haya una emisora seleccionada, el reproductor SHALL mostrar la información técnica de la emisora (bitrate y formato/códec de audio, cuando estén disponibles) y SHALL ofrecer un botón para copiar el enlace de emisión al portapapeles. La reproducción SHALL continuar al cambiar de vista. En pantallas de smartphones (menores de 640px), el reproductor SHALL simplificarse: se oculta el botón de copiar enlace y la información técnica (bitrate/codec), mostrando únicamente la miniatura, el nombre de la emisora, país/idioma, y los controles de play/pause y stop. El control de volumen ya se oculta en este rango de pantalla.

#### Scenario: Reproductor siempre disponible
- **WHEN** un usuario navega entre secciones con el reproductor activo
- **THEN** el reproductor permanece visible y la música no se interrumpe

#### Scenario: Controles del reproductor
- **WHEN** un usuario usa reproducir, pausar o el control de volumen
- **THEN** el reproductor responde de inmediato reflejando el nuevo estado

#### Scenario: Sin nada que reproducir
- **WHEN** el usuario no ha seleccionado ninguna emisora en la sesión
- **THEN** el reproductor aparece en estado vacío o minimizado sin reproducir nada, sin mostrar información técnica

#### Scenario: Información técnica disponible
- **WHEN** una emisora seleccionada en el reproductor tiene bitrate y formato/códec de audio
- **THEN** el reproductor muestra tanto el bitrate (p. ej. "128 kbps") como el formato de audio (p. ej. "MP3", "AAC")

#### Scenario: Información técnica ausente
- **WHEN** la emisora seleccionada en el reproductor no dispone de bitrate o de formato/códec
- **THEN** el reproductor omite el dato faltante y sigue mostrando el resto de la información sin romper el diseño

#### Scenario: Copiar enlace de emisión
- **WHEN** un usuario pulsa el botón de copiar enlace de emisión en el reproductor
- **THEN** la aplicación copia al portapapeles la URL pública del stream de la emisora (`station.url`) y confirma visualmente que se ha copiado

#### Scenario: Reproductor simplificado en móvil
- **WHEN** un usuario ve el reproductor en una pantalla menor a 640px de ancho
- **THEN** el reproductor muestra únicamente la miniatura de la emisora, el nombre, país/idioma, y los controles play/pause y stop, sin botón de copiar enlace ni información técnica (bitrate/codec)

#### Scenario: Estado vacío del reproductor en móvil
- **WHEN** el usuario no ha seleccionado ninguna emisora y ve la aplicación en una pantalla menor a 640px
- **THEN** el reproductor muestra un mensaje conciso de una línea invitando a elegir una emisora
