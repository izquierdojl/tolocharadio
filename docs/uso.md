# Uso de TolochaRadio

> [← Volver al README](../README.md)

TolochaRadio es un cliente web (self-hosted) para explorar y escuchar emisoras de radio por internet y podcasts, con cuentas propias para guardar tus favoritas y tus suscripciones para siempre.

## Características

- **Catálogo global**: búsqueda de emisoras por nombre, país e idioma con paginación, a través de la API pública de radio-browser.
- **Podcasts por RSS**: búsqueda en directorio (iTunes/PodcastIndex), alta manual de feeds, suscripciones y exportación/importación OPML.
- **Reproductor flotante persistente**: `<audio>` gestionado por Zustand con reconexión automática, la música no se interrumpe al navegar; controles de reproducir/pausar, volumen y quitar emisora. Con podcasts añade búsqueda en la pista, ±15/30 s, velocidad 1x–2x y reanudación.
- **Cuentas propias**: registro (desactivable), inicio de sesión, perfil, cambio de contraseña y restablecimiento con token de un solo uso.
- **Favoritos e historial**: snapshot de cada emisora guardada o escuchada, aislamiento por usuario, limpieza completa. Los episodios favoritos y la cola de podcasts se guardan aparte.
- **Proxy de streaming autenticado**: la API retransmite el stream con tus credenciales; nunca se expone el token en la URL.
- **API REST documentada** con OpenAPI 3.1 y Swagger UI incluidos.
- **Tema Tolocha**: modo oscuro por defecto, paleta verde-bosque/ocre-montaña y silueta de sierra en la interfaz.

## La aplicación permite

- Explorar el catálogo de RadioBrowser mediante búsquedas y navegación.
- Buscar emisoras por nombre, país, idioma o etiquetas.
- Guardar emisoras favoritas en una lista personal.
- Gestionar el historial de reproducción para recuperar sintonías anteriores.
- Suscribirse a podcasts, guardar episodios y mantener una cola sincronizada entre dispositivos.

## Explorar emisoras

Entra en la sección **Explorar**. Puedes buscar por **nombre**, **país**, **idioma** y **etiquetas**; los resultados se muestran con paginación y cada emisora ofrece su ficha con la opción de reproducirla.

## Reproductor

El reproductor es **flotante y persistente**: al cambiar de página la música continúa. Desde él puedes:

- Reproducir o pausar la emisora actual.
- Ajustar el volumen.
- Quitar la emisora y detener la reproducción.

Si el stream se interrumpe (corte de red, cierre del origen o estancamiento), el reproductor **reconecta solo** con esperas crecientes y muestra «Reconectando…». Si agota los reintentos, muestra el motivo y un botón **Reintentar**. Al elegir una emisora también se comprueba su disponibilidad y, si no está accesible, se avisa con un mensaje.

Las emisoras que emiten en HLS se reproducen como un flujo continuo: el servidor descarga y encadena los segmentos y renueva la sesión del origen cuando caduca, de modo que el navegador solo ve audio. Las emisoras HLS con un formato no concatenable (por ejemplo fMP4 o cifrado) muestran un aviso de formato no compatible.

## Podcasts

La cabecera incorpora un selector **Radio | Podcasts** (visible si el servidor tiene `PODCASTS_ENABLED=true`). En **Radio** están Explorar, Favoritos, Historial, Estadísticas y Mis emisoras; en **Podcasts**:

- **Inicio** (`/podcasts`): continuar escuchando, novedades de tus suscripciones, tus podcasts y un resumen de la cola.
- **Descubrir** (`/podcasts/descubrir`): búsqueda en el directorio configurado (`iTunes` por defecto o PodcastIndex), alta manual de una URL RSS e importación/exportación OPML.
- **Suscripciones** (`/podcasts/suscripciones`): tus programas y baja de suscripción.
- **Ficha** (`/podcasts/:podcastId`): portada, descripción y episodios paginados con filtros (sin empezar, en progreso, completados) y orden (recientes, duración, título).
- **Cola** (`/podcasts/cola`): hasta 200 episodios ordenables por arrastre. El episodio en reproducción se oculta de la lista de pendientes y se controla desde el reproductor persistente; al pausarlo, detenerlo o cambiar de episodio vuelve a su posición. El botón **Vaciar cola** elimina los pendientes sin detener el episodio cargado. La cola se sincroniza por usuario con un número de revisión; si cambia en otro dispositivo, el servidor responde `409` y la vista se recarga.
- **Episodios favoritos** (`/podcasts/favoritos`): episodios marcados con el corazón, independientes de las emisoras favoritas.
- **Estadísticas** (`/podcasts/estadisticas`): tiempo de contenido consumido, podcasts distintos, episodios empezados (≥ 30 s) y completados, tasa de finalización, media por episodio, evolución temporal, hábitos horarios, reparto por categoría y sesiones recientes. Son datos privados: solo tú puedes verlos.

En las listas de episodios (inicio, ficha y favoritos), cada fila ofrece **Reproducir/Pausar** y un menú **A la cola** con **A continuación** y **Al final**; si el episodio ya estaba en la cola, se mueve a la posición elegida en vez de duplicarse.

Al terminar un episodio se marca como completado, se retira de la cola y suena automáticamente el siguiente. Al vaciar la cola, el episodio cargado en el reproductor sigue sonando. En el cliente de escritorio las teclas multimedia **Siguiente** y **Anterior** controlan la cola.

El **perfil** permite elegir la **sección inicial** (`Radio` o `Podcasts`) que se abre al entrar. Las rutas antiguas `/radio/explorar`, `/radio/favoritos`, `/radio/historial`, `/radio/estadisticas` y `/radio/mis-emisoras` redirigen a sus rutas canónicas.

## Cuentas propias

- **Registro**: crea una cuenta con nombre/email y contraseña (se puede desactivar vía configuración, ver `docs/instalacion.md`).
- **Inicio de sesión**: mantiene la sesión con cookies HTTP-only rotatorias.
- **Perfil**: consulta y actualiza tu nombre de usuario y elige la vista y la sección iniciales.
- **Contraseña**: cambia tu contraseña o restablécelarla con un token de un solo uso si la olvidas.

## Favoritos e historial

- **Favoritos**: añade o quita una emisora de tu lista personal; cada favorito guarda un snapshot de la emisora.
- **Historial**: se registra cada stream escuchado (con límite por usuario); puedes consultarlo y limpiarlo completo en cualquier momento.

Aislamiento por usuario: cada cuenta solo ve sus propios favoritos e historial.

## Privacidad y autonomía

TolochaRadio es completamente autoalojable y de código abierto: control total sobre tus datos. Sin dependencias de servicios externos más allá de la base de datos pública de RadioBrowser. Sin seguimiento, sin intermediarios.

## Referencia rápida

| Tema | Documento |
| --- | --- |
| Instalación y arranque | [docs/instalacion.md](instalacion.md) |
| Arquitectura y requisitos | [docs/arquitectura.md](arquitectura.md) |
| Despliegue con Docker | [docs/despliegue.md](despliegue.md) |
| API REST | [docs/api.md](api.md) |
| Desarrollo y release | [docs/desarrollo.md](desarrollo.md) |
| Licencia | [docs/licencia.md](licencia.md) |