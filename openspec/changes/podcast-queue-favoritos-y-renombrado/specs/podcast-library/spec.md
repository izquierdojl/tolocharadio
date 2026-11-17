# Spec Delta

## ADDED Requirements

### Requirement: Favorito desde las filas de la cola de reproducción
En la página `/podcasts/cola`, cada episodio pendiente SHALL mostrar un control de favorito que refleje si ya está guardado. Al activarlo, la interfaz SHALL marcar o quitar el episodio como favorito mediante los endpoints existentes, confirmar la acción con un aviso y reflejar el nuevo estado sin alterar el orden de la cola. Mientras la petición está en curso el control SHALL deshabilitarse; si falla, SHALL mostrarse el error conservando el estado anterior.

#### Scenario: Marcar un episodio pendiente como favorito
- **WHEN** un usuario autenticado pulsa el corazón de un episodio no favorito en la cola
- **THEN** el episodio se guarda como favorito, el corazón pasa a mostrarse relleno y se confirma con un aviso

#### Scenario: Quitar un episodio favorito desde la cola
- **WHEN** un usuario pulsa el corazón de un episodio que ya es favorito en la cola
- **THEN** el episodio deja de ser favorito, el corazón vuelve a su estado vacío y se confirma con un aviso

#### Scenario: Estado inicial del favorito
- **WHEN** un usuario abre la cola con episodios que ya están guardados como favoritos
- **THEN** cada fila muestra su corazón relleno y expone el nombre accesible «Quitar de favoritos»

#### Scenario: El favorito no modifica la cola
- **WHEN** un usuario marca o quita un favorito desde la cola
- **THEN** el orden, la revisión y el número de episodios de la cola no cambian

#### Scenario: Error al actualizar el favorito
- **WHEN** la operación de favorito falla por red o por un error del servidor
- **THEN** se muestra un aviso de error y el control conserva el estado que tenía antes de la petición

### Requirement: Cabecera de la página de cola
La vista `/podcasts/cola` SHALL presentar el título «Cola de reproducción» y, justo debajo, el texto «Episodios a continuación» como subtítulo de la página, en sustitución del anterior texto descriptivo.

#### Scenario: Títulos de la cola
- **WHEN** un usuario autenticado abre `/podcasts/cola`
- **THEN** la cabecera muestra «Cola de reproducción» y debajo «Episodios a continuación»

### Requirement: Terminología de la cola en los avisos
Los avisos de error referidos al límite de la cola SHALL usar el término «cola de reproducción», sin cambiar el código `QUEUE_LIMIT_REACHED` ni el comportamiento del límite.

#### Scenario: Aviso de límite alcanzado
- **WHEN** un usuario intenta encolar un episodio con la cola llena y la API devuelve `QUEUE_LIMIT_REACHED`
- **THEN** el aviso mostrado menciona «cola de reproducción» y el máximo de episodios configurado
