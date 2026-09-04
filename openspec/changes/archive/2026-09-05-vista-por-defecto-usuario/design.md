## Context

Ver `proposal.md` (Why) y los deltas `specs/auth/spec.md` y `specs/web-ui/spec.md` para el contrato de comportamiento.

Estado actual relevante:
- El perfil ya persiste `theme` (`light` | `dark`, defecto `dark`) en `users.theme` con el mismo flujo que se necesita aquí: columna Drizzle + `GET/PATCH /users/me` con Zod + `User.theme` en el frontend (ver `apps/api/src/db/schema.ts`, `apps/api/src/routes/users.ts`, `apps/api/src/services/auth.ts`, `apps/web/src/lib/types.ts`).
- Las migraciones Drizzle viven en `apps/api/drizzle/` y se aplican al arrancar (`apps/api/src/db/migrate.ts`).
- El frontend navega a `/` tras login/registro (`apps/web/src/pages/Login.tsx`, `Register.tsx`) y la portada `/` (`Home.tsx`) hoy muestra un acceso a explorar para autenticados; el cambio la convierte en redirección automática a la vista por defecto.

## Goals / Non-Goals

**Goals:**
- Persistir `defaultView` (`explorar` | `favoritos` | `historial`, defecto `explorar`) en el perfil con el mismo patrón probado de `theme`.
- Selector en `/perfil` con guardado vía `PATCH /users/me` y confirmación visual, todo en español.
- Redirección inicial coherente: tras login/registro y en `/` con sesión, ir a la vista por defecto.

**Non-Goals:**
- No se incluyen más destinos (p. ej. Mis emisoras o Perfil) como vista por defecto.
- No hay copia en `localStorage` ni soporte para invitados: la preferencia vive solo en el perfil autenticado.
- No se cambia el reproductor, favoritos, historial ni el modo de vista tarjeta/lista.

## Decisions

- **Reutilizar el patrón `theme` en lugar de una tabla o endpoint nuevos.** Alternativas: tabla `preferences` o endpoint dedicado. Se descarta porque añade superficie API y joins sin beneficio: `defaultView` es un atributo 1:1 del usuario, igual que `theme`, y cabe en `PATCH /users/me` extendiendo el esquema Zod existente.
- **Columna `users.default_view TEXT NOT NULL DEFAULT 'explorar'`.** Alternativa: columna anulable con `NULL` = sin preferencia. Se descarta porque obliga a tratar `null` en cada lectura; con `NOT NULL + DEFAULT` los usuarios nuevos y los migrados quedan directamente en `explorar`, que es el comportamiento actual.
- **Migración Drizzle generada (`drizzle-kit generate`) aplicada al arrancar.** Alternativa: `ALTER TABLE` manual. Se descarta porque el proyecto ya versiona migraciones en `apps/api/drizzle/` y el arranque las aplica; seguir ese flujo mantiene Docker y entornos locales coherentes.
- **Mapeo único ruta ↔ preferencia en el frontend** (`explorar` → `/explorar`, `favoritos` → `/favoritos`, `historial` → `/historial`, con caída a `/explorar` ante valor ausente o desconocido). Alternativa: lógica repartida en cada pantalla. Se centraliza para que Login, Register y Home compartan el mismo comportamiento y los tests lo cubran una vez.
- **Redirigir `/` con sesión mediante `<Navigate>` en lugar de renderizar la portada.** Alternativa: mostrar la portada con un botón destacado a la vista por defecto. Se descarta porque la petición pide aterrizar directamente en la vista elegida al abrir la web; la portada sigue intacta para invitados.
- **Selector como grupo de radio con guardado explícito (mismo estilo que el formulario de nombre en `Profile.tsx`).** Alternativa: guardado inmediato al cambiar. Se prefiere botón explícito para reutilizar el patrón de `toast` + invalidación de queries ya existente y evitar escrituras accidentales.

## Risks / Trade-offs

- [Riesgo] Usuarios existentes con clientes antiguos que no conocen `defaultView` reciben un campo extra en `GET /users/me` → Mitigación: campo aditivo e ignorable; OpenAPI lo documenta como requerido solo para clientes nuevos.
- [Riesgo] Redirección en `/` sorprende a quien esperaba la portada → Mitigación: solo afecta a autenticados; el logotipo y la navegación siguen permitiendo volver a `/explorar` o a cualquier vista, y el valor por defecto conserva el comportamiento actual.
- [Riesgo] Condición de carrera si el perfil aún carga al decidir la redirección → Mitigación: no redirigir hasta que el estado de auth salga de `loading`; mientras tanto mostrar el estado de carga existente.
- [Compromiso] Sin `localStorage`, la primera carga tras login depende de la respuesta de auth → Aceptado: login/registro ya devuelven el `user` completo, por lo que la redirección es inmediata sin petición extra.

## Migration Plan

1. Añadir la columna con `DEFAULT 'explorar'` y generar la migración Drizzle; verificar que `GET /users/me` devuelve `explorar` para usuarios antiguos.
2. Desplegar backend y frontend juntos (el frontend tolera la ausencia del campo con caída a `/explorar`).
3. Rollback: revertir ambos; la columna extra es inocua y puede eliminarse en una migración posterior si se desea.

## Open Questions

- Ninguna: las opciones quedan fijadas a Explorar/Favoritos/Historial y el valor por defecto a Explorar según la petición.
