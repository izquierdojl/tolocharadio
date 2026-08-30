## ADDED Requirements

### Requirement: Modo de vista de emisoras (tarjeta/lista)
La interfaz SHALL ofrecer, para usuarios autenticados, un control en la cabecera que alterna entre dos modos de presentación de las emisoras: el modo tarjeta (rejilla responsive de tarjetas, el modo actual por defecto) y el modo lista (filas densas con los datos y acciones de la emisora). El modo seleccionado SHALL aplicarse globalmente a todas las vistas que listan emisoras del usuario — exploración/búsqueda, favoritos e historial — y SHALL mantenerse al navegar entre ellas. La aplicación SHALL recordar el modo elegido en el dispositivo (localStorage) y aplicarlo al recargar la página. El modo tarjeta SHALL ser el predeterminado cuando no exista una preferencia guardada.

#### Scenario: Alternar modo desde la cabecera
- **WHEN** un usuario autenticado pulsa el control de modo de vista en la cabecera
- **THEN** la presentación de las emisoras alterna entre tarjeta (rejilla) y lista en todas las vistas que la usan

#### Scenario: Aplicación global entre secciones
- **WHEN** un usuario cambia al modo lista y navega entre explorar, favoritos e historial
- **THEN** las tres secciones muestran las emisoras en modo lista sin repetir la elección

#### Scenario: Vista de tarjeta
- **WHEN** un usuario autenticado está en modo tarjeta
- **THEN** las emisoras se muestran en la rejilla responsive de tarjetas con imagen, nombre y acciones rápidas

#### Scenario: Vista de lista
- **WHEN** un usuario autenticado está en modo lista
- **THEN** cada emisora se muestra como una fila con sus datos (nombre, país, idioma, géneros) y las mismas acciones que la tarjeta (reproducir y añadir/quitar favorito)

#### Scenario: Preferencia recordada
- **WHEN** un usuario autenticado elige un modo de vista y recarga la página o vuelve a entrar en ese dispositivo
- **THEN** la aplicación conserva y aplica el modo elegido

#### Scenario: Modo por defecto
- **WHEN** un usuario sin preferencia de vista guardada abre la aplicación
- **THEN** las emisoras se muestran en modo tarjeta

#### Scenario: Invitado sin control de modo
- **WHEN** un usuario sin sesión ve la aplicación
- **THEN** no ve el control de modo de vista (las emisoras solo se muestran a usuarios autenticados)