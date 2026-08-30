## Context

La web de TolochaRadio es React 19 + Vite + Zustand + TanStack Query + Tailwind v4 (`index.css` usa `@import "tailwindcss"` y `@theme` con la paleta `pine`/`ochre`/`moss`). Actualmente el tema es fijo en oscuro: `:root { color-scheme: dark }`, `body` usa `--color-pine-950` y las superficies aplican hardcode `bg-pine-*`/`text-pine-*` (ver `index.css:35-56`, `AppShell.tsx`, `Explore.tsx`, etc.). No hay selector de tema ni preferencias por usuario.

La API es Express 5 + Drizzle/better-sqlite3. La tabla `users` (`db/schema.ts:3-9`) tiene `id, email, passwordHash, name, createdAt` y `PublicUser` (`config/env.ts:104-109`) no incluye ninguna preferencia. El perfil se expone vía `GET /users/me` y se modifica con `PATCH /users/me` (`routes/users.ts`). Las migraciones Drizzle viven en `apps/api/drizzle/` y se generan con `npm run db:generate` (drizzle-kit) y se aplican en arranque vía `applyMigrations`.

Motivación y comportamiento esperado: ver `proposal.md` y los deltas de `auth` y `web-ui` en `specs/`.

## Goals / Non-Goals

**Goals:**
- Persistir por usuario una preferencia de tema (`light` | `dark`) en la API y exponerla/actualizarla por el perfil autenticado.
- Ofrecer en la web un control de tema claro/oscuro que aplique la paleta Tolocha en ambos modos, con oscuro por defecto.
- Recordar la preferencia: por el perfil cuando hay sesión (prioridad) y por dispositivo (localStorage) para invitados.

**Non-Goals:**
- No se añade un selector de tema «sistema» (follow OS) en esta iteración: solo light/dark explícito.
- No se cambia el modelo de emisoras/favoritos/historial ni el proxy de playback.
- No se introducen dependencias nuevas (CSS-vars de Tailwind v4 + Zustand son suficientes).

## Decisions

### DEC1. Columna `theme` en `users` (Drizzle) con valor por defecto `dark`
Se añade `theme: text("theme").notNull().default("dark")` a `users` en `db/schema.ts` y se genera una migración con `npm run db:generate`. `PublicUser` se amplía con `theme: "light" | "dark"`. `toPublicUser()` en `services/auth.ts` incluye el campo, de modo que login/register/refresh/me devuelven la preferencia sin cambios adicionales de consulta.

*Alternativas:* tabla `user_preferences` (clave-valor). Se descarta por simplicidad: es una única preferencia incipiente; si el patrón creciera, se migraría luego. Columna con `DEFAULT 'dark'` garantiza el comportamiento «nuevo usuario → dark» descrito en el spec de `auth`.

### DEC2. Actualización por `PATCH /users/me` (reutilizando la ruta existente)
Se amplía el `updateNameSchema` de `routes/users.ts` a aceptar opcionalmente `theme` (enum `light`/`dark` via Zod) además de `name`, validando que el cuerpo tenga al menos un campo válido. `AuthService` gana `updateProfile(userId, { name?, theme? })` que aplica SOLO los campos presentes y devuelve el `PublicUser` actualizado. Se mantiene `changeName` para no romper llamadas existentes, pero la ruta podría delegar en `updateProfile`.

*Alternativas:* un endpoint dedicado `PATCH /users/me/theme`. Se descarta: `/users/me` ya es el recurso de perfil y Zod permite un patch parcial limpio; evita rutas redundantes y coincide con `web-ui` «la nueva preferencia se envía a la API».

### DEC3. Store de tema en el frontend (Zustand) + persistencia local
Nuevo `apps/web/src/stores/theme.ts`: estado `{ theme: "light" | "dark" }` con `setTheme`. La resolución del tema inicial es: (1) si hay sesión y el perfil trae `theme`, ese gana; (2) si no, lo que haya en `localStorage["tolocha:theme"]`; (3) si no, `dark` (por defecto). Al cambiar con sesión abierta se llama a `PATCH /users/me { theme }` (disparo ignora errores transitorios y sigue aplicando el tema local) y se actualiza el store de auth; al cambiar sin sesión se escribe solo en `localStorage`.

Se sincroniza con `useAuthStore`: al `restore()`/`login()`/`register()` que dejan el perfil en el store, un efecto (en `App.tsx` o `main.tsx`) aplica `user.theme` si está presente, y persigue el caso «la preferencia del perfil tiene prioridad» del spec.

*Alternativas:* incorporar `theme` al store `auth` existente. Se descarta para separar la responsabilidad de presentación (tema) de la identidad (auth); la sincronización se hace explícita por `setUser`.

