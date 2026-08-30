## Why

Hoy el catálogo de emisoras proviene exclusivamente de radio-browser.info. Los usuarios no pueden escuchar emisoras que no estén indexadas en ese origen. Esta limitación impide cubrir radios locales, streams privados o enlaces que el catálogo público no incluye, reduciendo la utilidad del reproductor para el usuario final.

## What Changes

- Nueva capacidad para que cada usuario autenticado cree **emisoras personalizadas** aportando únicamente un **nombre** y una **URL de stream** válida.
- Las emisoras personalizadas se guardan **aisladas por cuenta**: cada usuario solo ve y gestiona las suyas.
- Estas emisoras **no tienen imagen propia**: en cualquier vista que las muestre se usa el logotipo/emblema personalizado de TolochaRadio.
- Son **reproducibles** a través del mismo proxy de playback que el resto de emisoras y pueden añadirse a favoritos e historial como cualquier otra.
- Gestión mínima por parte del usuario: **crear**, **listar** y **eliminar** sus emisoras personalizadas.
- Sin cambios en el catálogo global de radio-browser.info (las emisoras personalizadas son un dominio aparte, no se mezclan en búsquedas del catálogo público).

## Capabilities

### New Capabilities
- `custom-stations`: gestión (crear, listar, eliminar) de emisoras personalizadas por cada usuario, con validación de nombre y URL de stream, aislamiento por cuenta y reproducción a través del proxy de playback.

### Modified Capabilities
- (Ninguno — no cambia el comportamiento de las capacidades existentes; la integración visual con la rejilla/especificidad se describe en el diseño.)

## Impact

- **API** (`apps/api`): nueva ruta+servicio para emisoras personalizadas (CRUD básico protegido), nueva tabla en mejor-sqlite3/drizzle (snapshot de la emisora personalizada), inclusión de las emisoras personalizadas en el proxy de playback y en el detalle que consume la interfaz.
- **Web** (`apps/web`): interfaz para añadir/eliminar emisoras personalizadas, y renderizado con el emblema Tolocha en lugar de favicon; integración con la rejilla/exploración del usuario, favoritos e historial.
- **Dominio de datos**: nueva tabla de base de datos (requiere migración).
- **Sin dependencias externas nuevas.**
