## Context

Actualmente tres páginas listan emisoras del usuario autenticado y todas usan la misma presentación: una rejilla responsive (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`) de `StationCard` (aspect-video, portada, acciones flotantes):
- `pages/Explore.tsx` — resultados de búsqueda/filtros.
- `pages/Favorites.tsx` — favoritos del usuario.
- `pages/History.tsx` — historial (además de un bloque estático «Última escucha» que no debe verse afectado).

La cabecera (`components/AppShell.tsx`) ya tiene el patrón de un control global con persistencia: `ThemeToggle` + `stores/theme.ts` (Zustand + localStorage, clave `tolocha:theme`). La botonera de favorito vive dentro de `StationCard.tsx` (`FavoriteButton`, no exportado). Motivación y alcance en `proposal.md - Why`; comportamiento en `specs/web-ui/spec.md`.

## Goals / Non-Goals

**Goals:**
- Un único control en la cabecera (solo autenticados) que alterne entre modo tarjeta (rejilla) y modo lista.
- Aplicación global e inmediata del modo en explorar, favoritos e historial, manteniéndose al navegar.
- Preferencia persistida en `localStorage` (clave nueva) y modo tarjeta como predeterminado.
- Reutilizar las acciones existentes de la tarjeta (reproducir, favorito) en el modo lista.

**Non-Goals:**
- Cambios de API (`apps/api`), migraciones ni sincronización de la preferencia con el perfil del usuario.
- Rediseñar la `StationCard` ni su grid actual.
- Cambiar la paginación de explorar.
- Aplicar el modo a vistas no relacionadas (portada, perfil, reproductor, bloque «Última escucha» del historial).

## Decisions

- **Store global `stores/viewMode.ts` (Zustand + localStorage)**: estado `viewMode: "card" | "list"` con `setViewMode`, lectura inicial desde `localStorage` y guardado al cambiar, siguiendo el patrón de `stores/theme.ts` (clave `tolocha:viewMode`, valor por defecto `card`, acceso con try/catch). Alternativa descartada: sincronizar la preferencia al perfil vía API como el tema — implicaría cambios de backend que el alcance no necesita; se deja para un cambio futuro.
- **Componente compartido `components/StationList.tsx`**: recibe `stations: Station[]` y, leyendo el store, renderiza la rejilla de `StationCard` o la lista de `StationListItem`. Las tres páginas lo usan en lugar de duplicar el contenedor del grid. Alternativa considerada: mantener el grid en cada página y solo cambiar el item — duplica lógica y facilita aplicar el modo de forma inconsistente.
- **Extraer `components/FavoriteButton.tsx`**: la lógica de marcar/quitar favorito (hoy interna de `StationCard.tsx`) pasa a un componente propio para reutilizarse en `StationCard` y `StationListItem` sin duplicar hooks de react-query ni toast.
- **Nuevo `components/StationListItem.tsx`**: fila densa con portada/avatar circular o placeholder, nombre (truncado), país · idioma, géneros y bitrate, y acciones (reproducir + `FavoriteButton`), en un `article` con hover coherente con la identidad Tolocha.
- **`components/ViewModeToggle.tsx` integrado en la cabecera**: botón de alternativa con iconos `LayoutGrid`/`List` de lucide-react, `aria-label`/`title` en español («Cambiar a vista de lista»/«Cambiar a vista de tarjetas»). Se muestra junto a la navegación/menú de usuario únicamente cuando `status === "authenticated"` (un invitado nunca ve emisoras). En pantallas pequeñas se muestra icono solo.
- **Texto del pie de favoritos**: en `pages/Favorites.tsx` el aviso «Pulsa el corazón en cualquier tarjeta…» se neutraliza para valer en ambos modos («…en cualquier emisora…»).

## Risks / Trade-offs

- **Aplicación inconsistente entre páginas** si se cambia el render en un solo sitio → Se centraliza la presentación en `StationList` y se usa en las tres páginas; se verifica cada una en smoke test en ambos modos.
- **Fila de lista dos veces más larga que la tarjeta** → Se limita el ancho/padding y se truncan los textos; opcionalmente bandas alternas sutiles para legibilidad.
- **localStorage no disponible o corrompido** → Lectura/escritura en try/catch con modo `card` por defecto, igual que en el store de tema.
- **Modo lista con muchos resultados en explorar** → La paginación existente se conserva (24/página), limitando la longitud del documento.