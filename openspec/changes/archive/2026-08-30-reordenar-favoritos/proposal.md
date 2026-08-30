## Why

Actualmente los favoritos se ordenan automáticamente por fecha de adición (los más recientes primero), sin que el usuario pueda decidir su orden. El usuario no tiene forma de priorizar sus emisoras (por ejemplo, poner primero las que más escucha) y el API tampoco lo permite, por lo que aplicaciones externas no pueden reordenar favoritos por sí mismas.

## What Changes

- **Orden de favoritos controlado por el usuario**: se añade la posibilidad de reordenar manualmente las emisoras favoritas en la web mediante una interfaz de arrastrar y soltar (drag & drop) y/o botones de subir/bajar.
- **API**: se expone un nuevo endpoint que permite guardar el orden personalizado de los favoritos (una lista con el orden deseado de `stationId`), que será usado por el frontend y por herramientas externas.
- **Persistencia del orden**: se guarda el orden personalizado en el servidor de modo que se mantenga entre sesiones y sea coherente para cualquier consumidor (web o externo). El orden sigue siendo privado por cuenta.
- **Compatibilidad de listado**: el listado de favoritos mantiene su contrato actual; el orden devuelto pasa a reflejar el orden personalizado del usuario cuando exista, en lugar de la fecha de adición.

## Capabilities

### New Capabilities
<!-- Ninguna: la funcionalidad se integra en la capacidad existente `favorites`. -->

### Modified Capabilities
- `favorites`: el listado de favoritos deja de ordenarse únicamente por fecha de adición y pasa a reflejar un orden personalizado que el usuario puede establecer; se añade un nuevo requisito para reordenar los favoritos y que dicho orden se persista por cuenta.

## Impact

- **API** (`apps/api`): nueva columna `position` (o equivalente) en la tabla `favorites` (`db/schema.ts`) + migración Drizzle; el servicio `FavoritesService` ajusta el listado para respetar el orden personalizado; nuevo endpoint `PUT /favorites/order` (o `POST`) que recibe la lista ordenada de `stationId` de la cuenta; actualización de la documentación OpenAPI.
- **Web** (`apps/web`): página `Favorites.tsx` con una lista reordenable (arrastrar y soltar y/o botones subir/bajar), llamada al nuevo endpoint para persistir el orden tras cada cambio, e invalidación/refresco de la query de favoritos.
- **Especificaciones**: delta de `favorites`.
- Despliegue monolítico en un paso, sin cambios en otros proxies.
