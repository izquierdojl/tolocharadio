# Spec Delta

## ADDED Requirements

### Requirement: Navegación de primer nivel entre Radio y Podcasts
Cuando `features.podcasts` esté activo en `/api/v1/config`, `AppShell` SHALL mostrar un selector `Radio | Podcasts` en escritorio y móvil. En `Radio` SHALL mostrar las vistas de radio (`/explorar`, `/favoritos`, `/historial`, `/estadisticas`, `/mis-emisoras`, con alias `/radio/*`); en `Podcasts`, las de podcasts (`/podcasts/*`). Si `features.podcasts` es `false`, el selector y las rutas de podcasts SHALL ocultarse.

#### Scenario: Cambio de sección sin interrumpir el audio
- **WHEN** un usuario autenticado con audio en reproducción cambia entre `Radio` y `Podcasts` en la cabecera
- **THEN** la barra de navegación contextual cambia a las vistas de la sección elegida y la reproducción activa continúa sin cortes

#### Scenario: Redirección de alias `/radio/*` a rutas canónicas
- **WHEN** un usuario accede a `/radio/explorar` o `/radio/favoritos`
- **THEN** el router redirige de forma transparente a `/explorar` o `/favoritos` conservando la compatibilidad con marcadores y el cliente de escritorio

### Requirement: Sección inicial por defecto configurable (`defaultSection`)
El perfil de usuario (`/perfil` y `PATCH /api/v1/users/me`) SHALL permitir elegir la sección inicial por defecto (`defaultSection`: `"radio"` o `"podcasts"`, con `"radio"` como valor predeterminado). Cuando el usuario autenticado acceda a `/` o inicie sesión, SHALL ser redirigido a `/podcasts` si su `defaultSection` es `"podcasts"`, o a su `defaultView` de radio (`/explorar`, `/favoritos` o `/historial`) si su `defaultSection` es `"radio"`.

#### Scenario: Usuario con sección inicial en Podcasts
- **WHEN** un usuario autenticado con `defaultSection: "podcasts"` abre `/` o inicia sesión
- **THEN** la aplicación lo redirige automáticamente a `/podcasts`
