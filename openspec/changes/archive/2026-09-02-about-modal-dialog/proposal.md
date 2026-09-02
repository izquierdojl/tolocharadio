## Why

El componente `AboutSection` actual muestra la versión como texto estático dentro de menús desplegables. No ofrece información del proyecto (nombre, descripción, enlace al repositorio) ni un formato reconocible como diálogo "Acerca de". Se necesita un modal dedicado que presente la información típica de un proyecto de software de forma clara y accesible.

## What Changes

- Sustituir la sección estática `AboutSection` por un botón que abre un diálogo modal.
- El modal mostrará: nombre del proyecto, descripción breve, enlace al repositorio en GitHub, versión actual, enlace a la última versión disponible (si hay actualización), y licencia.
- Se reutilizará el hook `useVersionCheck` existente para obtener la versión actual y la última release.
- No se añaden dependencias externas; el modal se implementa con Tailwind y las utilidades existentes del proyecto.

## Capabilities

### New Capabilities
- `about-modal`: Diálogo modal con información del proyecto (nombre, descripción, repo, versión, actualizaciones).

### Modified Capabilities

## Impact

- `apps/web/src/components/AboutSection.tsx` — se reescribe para abrir el modal en lugar de renderizar info inline.
- `apps/web/src/components/AboutModal.tsx` — nuevo componente del diálogo modal.
- `apps/web/src/components/AppShell.tsx` — se actualiza la integración de `AboutSection` (sin cambios de estructura de menús).
- Sin cambios en API ni dependencias.
