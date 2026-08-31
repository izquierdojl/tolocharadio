## Why

El proyecto es público pero no existe ningún enlace al repositorio desde la propia aplicación. Añadir un icono de GitHub en un lugar visible permite a cualquier persona (oyente o desarrollador) llegar al código fuente con un solo clic.

## What Changes

- **Icono de GitHub en la cabecera**: se añade un enlace con el icono de GitHub (de `lucide-react`) a `https://www.github.com/izquierdojl/tolocharadio`.
- **Visible para todos**: el enlace se muestra tanto para usuarios autenticados como invitados, en todas las vistas, sin necesidad de rama ni cambios de backend.

**Supuestos (decisión de alcance)**:
- El "lugar más conveniente" es la cabecera de la aplicación (`AppShell`), siempre visible, junto al resto de controles.
- El enlace abre el repositorio en una pestaña nueva (`target="_blank"` con `rel="noopener noreferrer"`).
- Se usa el icono `Github` de `lucide-react`, ya empleado en el proyecto, sin añadir dependencias.
- Cambio puramente de interfaz: no toca la API, no requiere migraciones ni cambios de configuración, y no necesita rama propia.

## Capabilities

### New Capabilities
<!-- Ninguna: la funcionalidad se integra en la capacidad web existente. -->

### Modified Capabilities
- `web-ui`: se añade un requisito para mostrar un enlace al repositorio de GitHub de la aplicación, visible en la cabecera para todos los usuarios.

## Impact

- **Web** (`apps/web`): modificación del componente `components/AppShell.tsx` (cabecera) para añadir el enlace con el icono de GitHub.
- **Especificaciones**: delta de `web-ui` (nuevo requisito).
- **Sin cambios de API** (`apps/api`): ningún endpoint, esquema o migración se ve afectado.
- **Sin dependencias nuevas**: se reutiliza `lucide-react`.