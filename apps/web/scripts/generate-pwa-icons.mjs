// Genera los iconos PWA derivados de `public/icons/tolocha.svg`.
// Uso: `node scripts/generate-pwa-icons.mjs` (desde `apps/web`).
// Los PNG resultantes se commitean para builds reproducibles sin red.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const src = join(webRoot, "public", "icons", "tolocha.svg");

const svg = await readFile(src);

async function render(size, dest, options = {}) {
  const { density = 512, background = null } = options;
  let pipeline = sharp(svg, { density }).resize(size, size, { fit: "contain" });
  if (background) {
    pipeline = pipeline.flatten({ background });
  }
  await pipeline.png().toFile(join(webRoot, "public", "icons", dest));
  console.log(`generado icons/${dest} (${size}x${size})`);
}

// Iconos "any": el SVG ya trae fondo redondeado propio.
await render(192, "pwa-192.png");
await render(512, "pwa-512.png");
// Apple touch: fondo opaco (iOS no admite transparencia).
await render(180, "apple-touch-icon-180.png", { background: "#0f1a12" });

// Maskable con zona segura: motivo al ~80 % centrado sobre fondo pine-900.
const motif = await sharp(svg, { density: 512 })
  .resize(410, 410, { fit: "contain" })
  .png()
  .toBuffer();
await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: "#0f1a12",
  },
})
  .composite([{ input: motif, gravity: "center" }])
  .png()
  .toFile(join(webRoot, "public", "icons", "maskable-512.png"));
console.log("generado icons/maskable-512.png (512x512, zona segura)");
