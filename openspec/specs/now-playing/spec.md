# now-playing Specification

## Purpose

Informar al oyente de qué está sonando ahora en la emisora (canción o programa) a partir de los metadatos ICY que emite el origen, sin alterar el flujo de audio que recibe el cliente.

## Requirements

### Requirement: Consulta del título actual
El sistema SHALL exponer un endpoint autenticado que, para una emisora dada, devuelva el título que suena ahora, o `null` cuando no haya uno válido. La respuesta SHALL ser `200` con el identificador de la emisora y el título aunque no se pueda obtener ningún título; la falta de metadatos no es un error.

#### Scenario: Emisora con título ICY válido
- **WHEN** un usuario autenticado consulta el título actual de una emisora cuyo origen emite un `StreamTitle` válido
- **THEN** el sistema responde `200` con ese título

#### Scenario: Emisora sin metadatos o inaccesible
- **WHEN** un usuario autenticado consulta una emisora cuyo origen no emite metadatos ICY, envía un bloque vacío, no responde o falla
- **THEN** el sistema responde `200` con `title: null`

#### Scenario: Sin autenticación
- **WHEN** un cliente consulta el título actual sin token o con un token inválido
- **THEN** el sistema responde `401` en el formato de error estándar

#### Scenario: Emisora inexistente
- **WHEN** un usuario autenticado consulta el título de una emisora que no existe o a la que no tiene acceso
- **THEN** el sistema responde con el mismo error que el resto de endpoints de reproducción para esa emisora

### Requirement: Lectura de metadatos sin alterar el audio
El sistema SHALL obtener el título solicitando metadatos ICY al origen en una conexión independiente del stream de audio que recibe el cliente, y SHALL cerrarla en cuanto lea el primer bloque de metadatos o se agote un tiempo máximo de unos 5 segundos. El audio servido al cliente SHALL seguir sin metadatos ICY intercalados.

#### Scenario: Audio intacto
- **WHEN** un cliente reproduce una emisora y a la vez consulta su título actual
- **THEN** el stream de audio recibido no contiene bloques de metadatos ICY y la reproducción no se ve afectada

#### Scenario: Origen lento
- **WHEN** el origen no entrega el primer bloque de metadatos dentro del tiempo máximo
- **THEN** el sistema cierra la conexión y responde `title: null`

#### Scenario: Intervalo de metadatos anómalo
- **WHEN** el origen anuncia un intervalo de metadatos ausente, no numérico o excesivamente grande
- **THEN** el sistema no lee más allá de un límite acotado de bytes y responde `title: null`

### Requirement: Cobertura de formatos de emisora
El sistema SHALL obtener el título de las emisoras de stream directo y de las de lista M3U/PLS, sondeando en este caso las entradas HTTPS de la lista en orden con las mismas reglas de seguridad que la reproducción. Para emisoras HLS (`.m3u8`) el sistema SHALL responder `title: null` sin contactar con el origen.

#### Scenario: Emisora de lista M3U/PLS
- **WHEN** se consulta el título de una emisora `.m3u` o `.pls` cuya primera entrada HTTPS que responde emite metadatos ICY
- **THEN** el sistema devuelve el título de esa entrada

#### Scenario: Emisora HLS
- **WHEN** se consulta el título de una emisora `.m3u8`
- **THEN** el sistema responde `title: null` sin descargar el manifiesto

### Requirement: Filtrado de títulos no informativos
El sistema SHALL normalizar el texto recibido (recorte, espacios, caracteres de control y longitud máxima) y SHALL devolver `null` en lugar de un texto que no informe de lo que suena: vacío, solo el nombre de la emisora o su `icy-name`, avisos genéricos de emisión en directo, URLs o dominios, y códigos internos sin espacios.

#### Scenario: Título igual al nombre de la emisora
- **WHEN** el `StreamTitle` coincide con el nombre de la emisora o con su `icy-name`, o solo contiene palabras de ese nombre, sin distinguir mayúsculas ni tildes (p. ej. "Loca URBAN" en "Loca FM Urban")
- **THEN** el sistema responde `title: null`

#### Scenario: Aviso genérico de directo
- **WHEN** el `StreamTitle` solo combina el nombre de la emisora con expresiones como "en directo", "emisión en directo" o "live"
- **THEN** el sistema responde `title: null`

