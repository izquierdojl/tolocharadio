## 1. Reemplazo de textos en componentes

- [x] 1.1 Reemplazar el texto de `PlayerBar.tsx` ("Elige una emisora para empezar a escuchar la sierra en directo") por un texto genérico y verificar con `npm run typecheck -w @tolocharadio/web`
- [x] 1.2 Reemplazar el texto de `History.tsx` ("Lo último que has escuchado en la sierra.") por un texto genérico y verificar con `npm run typecheck -w @tolocharadio/web`
- [x] 1.3 Reemplazar el texto de `Register.tsx` ("Guárdate las emisoras de la sierra que más te gusten.") por un texto genérico y verificar con `npm run typecheck -w @tolocharadio/web`
- [x] 1.4 Reemplazar el texto de `Login.tsx` ("Accede a tus favoritos e historial mientras exploras la sierra.") por un texto genérico y verificar con `npm run typecheck -w @tolocharadio/web`
- [x] 1.5 Reemplazar el texto de `Explore.tsx` ("Buscando en la sierra…") por un texto genérico y verificar con `npm run typecheck -w @tolocharadio/web`
- [x] 1.6 Reemplazar el texto del subtítulo de `Home.tsx` que menciona la sierra por un texto genérico y verificar con `npm run typecheck -w @tolocharadio/web`

## 2. Verificación

- [x] 2.1 Verificar que no quedan referencias a "sierra" en textos de UI con `grep -ri sierra apps/web/src/` (excluyendo imports y nombres de componentes)
