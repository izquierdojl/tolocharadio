# Stats Visualization Specification

## Purpose

Permite a cada usuario consultar en la web sus estadísticas personales de escucha (resumen, evolución, top, hábitos, géneros, países y recientes) con filtros de periodo, de forma privada y legible en español.

## Requirements

### Requirement: Acceso privado a la página de estadísticas

La página de estadísticas SHALL estar disponible solo para usuarios autenticados en la ruta `/estadisticas`, ser accesible desde la navegación principal y redirigir al invitado a la portada o al inicio de sesión.

#### Scenario: Usuario autenticado abre estadísticas

- **WHEN** un usuario con sesión abre `/estadisticas`
- **THEN** ve su panel personal de estadísticas

#### Scenario: Invitado intenta abrir estadísticas

- **WHEN** un usuario sin sesión intenta abrir `/estadisticas`
- **THEN** no ve datos ni gráficos y es conducido a la portada o al inicio de sesión

#### Scenario: Navegación hacia estadísticas

- **WHEN** un usuario autenticado usa la navegación principal o el menú hamburguesa en móvil
- **THEN** encuentra una entrada hacia sus estadísticas

### Requirement: Filtros globales de periodo y granularidad

La página SHALL ofrecer filtros de periodo (`últimos 7/30/90 días`, `todo` y rango personalizado) y granularidad de la evolución (`día/semana/mes` con valor automático por defecto) que se aplican a todas las secciones agregadas.

#### Scenario: Cambio de periodo

- **WHEN** el usuario cambia el periodo
- **THEN** todas las secciones agregadas se recargan con ese rango de fechas

#### Scenario: Rango personalizado

- **WHEN** el usuario elige un rango con fecha de inicio y fin
- **THEN** las secciones agregadas muestran los datos de ese intervalo inclusivo

#### Scenario: Granularidad automática

- **WHEN** el usuario no elige granularidad manual
- **THEN** la evolución usa día en rangos cortos y semana o mes en rangos largos

#### Scenario: Rango inválido

- **WHEN** la fecha de inicio es posterior a la de fin
- **THEN** la interfaz lo indica en español y no lanza consultas inválidas

### Requirement: Tarjetas resumen de escucha

La página SHALL mostrar tarjetas resumen con el tiempo total del periodo, la emisora más escuchada y el día de mayor escucha, con duraciones en formato español legible.

#### Scenario: Resumen con datos

- **WHEN** el usuario tiene escuchas en el periodo
- **THEN** ve el tiempo total, su emisora destacada y su día pico con valores coherentes con el resto de secciones

#### Scenario: Resumen sin datos

- **WHEN** el usuario no tiene escuchas en el periodo
- **THEN** las tarjetas muestran cero o estado neutro en lugar de valores inventados

#### Scenario: Formato de duración en español

- **WHEN** se muestra cualquier duración
- **THEN** aparece como "45 min", "3 h 12 min" o "0 min", sin decimales crípticos ni milisegundos

### Requirement: Evolución temporal de la escucha

La página SHALL mostrar la evolución del tiempo de escucha en el periodo como serie temporal por día, semana o mes, incluyendo los intervalos sin escucha con valor cero.

#### Scenario: Serie diaria con huecos

- **WHEN** el usuario consulta un rango con días sin escucha
- **THEN** ve la serie completa con esos días a cero, ordenada cronológicamente

#### Scenario: Cambio de granularidad

- **WHEN** el usuario cambia entre día, semana y mes
- **THEN** la serie se reagrupa en esas unidades sin cambiar el rango

### Requirement: Top de emisoras más escuchadas

La página SHALL mostrar el ranking de emisoras más escuchadas del periodo ordenado de mayor a menor tiempo, con imagen, nombre y duración de cada emisora.

#### Scenario: Ranking ordenado

- **WHEN** el usuario tiene escuchas en el periodo
- **THEN** ve sus emisoras ordenadas por tiempo descendente con imagen, nombre y duración

#### Scenario: Top sin datos

- **WHEN** el usuario no tiene escuchas en el periodo
- **THEN** ve un estado vacío que invita a escuchar en lugar de un ranking vacío

