## Context

Ver proposal.md — Why. Estado actual: `App.tsx` monta `AppShell` con la exploración pública en `/` (sin guarda), favoritos/historial/perfil bajo `RequireAuth` (redirige a `/login`) y `/login` + `/registro` públicos. `AppShell` muestra la nav («Explorar» apunta a `/`) y un botón «Entrar» cuando el usuario es invitado. La reproducción exige sesión por backend (registra historial) y se mantiene sin cambios.

## Goals / Non-Goals

**Goals:**
- Portada de inicio pública y temática en `/` que invite a entrar/registrarse.
- Mover la exploración (rejilla + búsqueda/filtros) a `/explorar`, solo accesible con sesión.
- Cero cambios de API: la guarda depende del estado de sesión del frontend.

**Non-Goals:**
- No tocar el streaming/reproducción ni el historial (siguen exigiendo sesión).
- No cambiar el backend, la base de datos ni el despliegue.
- No rediseñar el resto de secciones.

## Decisions

### D1. Mapa de rutas: portada en `/`, exploración en `/explorar`
- `/` → nueva página `Home` (pública); `/explorar` → `Explore` envuelta en `RequireAuth`; `RequireAuth` redirige a `/` (portada) en lugar de `/login` para que el invitado caiga en el mensaje temático y desde ahí entre o se registre.
- Alternativa a `/` condicional (portada si invitado, exploración si autenticado) se descartó: confunde la dirección "/", complica el `RequireAuth` y no marca un punto de entrada comercial claro.

### D2. Portada con temática de la Sierra de Tolocha
- Nueva `pages/Home.tsx` montada dentro del `AppShell`, coherente con el ancho máximo (`max-w-6xl`) del resto de páginas.
- Elementos: titular + subtítulo de la sierra, ilustración SVG temática (montañas/cerros, ondas de radio, paleta pine/ochre ya usada en `MountainWall` y `Logo`), y una tarjeta de llamada a la acción: si el usuario es invitado → enlaces destacados a `/login` y `/registro`; si tiene sesión → enlace «Explorar emisoras» a `/explorar`.
- La portada respeta el estado `loading` de la sesión: muestra el contenido estable e intercambia el CTA cuando `status` deja de ser `loading`.

### D3. Navegación y forward de invitados
- Nav «Explorar» (`NAV_ITEMS`) pasa a `/explorar`. Se conserva el logo a `/`.
- Si un invitado cae en `/explorar` (por URL directa o enlace), `RequireAuth` lo redirige a `/`; desde ahí, «Entrar» lleva a `/login`.

## Risks / Trade-offs

- Requiere tocar el `status` de sesión (`loading`/`authenticated`/`guest`): la portada difiere según autenticación. → Mostrar la portada completa siempre; el CTA condicional se resuelve cuando `status !== "loading"`.
- Cambio de ruta pública a protegida (`/` → `/` portada, `/explorar` protegida): eventuales enlaces externos/guardados a la exploración dejarán de ser públicos. → Aceptado: es el objetivo del change; `RequireAuth` lo deriva a la portada.