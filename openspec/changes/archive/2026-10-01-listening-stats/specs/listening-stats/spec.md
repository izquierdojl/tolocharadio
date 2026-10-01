# Spec Delta

## Purpose

Mide server-side el tiempo que cada usuario dedica a cada emisora mientras el audio pasa por el proxy de playback, y expone esas estadísticas de forma privada para que el usuario consulte sus emisoras más escuchadas, su evolución, sus hábitos y sus escuchas recientes.

## ADDED Requirements

### Requirement: Captura del tiempo de escucha sin cambios en el cliente
El sistema SHALL medir el tiempo de escucha de cada usuario autenticado por emisora mientras su audio pasa por el proxy de playback, sin requerir cambios en los clientes. Solo SHALL acumular mientras el audio fluye realmente hacia el cliente (bytes en directo y listas, segmentos en HLS); las pausas, los atascos y las consultas de disponibilidad SHALL NOT acumular.

#### Scenario: Escucha directa acumula tiempo
- **WHEN** un usuario autenticado reproduce una emisora directa por el proxy y los bytes fluyen hacia el cliente
- **THEN** el sistema acumula ese tiempo para el usuario y la emisora

#### Scenario: La pausa no computa
- **WHEN** el cliente deja de consumir el flujo (pausa) y lo reanuda después
- **THEN** el intervalo sin flujo no se acumula como escucha

#### Scenario: Escucha HLS por segmentos
- **WHEN** el cliente reproduce una emisora HLS solicitando variantes y segmentos a través del proxy
- **THEN** el sistema acumula el tiempo de escucha correspondiente a los segmentos solicitados

#### Scenario: La consulta de disponibilidad no computa
- **WHEN** el cliente consulta la disponibilidad del stream de una emisora
- **THEN** el sistema no acumula tiempo de escucha

#### Scenario: Conexiones simultáneas no duplican
- **WHEN** existen dos conexiones simultáneas del mismo usuario con la misma emisora (por ejemplo, dos pestañas)
- **THEN** el tiempo se acumula una sola vez

### Requirement: Registro de escuchas con duración
El sistema SHALL registrar cada escucha con el usuario, la emisora (incluidos los datos necesarios para mostrarla, como nombre e imagen), el origen, el instante de inicio y la duración, de modo que el usuario pueda consultar sus escuchas recientes de forma individual.

#### Scenario: Escucha registrada
- **WHEN** un usuario escucha una emisora por el proxy
- **THEN** el sistema registra una escucha con esa emisora, su instante de inicio y su duración al terminar

#### Scenario: Reescucha genera un registro nuevo
- **WHEN** un usuario vuelve a escuchar una emisora que ya había escuchado
- **THEN** el sistema registra una escucha nueva e independiente de la anterior

#### Scenario: Emisora personalizada
- **WHEN** la emisora escuchada es una emisora personalizada del usuario
- **THEN** el sistema la registra igual que una emisora del catálogo

### Requirement: Acumulación por emisora y hora local
El sistema SHALL mantener acumulados de duración por usuario, emisora y hora local, con una zona horaria configurable cuyo valor por defecto SHALL ser `Europe/Madrid`, y SHALL persistirlos periódicamente de forma que un reinicio pierda como máximo el intervalo en curso. El acumulado SHALL NOT duplicarse al cerrar una escucha ya volcada parcialmente.

#### Scenario: Franja horaria local
- **WHEN** un usuario escucha en una hora local concreta
- **THEN** su duración se acumula en la franja de esa hora local

#### Scenario: Persistencia ante reinicio
- **WHEN** la API se reinicia
- **THEN** se conserva el acumulado persistido hasta el último volcado

#### Scenario: Sin doble conteo
- **WHEN** una escucha termina después de varios volcados parciales
- **THEN** su tiempo acumulado total no se duplica

### Requirement: Emisoras más escuchadas
El usuario autenticado SHALL poder consultar sus emisoras más escuchadas por tiempo acumulado, con los datos de presentación de cada emisora.

#### Scenario: Ranking de emisoras
- **WHEN** el usuario consulta sus emisoras más escuchadas
- **THEN** recibe la lista ordenada de mayor a menor tiempo, con el total acumulado por emisora

#### Scenario: Usuario sin escuchas
- **WHEN** el usuario no tiene escuchas registradas
- **THEN** recibe una lista vacía

### Requirement: Evolución temporal de la escucha
El usuario autenticado SHALL poder consultar su tiempo de escucha agregado por día, semana o mes dentro de un rango de fechas.

#### Scenario: Serie diaria
- **WHEN** el usuario consulta su evolución por día en un rango
- **THEN** recibe una serie con el tiempo escuchado en cada día del rango y los días sin escucha aparecen con duración cero

#### Scenario: Otras granularidades
- **WHEN** el usuario consulta su evolución por semana o por mes
- **THEN** el tiempo se agrupa por esas unidades

### Requirement: Hábitos de escucha por hora y día
El usuario autenticado SHALL poder consultar la distribución de su tiempo de escucha por hora local y día de la semana.

#### Scenario: Distribución por hora y día
- **WHEN** el usuario consulta sus hábitos
- **THEN** recibe la duración acumulada por cada combinación de hora local y día de la semana

#### Scenario: Sin actividad
- **WHEN** el usuario no tiene escuchas
- **THEN** la distribución devuelve ceros o una lista vacía de forma coherente

### Requirement: Desglose por género y país
El usuario autenticado SHALL poder consultar su tiempo de escucha agrupado por género (etiquetas de la emisora) y por país.

#### Scenario: Desglose por género
- **WHEN** el usuario consulta el desglose por género
- **THEN** recibe el tiempo acumulado por etiqueta de las emisoras escuchadas, sumando el tiempo de una emisora en cada una de sus etiquetas

#### Scenario: Desglose por país
- **WHEN** el usuario consulta el desglose por país
- **THEN** recibe el tiempo acumulado por país de las emisoras escuchadas

#### Scenario: Metadatos ausentes
- **WHEN** una emisora escuchada no tiene género o país
- **THEN** su tiempo se agrupa bajo una categoría desconocida

### Requirement: Escuchas recientes con duración
El usuario autenticado SHALL poder listar sus escuchas recientes con la emisora, el instante de inicio y la duración de cada una, ordenadas de más reciente a más antigua.

#### Scenario: Listado de escuchas recientes
- **WHEN** el usuario consulta sus escuchas recientes
- **THEN** recibe sus escuchas ordenadas por fecha descendente, cada una con emisora, inicio y duración

#### Scenario: Sin escuchas
- **WHEN** el usuario no tiene escuchas
- **THEN** recibe una lista vacía

### Requirement: Privacidad de las estadísticas de escucha
Las estadísticas de escucha SHALL ser privadas de cada cuenta: todos sus endpoints SHALL requerir autenticación y devolver únicamente datos del usuario del token; ningún usuario SHALL poder consultar ni modificar datos de otra cuenta.

#### Scenario: Sin credenciales
- **WHEN** un cliente sin token válido consulta cualquier endpoint de estadísticas
- **THEN** el sistema responde con un error 401 en el formato estándar

#### Scenario: Aislamiento entre usuarios
- **WHEN** dos usuarios con escuchas distintas consultan sus estadísticas
- **THEN** cada uno recibe únicamente los datos de sus propias escuchas

#### Scenario: Datos de otro usuario
- **WHEN** un usuario intenta consultar estadísticas de otra cuenta
- **THEN** el sistema no revela información de la otra cuenta
