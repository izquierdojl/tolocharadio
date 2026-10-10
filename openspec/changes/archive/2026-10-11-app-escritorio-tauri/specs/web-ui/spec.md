# Spec Delta

## ADDED Requirements

### Requirement: Integración con el cliente de escritorio
La interfaz SHALL detectar cuándo se ejecuta dentro del cliente de escritorio de TolochaRadio y, en ese caso, SHALL publicar el estado del reproductor (emisora actual, reproducción/pausa, carga y volumen) y SHALL obedecer comandos de reproducción (reproducir/pausar, detener, volumen) enviados por el contenedor. Fuera del cliente de escritorio, la interfaz SHALL comportarse igual que en navegador y PWA, sin requerir las APIs nativas.

#### Scenario: Publicación del estado del reproductor
- **WHEN** la interfaz se ejecuta dentro del cliente de escritorio y cambia la emisora o el estado de reproducción
- **THEN** comunica el nuevo estado al contenedor para que la bandeja y el centro de medios lo reflejen

#### Scenario: Obediencia de comandos del contenedor
- **WHEN** el contenedor envía un comando de reproducir/pausar, detener o cambiar el volumen
- **THEN** el reproductor de la interfaz aplica ese comando y actualiza su estado visible

#### Scenario: Comportamiento intacto fuera del cliente de escritorio
- **WHEN** la interfaz se abre en un navegador o como PWA instalada
- **THEN** funciona igual que antes, sin depender de APIs nativas ni mostrar errores por su ausencia

#### Scenario: Comando sin emisora seleccionada
- **WHEN** el contenedor envía un comando de reproducción sin que haya una emisora seleccionada
- **THEN** la interfaz ignora el comando de forma segura, sin errores visibles ni cambios de estado inconsistentes
