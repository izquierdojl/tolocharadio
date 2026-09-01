## Context

Ver proposal.md para la motivación. La aplicación web de TolochaRadio no expone la versión actual al usuario ni detecta actualizaciones. La versión vive en `package.json` (actualmente `0.16.0`) pero no se inyecta en el build. El proyecto usa Vite + React + TypeScript con Zustand para estado.

## Goals / Non-Goals

**Goals:**
- Mostrar la versión de la app en el footer de forma discreta
- Detectar releases nuevos en GitHub y enlazar directamente
- No golpear la API de GitHub en cada recarga (cache)
- Degradación graceful: si falla la comprobación, solo se muestra la versión local

**Non-Goals:**
- Notificaciones push o toast para actualizaciones
- Auto-update o service workers
- Comprobación periódica mientras la pestaña está abierta
- Mostrar changelog o diff entre versiones

## Decisions

### D1: Inyección de versión via Vite `define`

**Elección**: Usar `define` en `vite.config.ts` para crear una constante global `__APP_VERSION__`.

**Alternativas consideradas**:
- `import.meta.env.VITE_VERSION`: requiere `.env` o inyección manual, más verboso
- Endpoint `/api/version`: añade latencia y dependencia de la API para algo estático
- Leer `package.json` directamente: no funciona en el browser, rompe el bundle

**Rationale**: `define` es el mecanismo nativo de Vite para constantes de build. Reemplaza el string en tiempo de compilación, zero overhead en runtime. Se importa `version` del `package.json` raíz (no del workspace) para mantener una sola fuente de verdad.

### D2: Hook custom `useVersionCheck`

**Elección**: Crear un hook `useVersionCheck.ts` que encapsule la lógica de fetch + comparación + cache.

**Alternativas consideradas**:
- Zustand store: innecesario, el estado es local al footer y se lee una vez
- Lógica inline en Footer: mezcla concerns, difícil de testear
- React Query: overkill para un fetch puntual con cache propia

**Rationale**: Un hook custom es el patrón más ligero. Devuelve `{ current, latest, hasUpdate, releaseUrl }`. La cache en sessionStorage evita requests repetidos.

### D3: Comparación semver manual

**Elección**: Implementar parsing y comparación de semver inline (split por `.`, comparar major -> minor -> patch).

**Alternativas consideradas**:
- `semver` package: añade dependencia para 10 líneas de código
- Comparación de strings: `0.9.0` > `0.16.0` en string, incorrecto

**Rationale**: La comparación es trivial (3 números), no justifica una dependencia externa.

### D4: Posición del footer

**Elección**: Componente `Footer` renderizado en `AppShell.tsx` entre `MountainWall` y `PlayerBar`.

**Rationale**: Respeta el layout existente. La montaña es decorativa, el footer añade información útil debajo. El PlayerBar sigue siendo sticky bottom.

### D5: Estilo del footer

**Elección**: `text-xs text-muted`, link al release con hover sutil. Sin fondo diferenciado.

**Rationale**: Debe ser discreto, no competir con el contenido principal. Consistente con el sistema de diseño existente.

## Risks / Trade-offs

- **[Rate limit GitHub API]** → Mitigado por sessionStorage cache (TTL 5 min). 60 req/hora es más que suficiente para uso normal.
- **[CORS en GitHub API]** → La API pública de GitHub permite requests desde el browser para repos públicos. Sin problema.
- **[Tag format]** → Asumimos que los tags son `vX.Y.Z`. Si el formato cambia, la comprobación falla silenciosamente (mostrando solo versión local). Aceptable.
- **[Comparación semver incompleta]** → No manejamos pre-releases (`1.0.0-beta`). No aplica a este proyecto.
