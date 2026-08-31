## Why

La página de exploración muestra hoy una fila de "Sugerencias" con chips de género hardcodeadas en el frontend (`clásica`, `jazz`, `folk`), idénticas para todos los usuarios. Al pulsar una chip se rellena el campo de búsqueda por nombre, no el filtro de género. Esto impide que cada usuario disponga de accesos rápidos a los géneros que realmente escucha y obliga a reescribir el código del frontend para cambiar las sugerencias.

## What Changes

- Las chips de "Sugerencias" de la página de exploración pasan a ser **personalizadas por usuario**: cada cuenta guarda su propia lista de géneros sugeridos.
- El usuario autenticado podrá **añadir una sugerencia** eligiendo un género del catálogo y **eliminar** las sugerencias que no quiera.
- Al pulsar una chip de sugerencia se aplica el **filtro de género** de la búsqueda (no el filtro por nombre), mostrando las emisoras de ese género.
- Gestión de sugerencias **aislada por cuenta**: cada usuario solo ve y modifica las suyas.
- La API expone endpoints protegidos de lista, alta y borrado de sugerencias. La fila de sugerencias solo aparece para usuarios autenticados (la exploración ya lo es).

## Capabilities

### New Capabilities
- `suggestions`: gestión por usuario de sugerencias de género personalizadas (listar, añadir y eliminar), con validación de género, aislamiento por cuenta y orden estable.

### Modified Capabilities
- `web-ui`: la exploración muestra las sugerencias de género personalizadas del usuario (añadir/eliminar desde la interfaz) y al pulsar una chip aplica el filtro de género, en lugar de mostrar chips fijas que rellenan el nombre.

## Impact

- **API** (`apps/api`): nueva ruta+servicio de sugerencias (CRUD básico protegido) y nueva tabla en better-sqlite3/drizzle (`suggestions`) con migración.
- **Web** (`apps/web`): la página de exploración reemplaza las chips fijas por las sugerencias del usuario, con control de añadir (combobox de géneros del catálogo) y acción de eliminar por chip.
- **Base de datos**: nueva tabla `suggestions` (requiere migración).
- **Sin dependencias externas nuevas.**
- **Rama**: el trabajo se desarrolla en una rama separada siguiendo la convención del proyecto (p. ej. `feature/sugerencias-personalizadas`).