### DEC4. Temas vía variables CSS y utilidades semánticas (Tailwind v4), no clases estáticas oscuras
El código actual usa colores `pine-*` hardcode que sirven solo para oscuro. Para soportar dos temas sin reescribir cada componente, la web aplicará el tema añadiendo una clase/atributo document (`data-theme="light|dark"`) y se reutilizarán variables CSS de Tailwind (`@theme`) para que la mayoría de superficies hereden de tokens. Concretamente:
- `index.css` define variables de superficie/texto por tema (p. ej. `--surface`, `--surface-soft`, `--text`, `--text-muted`, `--border`) bajo `:root[data-theme="dark"]` y `:root[data-theme="light"]`, y mapea utilidades genéricas (`bg-surface`, `text-foreground`, etc.) vía `@theme` + `@layer`.
- Se auditan las clases `bg-pine-*`/`text-pine-*` más críticas (AppShell, tarjetas, reproductor, formularios) y se sustituyen por esas utilidades semánticas donde el contraste cambia entre temas; los colores de acento Tolocha (ochre/pino) se conservan como acentos en ambos temas.
- `color-scheme` se ajusta según `data-theme` para que los controles nativos (scrollbars, inputs) se rendericen en el modo correcto.

El oscuro mantiene la paleta actual (pine-950 etc.) para no alterar el look existente; el claro usa variantes claras de la misma familia (fondos `pine-50`/`pine-100`, texto `pine-900`) para conservar la identidad Tolocha.

*Alternativas:* usar la variante `dark:` de Tailwind (oscura por defecto y activar `dark` en un wrapper). Se descarta porque el proyecto está construido «en oscuro por defecto» y migrar todo a variantes `dark:` sería un cambio enorme; el enfoque de tokens semánticos es menos invasivo y centraliza el contraste.

### DEC5. Control de alternancia en el menú del usuario (avatar)
El toggle (icono Sol/Luna de `lucide-react`, `aria-label`/`title` en español «Cambiar tema») se integra como una opción más dentro del menú desplegable que se abre al pinchar sobre el avatar/nombre del usuario autenticado en la cabecera (`AppShell.tsx`). Así, la preferencia de presentación vive junto al resto de «preferencias de perfil», separada de la navegación y del control de sesión.

Para invitados (sin sesión), el toggle se muestra fuera de ese menú: visible directamente en la cabecera (p. ej. junto al botón «Entrar»), para que también puedan elegir tema aunque no tengan perfil. En ambos casos el control aplica `document.documentElement.dataset.theme` y el estado del store (DEC3).

*Alternativas:* botón fijo suelto en la cabecera (siempre visible). Se matiza a petición del usuario: con sesión se prefiere dentro del menú de usuario por coherencia con las preferencias; queda accesible igualmente para invitados sin ese menú.

### DEC6. Aplicación inicial del tema y destello (flash)
Para evitar un `flash of wrong theme` al recargar, `main.tsx` lee el tema inicial (perfil no disponible aún en el primer render → usa localStorage o `dark`) y fija `data-theme` en `<html>` antes de montar la app; cuando `restore()` resuelve el perfil con `theme`, si difiere se re-aplica (DEC3).

## Risks / Trade-offs

- [Migración de esquema en BD existente] → Mitigación: columna con `DEFAULT 'dark'` (backfill automático de usuarios previos); se aplica en arranque y el despliegue es monolítico (`docker compose up --build -d`), sin downtime.
- [Amplio barrido de clases `bg-pine-*`/`text-pine-*` para asegurar contraste en claro] → Mitigación:DEC4 centraliza en tokens semánticos y limita el repaso a superficies/componentes críticos; se valida visualmente en ambos temas antes de cerrar.
- [Preferencia de perfil desactualizada vs. local en sesiones al vuelo] → Mitigación: el efecto de sincronización (DEC3) aplica siempre `user.theme` al resolver sesión; el guardado es optimista (aplica local y envía por red).
- [Flash de tema incorrecto] → Mitigación: DEC6 fija `data-theme` antes del primer render.

## Migration Plan

1. `npm run db:generate` en `apps/api` → nueva migración (columna `theme` con default `dark`); se aplica automáticamente al arrancar (`applyMigrations`).
2. Backend: `PublicUser` + `toPublicUser` + `updateProfile`/`PATCH /users/me` + OpenAPI.
3. Frontend: store de tema, utilidades semánticas y `ThemeToggle` en la cabecera.
4. Despliegue monolítico en un paso: `docker compose up --build -d` + smoke.
5. Rollback: al ser un único contenedor, revertir el despliegue restaura el código; la columna extra es inofensiva para la versión anterior (ignorada).

## Open Questions

- ¿Soportar un tercer estado «seguir el sistema» en el futuro? Se decide explícitamente no en esta iteración (Non-Goals); añadirlo después no cambia specs ni arquitectura (es un mapeo más en DEC3/DEC4).
