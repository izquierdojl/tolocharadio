## Context

El sistema actual de historial tiene dos endpoints:
- `GET /api/v1/history` - lista el historial
- `DELETE /api/v1/history` - borra todo el historial

La tabla `history` en la base de datos tiene un índice único en `(userId, stationId)`, lo que facilita la eliminación de una emisora específica. El frontend usa React Query para el estado y ya tiene un botón de "Limpiar" que borra todo el historial.

## Goals / Non-Goals

**Goals:**
- Añadir endpoint `DELETE /api/v1/history/:stationId` para eliminar una emisora específica
- Añadir botón de eliminación individual en la interfaz de historial
- Mantener la funcionalidad existente de limpiar todo el historial
- Validar parámetros de entrada

**Non-Goals:**
- Cambiar el esquema de base de datos existente
- Añadir confirmación de eliminación (se puede añadir en futuro)
- Añadir deshacer/deshacer operación

## Decisions

### Decisión: Endpoint REST con parámetro de ruta
**Elección**: `DELETE /api/v1/history/:stationId`
**Alternativas consideradas**:
- `DELETE /api/v1/history` con body: Menos RESTful, rompe la convención de que DELETE no tiene body
- `POST /api/v1/history/delete`: No sigue convenciones REST

**Razón**: Sigue convenciones REST estándar, es intuitivo y fácil de implementar.

### Decisión: Reutilizar índice existente
**Elección**: Usar el índice `(userId, stationId)` existente para la eliminación
**Alternativas consideradas**:
- Crear nuevo índice: Innecesario, ya existe el índice adecuado

**Razón**: El índice existente ya optimiza la consulta de eliminación por usuario y emisora.

### Decisión: Validación en servicio
**Elección**: Validar el formato del stationId en el servicio antes de ejecutar la consulta
**Alternativas consideradas**:
- Validación solo en router: Menos seguro, permite pasar consultas inválidas a la capa de servicio

**Razón**: Capa de seguridad adicional, previene consultas innecesarias a la base de datos.

### Decisión: React Query para estado del frontend
**Elección**: Usar React Query con invalidación de caché tras eliminación
**Alternativas consideradas**:
- Zustand: Requiere sincronización manual con el servidor
- Estado local: No se sincroniza con otros componentes

**Razón**: Consistente con el patrón existente del frontend, maneja automáticamente la sincronización.

## Risks / Trade-offs

- **Riesgo**: Eliminación accidental de emisora → **Mitigación**: El usuario puede volver a escuchar la emisora para que aparezca de nuevo en el historial
- **Riesgo**: Rendimiento con historiales grandes → **Mitigación**: El límite de historial (50 por defecto) mantiene las consultas rápidas
- **Trade-off**: Sin confirmación de eliminación → **Compensación**: Interfaz más rápida, pero posibilidad de eliminación accidental
