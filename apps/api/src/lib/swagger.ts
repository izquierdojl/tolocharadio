import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);

interface SwaggerUiDist {
  absolutePath: () => string;
}

export function swaggerUiDistPath(): string {
  const swaggerUiDist = require("swagger-ui-dist") as SwaggerUiDist;
  return resolve(String(swaggerUiDist.absolutePath()));
}

export function swaggerUiHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>TolochaRadio - Documentacion de la API</title>
    <link rel="stylesheet" href="/swagger/swagger-ui.css" />
    <style>html{box-sizing:border-box;overflow:auto}body{margin:0;background:#fafafa}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/swagger/swagger-ui-bundle.js"></script>
    <script src="/swagger/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: "/api/v1/openapi.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        });
      };
    </script>
  </body>
</html>`;
}