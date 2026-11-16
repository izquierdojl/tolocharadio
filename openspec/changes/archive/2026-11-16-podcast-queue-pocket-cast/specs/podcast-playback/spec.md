# Spec Delta

## ADDED Requirements

### Requirement: Reproducción desde listas y desde la cola
Al iniciar la reproducción de un episodio desde una lista o desde la cola de podcasts, el reproductor SHALL reanudar desde la última posición guardada aplicando las mismas reglas que la reproducción directa (ignorar posiciones menores de 5 s o a menos de 30 s del final). Si el episodio ya es el actual, la acción SHALL alternar pausa/reanudación sin reiniciarlo. Un episodio completado SHALL empezar desde el principio.

#### Scenario: Reanudar desde una lista
- **WHEN** un usuario reproduce desde una lista un episodio con progreso guardado en el minuto 12:00
- **THEN** el reproductor inicia el episodio en 12:00

#### Scenario: Alternar el episodio actual
- **WHEN** un usuario activa reproducir o pausar sobre el episodio que ya está cargado
- **THEN** el reproductor alterna el estado sin reiniciar la posición

#### Scenario: Episodio completado
- **WHEN** un usuario reproduce desde una lista o la cola un episodio marcado como completado
- **THEN** el reproductor empieza desde el segundo 0

#### Scenario: Posición no reanudable
- **WHEN** el progreso guardado está por debajo de 5 s o a menos de 30 s del final
- **THEN** el reproductor empieza desde el segundo 0, igual que en la reproducción directa
