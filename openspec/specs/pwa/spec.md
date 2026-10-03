## Purpose

Permitir instalar TolochaRadio como aplicación separada en navegadores Chromium (Chrome, Edge) con ventana propia, arranque rápido y textos en español.

## Requirements

### Requirement: Manifest instalable
El sistema SHALL exponer un `manifest.webmanifest` en mismo origen con nombre, `short_name`, `start_url`, `scope`, `display: standalone` y colores Tolocha.

#### Scenario: Manifest enlazado y válido
- **WHEN** el usuario carga cualquier página de la app
- **THEN** el HTML incluye `<link rel="manifest">` y el manifest responde 200 con `Content-Type` de manifest

#### Scenario: Criterio de instalabilidad Chromium
- **WHEN** se audita la app con DevTools/Lighthouse en HTTPS o localhost
- **THEN** el panel de instalación reconoce manifest válido, iconos 192/512 y Service Worker con `fetch`

### Requirement: Iconos de instalación derivados de la marca
El sistema SHALL proveer iconos PNG 192 y 512 derivados del SVG actual más un maskable 512 con zona segura y `apple-touch-icon` 180.

#### Scenario: Iconos presentes y referenciados
- **WHEN** se solicita el manifest o se instala la app
- **THEN** cada icono declarado responde 200 y el icono instalado muestra la montaña y el sol Tolocha sin recortes críticos

#### Scenario: Maskable con zona segura
- **WHEN** el SO aplica máscara circular o squircle al icono maskable
- **THEN** el motivo central sigue visible (márgenes de seguridad respetados)

### Requirement: Service Worker solo-cáscara seguro para multimedia
El sistema SHALL registrar un Service Worker en scope `/` que precachea solo la cáscara (HTML/CSS/JS versionados) y deja `/api/*` y audio externo siempre en red sin cachear.

#### Scenario: Arranque con shell cacheada
- **WHEN** el usuario abre la app instalada con red disponible tras una segunda visita
- **THEN** la cáscara carga desde caché y los datos se piden a red

#### Scenario: API y audio nunca cacheados
- **WHEN** la app pide `/api/v1/*` o un stream de emisora
- **THEN** la petición va a red y nada de esa respuesta queda en caché del SW

#### Scenario: SW no rompe la SPA
- **WHEN** el usuario navega a `/favoritos` o recarga con el SW activo
- **THEN** el fallback sirve `index.html` y el router resuelve la vista

### Requirement: Metadatos de instalación y tema
El sistema SHALL declarar `theme_color` y `background_color` Tolocha, viewport móvil e icono Apple para una ventana instalada coherente.

#### Scenario: Ventana standalone tematizada
- **WHEN** el usuario instala y abre la app en modo standalone
- **THEN** la barra/splash usa los colores Tolocha y no aparece chrome de pestaña

#### Scenario: Textos en español
- **WHEN** el SW muestra aviso de actualización o la app muestra nombre/short_name
- **THEN** todos los textos visibles están en español
