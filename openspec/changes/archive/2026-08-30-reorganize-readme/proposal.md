## Why

El `README.md` actual es un volcado técnico de 179 líneas (arquitectura, variables de entorno, endpoints, versionado...). Como portada del repositorio, lo que se ve al entrar en GitHub es demasiado denso y no comunica de un vistazo qué es TolochaRadio, que es exactamente lo que sí logra la página principal de la web.

## What Changes

- Reemplazar `README.md` por una portada breve: nombre + tagline, descripción de una frase (parafraseando la página de inicio de la web), un grafismo inspirado en la Sierra de Tolocha, la lista resumida de capacidades y enlaces a las páginas internas.
- Crear una documentación interna en `docs/`, enlazada desde el README, que absorba el contenido técnico actual organizado por temas:
  - Instalación y desarrollo local (requisitos, arranque, variables de entorno, migraciones).
  - Despliegue con Docker y GHCR.
  - Uso de la aplicación (cuentas, favoritos, historial, exploración, reproducción).
  - Referencia de la API (endpoints, OpenAPI, formato de errores).
  - Arquitectura del monorepo.
  - Desarrollo y release (comandos raíz, versión automática, CI/CD).
  - Licencia.
- Mantener los contenidos sin alterar su significado: solo se reorganiza dónde vive cada cosa; no cambia comportamiento, API ni flujos.

## Capabilities

### New Capabilities

Sin capacidades nuevas. Es un cambio únicamente de documentación (estructura de archivos markdown), sin efectos en comportamiento.

### Modified Capabilities

Ninguna. No cambia ningún requisito a nivel de spec; por eso `.openspec.yaml` declara `skip_specs: true`.

## Impact

- **Ficheros**: `README.md` (reescrito) y nuevos `docs/*.md`. No se toca código de `apps/`, `scripts/` ni `openspec/specs/`.
- **Referencias existentes**: hay que revisar que cualquier enlace externo al README o a sus anclas siga siendo válido o se actualice (p. ej. referencias en issues, workflows o el propio `AGENTS.md`).
- **Sin impacto** en API, dependencias, build ni runtime.