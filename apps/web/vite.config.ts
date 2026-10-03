import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rootPkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8")) as { version: string };

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // El SW solo se genera en `vite build`; en `vite dev` queda desactivado.
      registerType: "prompt",
      includeAssets: ["icons/tolocha.svg", "icons/apple-touch-icon-180.png"],
      manifest: {
        name: "TolochaRadio",
        short_name: "Tolocha",
        description: "Radio personal: explora, guarda favoritas y escucha tus emisoras.",
        lang: "es",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#0f1a12",
        background_color: "#0f1a12",
        categories: ["music", "entertainment"],
        icons: [
          {
            src: "icons/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache solo de la cáscara versionada (html/js/css + iconos).
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        // La SPA resuelve rutas en cliente; /api nunca cae al fallback.
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            // La API con sesión nunca se sirve stale.
            urlPattern: /\/api\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Los streams de audio nunca se cachean (flujo infinito).
            urlPattern: ({ request }) =>
              request.destination === "audio" || request.destination === "video",
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});