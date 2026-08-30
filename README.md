<p align="center">
  <img src="docs/assets/sierra.svg" alt="Emblema de TolochaRadio" width="96" height="96">
</p>

<h1 align="center">Tolocha<span style="color:#d3a568">Radio</span></h1>

<p align="center"><em>Exploración radiofónica libre y autoalojada.</em></p>

TolochaRadio es un cliente web para la exploración y reproducción de emisoras de radio en línea. Se apoya en la base de datos pública de [RadioBrowser](https://www.radio-browser.info), lo que le otorga acceso a un catálogo extenso y actualizado de emisoras de todo el mundo. Reproducción continua con reproductor flotante, favoritos, historial y cuentas propias.

## Características

- Explorar el catálogo de RadioBrowser con búsqueda por nombre, país, idioma y etiquetas.
- Reproductor flotante persistente: la música no se interrumpe al navegar.
- Guardar emisoras favoritas y consultar tu historial, aislados por usuario.
- Cuentas propias con registro, sesiones y restablecimiento de contraseña.
- Streaming autenticado sin exponer tu token en la URL.
- API REST documentada con OpenAPI 3.1 y Swagger UI.

TolochaRadio es completamente autoalojable y de código abierto: control total sobre tus datos. Sin seguimiento, sin intermediarios. **Radio libre, datos tuyos, control total.**

El proyecto ha sido realizado utilizando enteramente la metodología SDD, utilizando [OpenSpec][https://github.com/Fission-AI/OpenSpec/] por motivos de aprendizaje y buenas prácticas de desarrollo.

## Documentación

| Página | Contenido |
| --- | --- |
| [Uso](docs/uso.md) | Características y guía de uso de la aplicación |
| [Instalación](docs/instalacion.md) | Requisitos, arranque local, variables de entorno |
| [Despliegue](docs/despliegue.md) | Docker, Docker Compose e imagen GHCR |
| [Arquitectura](docs/arquitectura.md) | Monorepo, almacenamiento, sesiones y catálogo |
| [API](docs/api.md) | OpenAPI, endpoints y formato de errores |
| [Desarrollo](docs/desarrollo.md) | Comandos, CI/CD y versionado automático |

## Licencia

MIT. Consulta [LICENSE](LICENSE).