### Requirement: Hábitos por hora y día de la semana

La página SHALL mostrar la distribución del tiempo de escucha por hora local y día de la semana como mapa de calor de 7 filas por 24 columnas, con lunes como primera fila.

#### Scenario: Mapa de calor con actividad

- **WHEN** el usuario tiene escuchas repartidas en horas y días
- **THEN** ve la intensidad de cada celda proporcional al tiempo escuchado, con ejes de día y hora legibles

#### Scenario: Hábitos sin datos

- **WHEN** el usuario no tiene escuchas en el periodo
- **THEN** ve un estado vacío coherente en lugar de un mapa a cero sin contexto

#### Scenario: Detalle de celda en español

- **WHEN** el usuario explora una celda del mapa
- **THEN** conoce el día, la hora y la duración correspondiente en texto español

### Requirement: Desglose por género y país

La página SHALL mostrar el tiempo de escucha del periodo agrupado por género y por país, con las emisoras sin metadatos bajo "desconocido".

#### Scenario: Desglose por género

- **WHEN** el usuario tiene escuchas con etiquetas de género
- **THEN** ve el tiempo por género con proporciones coherentes con el total

#### Scenario: Desglose por país

- **WHEN** el usuario tiene escuchas de varios países
- **THEN** ve el tiempo por país con nombre y duración

#### Scenario: Metadatos ausentes

- **WHEN** una emisora no tiene género o país
- **THEN** su tiempo aparece agrupado como "desconocido" y no se pierde

### Requirement: Escuchas recientes

La página SHALL mostrar las escuchas recientes del usuario ordenadas de más reciente a más antigua, cada una con emisora, fecha de inicio y duración.

#### Scenario: Lista de recientes

- **WHEN** el usuario tiene escuchas
- **THEN** ve sus escuchas ordenadas por fecha descendente con emisora, inicio y duración

#### Scenario: Recientes sin datos

- **WHEN** el usuario no tiene escuchas
- **THEN** ve un estado vacío que invita a reproducir una emisora

### Requirement: Estados de carga, error y coherencia

Cada sección SHALL mostrar carga, error con reintento y vacío de forma independiente y en español, sin bloquear al resto de secciones ante un fallo parcial.

#### Scenario: Carga inicial

- **WHEN** se abre la página y las consultas están en curso
- **THEN** cada sección muestra un estado de carga reconocible

#### Scenario: Error parcial con reintento

- **WHEN** una sección falla al cargar
- **THEN** esa sección muestra el error en español con acción de reintentar mientras el resto sigue visible

#### Scenario: Textos en español

- **WHEN** el usuario navega por cualquier estado de la página
- **THEN** todos los títulos, filtros, gráficos, ejes y mensajes están en español

### Requirement: Privacidad y aislamiento en la visualización

La página SHALL mostrar únicamente las estadísticas del usuario de la sesión actual y SHALL responder a la expiración del token renovando la sesión o pidiendo un nuevo inicio, sin exponer datos de otras cuentas.

#### Scenario: Aislamiento entre usuarios

- **WHEN** dos usuarios con escuchas distintas abren sus estadísticas
- **THEN** cada uno ve solo sus propios datos

#### Scenario: Sesión caducada

- **WHEN** el token caduca al cargar estadísticas
- **THEN** la sesión se renueva o se pide iniciar sesión, sin mostrar datos ajenos ni errores crípticos

### Requirement: Legibilidad en móvil y temas

La página SHALL ser legible en móvil (<640px) sin desplazamiento horizontal forzado y SHALL respetar los temas claro y oscuro con contraste suficiente en textos, ejes y celdas.

#### Scenario: Vista móvil

- **WHEN** el usuario abre las estadísticas en un móvil
- **THEN** las secciones se apilan en vertical y cada gráfico sigue siendo interpretable sin zoom horizontal

#### Scenario: Cambio de tema

- **WHEN** el usuario alterna entre tema claro y oscuro
- **THEN** todos los gráficos y el mapa de calor mantienen contraste y no quedan textos invisibles