#### Scenario: Publicidad con URL o dominio
- **WHEN** el `StreamTitle` contiene una URL o un nombre de dominio (p. ej. "shopify.com - ...")
- **THEN** el sistema responde `title: null`

#### Scenario: Código interno
- **WHEN** el `StreamTitle` es un único token sin espacios con guiones bajos o de aspecto técnico (p. ej. "FHR_2026_NatalieRivera_NH")
- **THEN** el sistema responde `title: null`

#### Scenario: Título informativo
- **WHEN** el `StreamTitle` es un texto como "Maná - Clavado en un bar" o "con Antonio San José - FIKA CAFE"
- **THEN** el sistema devuelve el texto normalizado, decodificado correctamente aunque el origen use UTF-8 o Latin-1

### Requirement: Caché compartida de títulos
El sistema SHALL cachear el resultado por emisora durante unos 25 segundos y compartirlo entre todos los usuarios, SHALL agrupar en una sola sonda las consultas simultáneas a la misma emisora y SHALL recordar durante más tiempo (unos 10 minutos) que una emisora no anuncia metadatos ICY, para no sondearla en cada consulta.

#### Scenario: Consultas repetidas
- **WHEN** varios usuarios consultan el título de la misma emisora dentro del periodo de caché
- **THEN** el sistema contacta con el origen como máximo una vez y todos reciben el mismo resultado

#### Scenario: Emisora sin soporte ICY
- **WHEN** una emisora no anunció intervalo de metadatos en la última sonda
- **THEN** las consultas siguientes durante el periodo de caché negativa responden `title: null` sin contactar con el origen

### Requirement: Sonda sin efectos colaterales
La consulta del título SHALL NOT registrar historial ni estadísticas de escucha y SHALL NOT reenviar la cabecera de autorización del cliente al origen.

#### Scenario: Sin historial ni estadísticas
- **WHEN** un usuario consulta el título actual de una emisora
- **THEN** su historial y sus estadísticas de escucha no cambian

#### Scenario: Bearer no reenviado
- **WHEN** el sistema sondea el origen para obtener el título
- **THEN** la petición saliente no incluye la cabecera de autorización del cliente

### Requirement: Consulta condicionada en el cliente
El cliente web SHALL consultar el título actual solo mientras una emisora está sonando y la pestaña está visible, nada más empezar a sonar y después aproximadamente cada 30 segundos. SHALL dejar de consultar al pausar, detener, ocultar la pestaña o fallar la reproducción, y SHALL descartar el título anterior al cambiar de emisora.

#### Scenario: Inicio de la reproducción
- **WHEN** una emisora pasa a estado de reproducción con la pestaña visible
- **THEN** el cliente consulta el título de inmediato y repite la consulta periódicamente

#### Scenario: Pestaña oculta o pausa
- **WHEN** el usuario pausa o la pestaña deja de estar visible
- **THEN** el cliente deja de consultar hasta que vuelva a sonar con la pestaña visible

#### Scenario: Cambio de emisora
- **WHEN** el usuario cambia a otra emisora
- **THEN** el título de la emisora anterior deja de mostrarse de inmediato, y nunca se muestra el de otra emisora aunque llegue una respuesta tardía

#### Scenario: Fallo de la consulta
- **WHEN** una consulta del título falla por red o error del servidor
- **THEN** la reproducción continúa sin avisos al usuario y se reintenta en la siguiente consulta periódica

### Requirement: Metadatos en Media Session
Cuando el navegador ofrezca la Media Session API, el cliente SHALL publicar los metadatos de la emisora en reproducción: título actual como título y nombre de la emisora como artista, o el nombre de la emisora como título si no hay título, con su logotipo como imagen cuando exista. Al detener la reproducción SHALL limpiar esos metadatos.

#### Scenario: Título disponible
- **WHEN** suena una emisora con título actual válido
- **THEN** los controles multimedia del sistema muestran ese título y el nombre de la emisora

#### Scenario: Sin título
- **WHEN** suena una emisora sin título actual
- **THEN** los controles multimedia del sistema muestran el nombre de la emisora

#### Scenario: Navegador sin Media Session
- **WHEN** el navegador no ofrece la Media Session API
- **THEN** el reproductor funciona igual sin errores
