# Uso de TolochaRadio

> [← Volver al README](../README.md)

TolochaRadio es un cliente web (self-hosted) para explorar y escuchar emisoras de radio por internet, con cuentas propias para guardar tus favoritas para siempre.

## Características

- **Catálogo global**: búsqueda de emisoras por nombre, país e idioma con paginación, a través de la API pública de radio-browser.
- **Reproductor flotante persistente**: `<audio>` gestionado por Zustand, la música no se interrumpe al navegar; controles de reproducir/pausar, siguiente, volumen y quitar emisora.
- **Cuentas propias**: registro (desactivable), inicio de sesión, perfil, cambio de contraseña y restablecimiento con token de un solo uso.
- **Favoritos e historial**: snapshot de cada emisora guardada o escuchada, aislamiento por usuario, limpieza completa.
- **Proxy de streaming autenticado**: la API retransmite el stream con tus credenciales; nunca se expone el token en la URL.
- **API REST documentada** con OpenAPI 3.1 y Swagger UI incluidos.
- **Tema Tolocha**: modo oscuro por defecto, paleta verde-bosque/ocre-montaña y silueta de sierra en la interfaz.

## La aplicación permite

- Explorar el catálogo de RadioBrowser mediante búsquedas y navegación.
- Buscar emisoras por nombre, país, idioma o etiquetas.
- Guardar emisoras favoritas en una lista personal.
- Gestionar el historial de reproducción para recuperar sintonías anteriores.

## Explorar emisoras

Entra en la sección **Explorar**. Puedes buscar por **nombre**, **país**, **idioma** y **etiquetas**; los resultados se muestran con paginación y cada emisora ofrece su ficha con la opción de reproducirla.

## Reproductor

El reproductor es **flotante y persistente**: al cambiar de página la música continúa. Desde él puedes:

- Reproducir o pausar la emisora actual.
- Saltar a la siguiente.
- Ajustar el volumen.
- Quitar la emisora y detener la reproducción.

## Cuentas propias

- **Registro**: crea una cuenta con nombre/email y contraseña (se puede desactivar vía configuración, ver `docs/instalacion.md`).
- **Inicio de sesión**: mantiene la sesión con cookies HTTP-only rotatorias.
- **Perfil**: consulta y actualiza tu nombre de usuario.
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