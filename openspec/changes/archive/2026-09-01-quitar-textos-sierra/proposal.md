## Why

El usuario no desea que la interfaz haga referencia explícita a la "sierra" en sus textos visibles. Se prefiere un lenguaje más genérico y sin florituras para los mensajes de la aplicación.

## What Changes

Reemplazar los textos visibles en la interfaz que mencionan "sierra" por alternativas genéricas:

- **PlayerBar**: "Elige una emisora para empezar a escuchar la sierra en directo" → texto genérico
- **History**: "Lo último que has escuchado en la sierra." → texto genérico
- **Register**: "Guárdate las emisoras de la sierra que más te gusten." → texto genérico
- **Login**: "Accede a tus favoritos e historial mientras exploras la sierra." → texto genérico
- **Explore**: "Buscando en la sierra…" → texto genérico
- **Home**: Texto del subtítulo con referencia a la sierra → texto genérico

No se modifican componentes (`SierraEmblem`, `SierraIllustration`), el SVG (`sierra.svg`) ni los specs existentes. Es un cambio cosmético de textos de UI únicamente.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna. Este cambio no altera requerimientos de comportamiento de specs existentes — solo reemplaza strings literales de la UI. No afecta a la identidad visual ni al comportamiento de la aplicación.

## Impact

- **Archivos afectados**: `apps/web/src/components/PlayerBar.tsx`, `apps/web/src/pages/History.tsx`, `apps/web/src/pages/Register.tsx`, `apps/web/src/pages/Login.tsx`, `apps/web/src/pages/Explore.tsx`, `apps/web/src/pages/Home.tsx`
- **APIs / dependencias**: Ninguna
- **Riesgo**: Mínimo — cambio cosmético sin impacto funcional
