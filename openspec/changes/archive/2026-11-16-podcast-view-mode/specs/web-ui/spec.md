## ADDED Requirements

### Requirement: Modo de vista de podcasts (tarjeta/lista)

Los listados de podcasts (`/podcasts` y `/podcasts/suscripciones`) SHALL respetar el modo global tarjeta/lista. En `/podcasts`, «Tus podcasts», «Continuar escuchando» y «Novedades» SHALL cambiar de presentación: tarjeta usa rejilla responsive (episodios en dos columnas en pantallas anchas) y lista usa una sola columna densa. En modo lista, cada podcast muestra portada, título, autor, episodios, estado de suscripción y la acción contextual. El modo tarjeta SHALL ser el predeterminado.

#### Scenario: Alternar modo desde la cabecera en podcasts
- **WHEN** un usuario autenticado está en una vista de podcasts y pulsa el control de modo de vista de la cabecera
- **THEN** los listados de podcasts alternan entre la rejilla de tarjetas y las filas de lista

#### Scenario: Aplicación global entre radio y podcasts
- **WHEN** un usuario cambia al modo lista en las vistas de radio y navega a cualquiera de los listados de podcasts
- **THEN** dichos listados muestran los podcasts en modo lista sin repetir la elección

#### Scenario: Vista de tarjeta de podcasts
- **WHEN** un usuario autenticado está en modo tarjeta
- **THEN** los podcasts se muestran en la rejilla responsive de tarjetas con portada, título, autor y número de episodios, y «Continuar escuchando» y «Novedades» usan dos columnas en pantallas anchas

#### Scenario: Vista de lista de podcasts
- **WHEN** un usuario autenticado está en modo lista
- **THEN** cada podcast se muestra como una fila densa con portada, título, autor, número de episodios y estado de suscripción, y «Continuar escuchando» y «Novedades» usan una sola columna

#### Scenario: Portada completa en modo lista
- **WHEN** un usuario autenticado abre `/podcasts` en modo lista
- **THEN** «Tus podcasts» muestra filas y «Continuar escuchando» y «Novedades» muestran sus episodios en una sola columna

#### Scenario: Acción contextual en ambos modos
- **WHEN** un usuario autenticado ve sus suscripciones en modo tarjeta o en modo lista
- **THEN** cada podcast ofrece la misma acción de cancelar suscripción en ambas presentaciones

#### Scenario: Coherencia entre portada y suscripciones
- **WHEN** un usuario autenticado alterna el modo de vista y recorre `/podcasts` y `/podcasts/suscripciones`
- **THEN** ambos listados usan el mismo modo elegido sin desincronizarse entre sí

#### Scenario: Preferencia recordada en podcasts
- **WHEN** un usuario autenticado elige un modo de vista en una vista de podcasts y recarga la página o vuelve a entrar en ese dispositivo
- **THEN** la aplicación conserva y aplica el modo elegido a los listados de podcasts

#### Scenario: Modo por defecto en podcasts
- **WHEN** un usuario sin preferencia de vista guardada abre una vista de podcasts
- **THEN** los podcasts se muestran en modo tarjeta

### Requirement: Descarte de episodios en «Continuar escuchando»

En `/podcasts`, cada episodio de «Continuar escuchando» SHALL ofrecer una acción de descarte accesible. Al descartarlo, SHALL desaparecer de la sección sin marcarlo como completado ni alterar su progreso, y SHALL mantenerse oculto tras recargar y en otros dispositivos. Si el usuario vuelve a escuchar el episodio y se registra nuevo progreso, SHALL volver a aparecer.

#### Scenario: Descartar un episodio en progreso
- **WHEN** un usuario autenticado pulsa la acción de descarte de un episodio de «Continuar escuchando»
- **THEN** el episodio desaparece de la sección y la portada se actualiza sin recargar

#### Scenario: Descarte persistente entre dispositivos
- **WHEN** un usuario descarta un episodio y abre `/podcasts` en otro dispositivo o tras recargar la página
- **THEN** el episodio sigue sin aparecer en «Continuar escuchando»

#### Scenario: El descarte no altera el progreso
- **WHEN** un usuario descarta un episodio en progreso
- **THEN** su posición, duración y estado de completado se conservan, y el episodio sigue disponible en la ficha del podcast

#### Scenario: Reaparición al reanudar la escucha
- **WHEN** un usuario descarta un episodio y después reproduce y registra nuevo progreso en él
- **THEN** el episodio vuelve a aparecer en «Continuar escuchando»

#### Scenario: Error al descartar
- **WHEN** el descarte falla por un error de red o del servidor
- **THEN** la interfaz muestra un mensaje en español y el episodio permanece en la sección

### Requirement: Indicador de cola en la navegación

Cuando la funcionalidad de podcasts esté activa, el ítem «Cola» de la navegación de Podcasts SHALL mostrar un badge con el número de episodios en cola. El badge SHALL ocultarse cuando el conteo sea cero y SHALL actualizarse al añadir, quitar o avanzar automáticamente la cola. La portada `/podcasts` NO SHALL mostrar una tarjeta de resumen de cola.

#### Scenario: Badge con episodios en cola
- **WHEN** un usuario autenticado tiene episodios en la cola y navega por cualquier vista de podcasts
- **THEN** el ítem «Cola» del menú muestra un badge pequeño con el número de episodios

#### Scenario: Badge oculto con la cola vacía
- **WHEN** la cola del usuario está vacía
- **THEN** el ítem «Cola» no muestra badge

#### Scenario: Actualización del badge
- **WHEN** un usuario añade, quita o deja avanzar automáticamente un episodio de la cola
- **THEN** el badge refleja el nuevo conteo sin recargar la página

#### Scenario: Sin tarjeta de resumen en la portada
- **WHEN** un usuario autenticado abre `/podcasts`
- **THEN** no se muestra el bloque «Cola de reproducción» y el acceso a la cola sigue disponible desde la navegación
