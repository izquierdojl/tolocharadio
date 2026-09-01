## Context

El historial ya almacena `playedAt` (timestamp Unix ms) en el backend y lo devuelve via `GET /api/v1/history`. El frontend actualmente muestra la fecha absoluta con `formatDate()` solo en el banner "Ultima escucha". Los items deduplicados en la lista no muestran fecha. Ver `apps/web/src/pages/History.tsx`, `apps/web/src/components/StationListItem.tsx`, `apps/web/src/components/StationCard.tsx`.

## Goals / Non-Goals

**Goals:**
- Mostrar tiempo relativo ("hace X tiempo") en cada item del historial (vista lista y card)
- Mantener fecha absoluta como tooltip (`title` attribute) en todos los casos
- Reemplazar fecha absoluta en el banner "Ultima escucha" por tiempo relativo

**Non-Goals:**
- Actualizacion en tiempo real del tiempo relativo (recargar pagina basta)
- Cambios en backend o API
- Mostrar tiempo relativo en otras paginas (favoritos, busqueda)

## Decisions

### Funcion `timeAgo()` en el propio componente History.tsx

Se implementa como funcion local en `History.tsx` en vez de un modulo util compartido. Motivo: solo se usa en esta pagina, y moverlo a un modulo compartido seria over-engineering para una funcion de 15 lineas.

Alternativa considerada: libreria `date-fns` o `dayjs`. Rechazado: añadir una dependencia para una funcion trivial no justifica el coste.

### Prop opcional `playedAt` en StationListItem y StationCard

En vez de renderizar el tiempo relativo externamente en `History.tsx` junto al boton de eliminar, se pasa como prop opcional a los componentes. Motivo: el tooltip y el texto necesitan estar dentro del layout del componente para alinearse con el contenido existente.

### Tooltip con atributo `title`

Se usa el atributo HTML `title` nativo en vez de un tooltip custom. Motivo: simple, accesible, sin dependencias ni CSS adicional.

Formato del tooltip: `"01 sep 2026, 14:30"` — fecha y hora absoluta completa con `toLocaleString("es-ES")`.

## Risks / Trade-offs

- **Tiempo relativo se queda obsoleto si el usuario deja la pagina abierta** → Mitigacion: aceptable, no es critico. El usuario puede recargar.
- **Pluralizacion en espanol** → Mitigacion: la funcion maneja los casos explicitamente (1 minuto / N minutos, 1 hora / N horas, 1 dia / N dias).
