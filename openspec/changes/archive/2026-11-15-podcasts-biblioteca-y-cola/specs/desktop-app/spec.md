# Spec Delta

## ADDED Requirements

### Requirement: Controles de pista siguiente/anterior y metadatos de episodio en escritorio
Cuando el reproductor esté reproduciendo un episodio de podcast dentro del cliente de escritorio, la interfaz SHALL publicar al contenedor el tipo de medio (`podcast`), la duración y la posición actual junto con el título del episodio y el nombre del programa, y el contenedor SHALL habilitar las acciones `Next` y `Previous` en los controles multimedia del sistema operativo (MPRIS/SMTC) para avanzar o retroceder en la cola de podcasts.

#### Scenario: Tecla multimedia Siguiente durante un podcast con cola
- **WHEN** el usuario pulsa la tecla multimedia `Next` del sistema operativo mientras escucha un podcast en el cliente de escritorio
- **THEN** el contenedor reenvía el comando a la interfaz y el reproductor avanza al siguiente episodio de la cola
