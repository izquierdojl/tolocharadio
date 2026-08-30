## 1. Backend — modelo de datos y servicio

- [x] 1.1 Añadir la tabla `custom_stations` (id, userId, name, url, snapshot, createdAt) al esquema drizzle y a la migración, y verificar que `npm run build` en `apps/api` compila
- [x] 1.2 Extender el tipo `Station` con un booleano `isCustom` (por defecto `false`) y verificar que `npm run typecheck` en `apps/api` pasa
- [x] 1.3 Implementar `CustomStationsService` (crear con saneado/normalización de URL, listar por `userId` ordenado por creación, eliminar) y verificar que añadir, listar y eliminar funcionan vía pruebas unitarias

## 2. Backend — rutas y resolución unificada

- [x] 2.1 Añadir rutas protegidas `POST/GET /custom-stations` y `DELETE /custom-stations/:id` (borrado transaccional que limpia favoritos/historial del usuario) y verificar los endpoints con peticiones autenticadas
- [x] 2.2 Extender la resolución `getStation` en el servicio de estaciones/contexto para delegar en `CustomStationsService` cuando el `stationId` lleva el prefijo `custom:` respetando el `userId`, y verificar que una emisora ajena se resuelve como 404
- [x] 2.3 Comprobar que el proxy de playback y el `/status` reproducen emisoras personalizadas y registran historial, verificando con una emisora personalizada real

## 3. Frontend — gestión y renderizado

- [x] 3.1 Añadir al cliente API (`apps/web/src/lib/api.ts`) y tipos las operaciones de crear/listar/eliminar emisoras personalizadas, y verificar que `npm run typecheck` en `apps/web` pasa
- [x] 3.2 Añadir en la interfaz un flujo para crear una emisora personalizada (formulario nombre + URL con validación y errores en español) y verificar que se crea y aparece en el listado
- [x] 3.3 Mostrar las emisoras personalizadas del usuario con el emblema Tolocha en lugar de favicon (apoyándose en `isCustom`) y ofrecer eliminación, verificando el renderizado en la rejilla
- [x] 3.4 Verificar que las emisoras personalizadas son reproducibles, añadibles a favoritos y aparecen en historial mostrando el emblema Tolocha

## 4. Calidad y cierre

- [x] 4.1 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` en el monorepo y corregir cualquier fallo
- [x] 4.2 Confirmar en Docker el backend tras los cambios (`docker compose up --build -d`) y hacer un smoke test de creación/listado/eliminación/reproducción de una emisora personalizada
