## 1. Páginas internas de documentación

- [x] 1.1 Crear `docs/uso.md` trasladando la sección "Características" y el contenido usable del README (exploración, cuentas, favoritos, historial, reproductor, tema) y verificar que el texto queda íntegro.
- [x] 1.2 Crear `docs/instalacion.md` con requisitos, arranque local, comandos raíz, migraciones y la tabla de variables de entorno del README actual; verificar que la tabla conserva todas las filas.
- [x] 1.3 Crear `docs/despliegue.md` con la sección "Despliegue con Docker" y el uso de la imagen GHCR; verificar que se conservan los ejemplos y comandos.
- [x] 1.4 Crear `docs/arquitectura.md` con las secciones "Arquitectura" y "Requisitos" del README; verificar que el arbol del monorepo y las notas de almacenamiento/sesiones/catálogo se conservan.
- [x] 1.5 Crear `docs/api.md` con la sección "Uso de la API": enlaces a OpenAPI, tabla de endpoints y formato de errores; verificar que las 20 filas de endpoints se copian completas.
- [x] 1.6 Crear `docs/desarrollo.md` con los comandos de desarrollo, migraciones de base de datos, "Integración continua y publicación" y "Versionado automático"; verificar que no se pierde ninguna regla ni comando.
- [x] 1.7 Crear `docs/licencia.md` con la licencia MIT y enlace a `LICENSE`; verificar que el enlace relativo resuelve.

## 2. Portada (README.md)

- [x] 2.1 Reescribir `README.md` como portada breve: nombre, tagline ("Exploración radiofónica libre y autoalojada."), párrafo de descripción parafraseando `apps/web/src/pages/Home.tsx`, grafismo ASCII/SVG inspirado en la Sierra de Tolocha, lista de 6-8 capacidades y tabla de contenidos con enlaces relativos a `docs/`.
- [x] 2.2 Quitar del README todo bloque técnico (arquitectura, variables, endpoints, Docker, CI, versionado) para que solo quede lo que se ve en la portada de la web; verificar que ningún bloque técnico permanece en el README.

## 3. Referencias y verificación

- [x] 3.1 Localizar y actualizar referencias externas a anclas/secciones del README que desaparezcan (p. ej. en `AGENTS.md`, workflows de GitHub u otros documentos); verificar con grep que quedan 0 referencias rotas al README interno.
- [x] 3.2 Cotejo final de contenido: comparar el README original con las páginas de `docs/` para confirmar que no hay pérdida de información (variables, endpoints, reglas de versionado, avisos); verificar que cada sección original tiene su equivalencia en `docs/`.
- [x] 3.3 Comprobar que los enlaces relativos del README y de `docs/` resuelven (p. ej. `docs/uso.md`, `LICENSE`); si hay una forma de render local o workflow de docs, usarla; en su defecto, revisión manual de rutas.
- [x] 3.4 Confirmar que no se tocó código de `apps/`, `scripts/` ni `openspec/specs/` y que la rama pasa `npm run typecheck` + `npm run lint` (solo para descartar efectos de importaciones; no procede build/test al no cambiar runtime).