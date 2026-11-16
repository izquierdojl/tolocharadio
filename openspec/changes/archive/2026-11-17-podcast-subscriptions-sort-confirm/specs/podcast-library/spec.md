## ADDED Requirements

### Requirement: Ordenación de la pantalla de suscripciones
La pantalla `/podcasts/suscripciones` SHALL ofrecer un selector de orden con las opciones **Episodios recientes** (valor por defecto), **Nombre (A → Z)**, **Nombre (Z → A)** y **Últimas suscritas** (por fecha de suscripción descendente). La ordenación por nombre SHALL comparar sin distinguir mayúsculas ni acentos y usando el idioma español. **Episodios recientes** SHALL ordenar de más a menos reciente según `latestPendingEpisodeAt` (episodio pendiente de reproducir más reciente), dejando al final los podcasts con valor `null` y usando el nombre como desempate. La opción elegida SHALL recordarse en el dispositivo entre visitas; si el valor guardado no es válido o no existe, SHALL aplicarse **Episodios recientes**. Cambiar el orden NO SHALL realizar peticiones adicionales a la API ni afectar a la vista tarjeta/lista.

#### Scenario: Orden por nombre ascendente
- **WHEN** un usuario con suscripciones «Zeta», «álbum» y «Beta» elige **Nombre (A → Z)**
- **THEN** la lista se muestra como «álbum», «Beta», «Zeta»

#### Scenario: Orden por nombre descendente
- **WHEN** el usuario elige **Nombre (Z → A)**
- **THEN** la lista se muestra en el orden inverso al anterior

#### Scenario: Orden por episodios recientes pendientes
- **WHEN** el usuario elige **Episodios recientes** y el podcast A tiene un episodio pendiente publicado ayer, el B uno publicado hace un mes y el C todos sus episodios completados
- **THEN** la lista se muestra como A, B, C

#### Scenario: Podcasts sin pendientes al final con desempate por nombre
- **WHEN** varios podcasts tienen `latestPendingEpisodeAt` nulo en el orden **Episodios recientes**
- **THEN** aparecen tras los que tienen pendientes y ordenados entre sí por nombre ascendente

#### Scenario: Primera visita sin preferencia guardada
- **WHEN** un usuario abre la pantalla sin haber elegido nunca un orden
- **THEN** la lista se muestra ordenada por **Episodios recientes**

#### Scenario: Orden por fecha de suscripción
- **WHEN** el usuario elige **Últimas suscritas**
- **THEN** la lista se muestra en el orden recibido de la API (suscripción más reciente primero)

#### Scenario: Preferencia recordada
- **WHEN** el usuario elige un orden y vuelve a abrir la pantalla en el mismo dispositivo
- **THEN** se aplica el orden elegido

#### Scenario: Valor guardado inválido o almacenamiento no disponible
- **WHEN** el valor guardado no es una opción conocida o el almacenamiento del navegador no está disponible
- **THEN** se aplica **Episodios recientes** sin mostrar error

### Requirement: Confirmación antes de cancelar una suscripción
Antes de cancelar una suscripción desde la pantalla de suscripciones o desde el botón «Suscrito» de la ficha del podcast, la interfaz SHALL mostrar un diálogo de confirmación destructivo que nombre el podcast y ofrezca confirmar o cancelar. La baja (`DELETE /api/v1/podcasts/subscriptions/:podcastId`) SHALL ejecutarse únicamente tras confirmar. Cerrar el diálogo (botón de cancelar, tecla Escape o clic fuera) NO SHALL modificar la suscripción. Suscribirse a un podcast NO SHALL requerir confirmación.

#### Scenario: Confirmar la baja desde la lista de suscripciones
- **WHEN** un usuario pulsa «Cancelar» en un podcast de la lista y confirma en el diálogo
- **THEN** se cancela la suscripción, el podcast desaparece de la lista y se muestra un aviso de confirmación

#### Scenario: Descartar el diálogo
- **WHEN** un usuario pulsa «Cancelar» en un podcast y cierra el diálogo sin confirmar
- **THEN** no se envía ninguna petición de baja y el podcast sigue en la lista

#### Scenario: Baja desde la ficha del podcast
- **WHEN** un usuario suscrito pulsa «Suscrito» en la ficha de un podcast
- **THEN** se muestra el diálogo de confirmación y la baja solo se realiza si confirma

#### Scenario: Suscribirse no pide confirmación
- **WHEN** un usuario pulsa «Suscribirse» en la ficha de un podcast al que no está suscrito
- **THEN** la suscripción se crea de inmediato sin diálogo

#### Scenario: Error al cancelar
- **WHEN** el servidor devuelve un error tras confirmar la baja
- **THEN** se muestra el mensaje de error, el diálogo se cierra y la suscripción permanece en la lista
