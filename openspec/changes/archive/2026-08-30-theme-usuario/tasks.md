## 1. Backend: modelo y API de la preferencia de tema

- [x] 1.1 Añadir columna `theme` a la tabla `users` en `apps/api/src/db/schema.ts` (`text("theme").notNull().default("dark")`), ejecutar `npm run db:generate` en `apps/api` y verificar que genera una migración nueva en `apps/api/drizzle/` con el `ALTER TABLE ... ADD COLUMN theme`
- [x] 1.2 Ampliar `PublicUser` en `apps/api/src/config/env.ts` con `theme: "light" | "dark"` e incluir el campo en `toPublicUser()` de `apps/api/src/services/auth.ts`; verificar con `npm run typecheck` y que `GET /users/me` devuelve `theme` al iniciar una sesión existente
- [x] 1.3 Añadir `AuthService.updateProfile(userId, { name?, theme? })` que aplique solo los campos presentes y devuelva el `PublicUser` actualizado; verificar con un test de servicio o con la llamada desde la ruta
- [x] 1.4 Ampliar `PATCH /users/me` en `apps/api/src/routes/users.ts`: schema Zod con `theme` opcional (enum `light`/`dark`) junto a `name`, validando que haya al menos un campo, usando `updateProfile`; verificar que un `theme` inválido devuelve 400 y uno válido actualiza y devuelve el `theme` nuevo
- [x] 1.5 Documentar el campo `theme` (y su actualización) en `apps/api/src/openapi.ts` para `GET /users/me` y `PATCH /users/me`; verificar que el esquema OpenAPI/Swagger lo refleja
- [x] 1.6 Aplicar la migración en el entorno local y pasar los tests de API existentes: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` en `apps/api`

## 2. Frontend: store de tema y aplicación global

- [x] 2.1 Crear `apps/web/src/stores/theme.ts` (Zustand) con estado `theme: "light" | "dark"`, `setTheme`, resolución inicial (perfil → localStorage `tolocha:theme` → `dark`) y lectura/escritura de `localStorage`; verificar con `npm run typecheck`
- [x] 2.2 En `apps/web/src/main.tsx` fijar `document.documentElement.dataset.theme` (inicial desde localStorage o `dark`) ANTES de montar la app para evitar el flash de tema; verificar en el arranque que `<html data-theme="...">` aparece correcto
- [x] 2.3 Sincronizar el tema con la sesión en `apps/web/src/App.tsx` o `main.tsx`: al resolver sesión (`restore`/login/register), si `user.theme` está presente aplicarlo (prioridad del perfil); verificar que al iniciar sesión con `theme` guardado se aplica y persiste a localStorage
- [x] 2.4 Definir en `apps/web/src/index.css` las variables y utilidades semánticas por tema (`--surface`, `--text`, `--border`, etc. bajo `:root[data-theme="dark|light"]`) y ajustar `color-scheme` según `data-theme`; verificar que `npm run build` compila y que ambos temas renderizan sin errores de estilos

## 3. Frontend: control de alternancia y coherencia visual

- [x] 3.1 Crear `apps/web/src/components/ThemeToggle.tsx` (icono Sol/Luna de lucide-react, `aria-label`/`title` en español) que alterne `setTheme`, actualice `data-theme` y, con sesión abierta, envíe `PATCH /users/me { theme }` de forma optimista; verificar que el control alterna el `data-theme` del documento y el estado del store
- [x] 3.2 Integrar `ThemeToggle` en `apps/web/src/components/AppShell.tsx`: como opción dentro del menú desplegable que se abre al pinchar sobre el avatar/nombre del usuario autenticado, y directamente en la cabecera (junto al botón «Entrar») para invitados; verificar que con sesión se accede desde el avatar y sin sesión desde la cabecera, alternando el tema sin romper la navegación
- [x] 3.3 Sustituir las clases `bg-pine-*`/`text-pine-*` críticas (AppShell, tarjetas, reproductor, formularios, rejilla) por las utilidades semánticas definidas en 2.4 donde el contraste cambie entre temas, conservando los acentos Tolocha; verificar visualmente contraste y legibilidad en tema claro y oscuro en todas las vistas
- [x] 3.4 Ampliar `apps/web/src/lib/types.ts` (campo `theme` en `User`) y `lib/api.ts` si hace falta para el `PATCH /users/me`; verificar `npm run typecheck` en `apps/web`

## 4. Integración y calidad

- [x] 4.1 Pasar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` en ambos workspaces y corregir cualquier fallo
- [x] 4.2 Desplegar con `docker compose up --build -d` y hacer smoke de: registro/incio de sesión recupera la preferencia, cambio de tema con sesión persistido en el perfil (recargar mantiene el tema), cambio como invitado persistido en localStorage, y tema por defecto oscuro en usuario nuevo
