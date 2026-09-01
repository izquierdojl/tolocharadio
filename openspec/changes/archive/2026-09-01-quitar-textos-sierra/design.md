## Context

La interfaz de TolochaRadio contiene 6 textos visibles que mencionan "sierra" (PlayerBar, History, Register, Login, Explore, Home). El usuario quiere textos más genéricos sin florituras. No hay cambios de comportamiento ni de specs — solo strings literales.

## Goals / Non-Goals

**Goals:**
- Reemplazar los 6 textos que mencionan "sierra" por alternativas genéricas
- Mantener el tono y claridad de los mensajes

**Non-Goals:**
- Renombrar componentes (`SierraEmblem`, `SierraIllustration`)
- Modificar el SVG ni la identidad visual
- Cambiar requerimientos de specs existentes

## Decisions

**D1. Reemplazo directo de strings literales**
Cada archivo contiene un único string con "sierra". Se sustituye el string completo por una versión genérica, sin refactorizar componentes ni extraer constantes.

Razón: El cambio es cosmético y aislado. No hay reuse entre los textos — cada uno es un mensaje contextual diferente.

## Risks / Trade-offs

- [Riesgo] Textos nuevos puedan perder contexto o sonarForKeya → Se redactan manteniendo la intención original de cada mensaje.
