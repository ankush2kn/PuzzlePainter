// Regenerates every app/bookmark icon from public/logo.png.
// Run with: node scripts/generate-icons.mjs
// Uses `sharp`, which is already installed as a dependency of Next.js.
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC = "public/logo.png";
const OUT = "public";

// Soft pink → sky gradient, matching the studio's page background.
const BACKGROUND_SVG = (size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffd6e8"/><stop offset="1" stop-color="#c9efff"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
  </svg>`);

// Logo with the empty transparent margin removed.
const trimmed = await sharp(SRC).trim({ threshold: 10 }).toBuffer();

// Fit the trimmed logo into a `size` square, occupying `scale` of it.
async function logoOn(size, scale, background) {
  const inner = Math.round(size * scale);
  const logo = await sharp(trimmed)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const base = background
    ? sharp(BACKGROUND_SVG(size))
    : sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  return base.composite([{ input: logo, gravity: "center" }]).png().toBuffer();
}

const outputs = [
  // Transparent "any" icons: browser tabs, PWA install, in-app header.
  ["icon-192.png", 192, 0.94, false],
  ["icon-512.png", 512, 0.94, false],
  // Android adaptive icons crop to a circle — keep the logo inside the ~66% safe zone.
  ["icon-maskable-192.png", 192, 0.66, true],
  ["icon-maskable-512.png", 512, 0.66, true],
  // iOS/iPadOS fills transparency with black, so this one needs a solid background.
  ["apple-touch-icon.png", 180, 0.8, true],
];

for (const [name, size, scale, bg] of outputs) {
  await writeFile(`${OUT}/${name}`, await logoOn(size, scale, bg));
}

// favicon.ico: PNG-encoded entries at 16/32/48 (supported by all current browsers).
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map((s) => logoOn(s, 1, false)));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(icoSizes[i], e);
  header.writeUInt8(icoSizes[i], e + 1);
  header.writeUInt16LE(1, e + 4); // color planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
await writeFile(`${OUT}/favicon.ico`, Buffer.concat([header, ...pngs]));

console.log("Icons written to public/");
