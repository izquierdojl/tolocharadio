# Spec Delta

## ADDED Requirements

### Requirement: Estado de error y reintento en el reproductor
El reproductor SHALL comunicar en español cuando una emisora no se puede reproducir, SHALL ofrecer una acción para reintentar y SHALL mostrar un estado de reconexión mientras lo intenta. NO SHALL mostrar un indicador de buffering indefinido cuando la reproducción ha fallado.

#### Scenario: Error de reproducción
- **WHEN** una emisora no se puede reproducir
- **THEN** el reproductor muestra un mensaje en español y un botón para reintentar

#### Scenario: Reconexión en curso
- **WHEN** el reproductor está reintentando tras una interrupción
- **THEN** la barra muestra un estado de reconexión distinto del de reproducción normal

#### Scenario: Recuperación
- **WHEN** la emisora vuelve a sonar tras un reintento
- **THEN** el mensaje de error desaparece y el reproductor vuelve al estado normal

#### Scenario: Reintento manual
- **WHEN** el usuario pulsa reintentar tras agotar los reintentos automáticos
- **THEN** el reproductor vuelve a intentar la emisora seleccionada

#### Scenario: Emisora no disponible antes de reproducir
- **WHEN** la comprobación de disponibilidad indica que la emisora no es reproducible
- **THEN** la interfaz lo comunica antes de iniciar la reproducción
