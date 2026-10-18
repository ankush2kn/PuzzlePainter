// Converts a black-and-white coloring page image (PNG/WebP/JPG from fal.ai etc.)
// into a lines-layer PNG: 816x1056, pure black lines on a transparent background.
// Usage: node scripts/prepare-page.mjs <input-image> <page-id>
// Writes public/pages/<page-id>.png — then add an entry to TEMPLATES in src/lib/templates.ts.
//
// Images close to the page ratio are stretched to fill it: shapes that run off the
// source's edges stay closed against the canvas edge, so the fill tool can't leak.
// Anything further off (e.g. square images) is fitted inside the page at its own
// ratio, with a frame drawn around it to keep those off-edge shapes closed.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const [input, id] = process.argv.slice(2);
if (!input || !id) {
  console.error("Usage: node scripts/prepare-page.mjs <input-image> <page-id>");
  process.exit(1);
}

// Keep in sync with CANVAS_WIDTH / CANVAS_HEIGHT in src/lib/constants.ts.
const WIDTH = 816;
const HEIGHT = 1056;
const MAX_STRETCH = 0.06; // beyond this, fit + frame instead of stretching
const MARGIN = 32; // page margin around a framed picture
const FRAME_PAD = 12; // gap between unframed artwork and the drawn frame
const FRAME_STROKE = 4;

const source = sharp(input).flatten({ background: "#ffffff" });
const meta = await source.metadata();
const stretch = Math.abs(meta.width / meta.height / (WIDTH / HEIGHT) - 1);

let page;
if (stretch <= MAX_STRETCH) {
  page = source.resize(WIDTH, HEIGHT, { fit: "fill" });
} else {
  const { data: art, info } = await source
    .trim({ background: "#ffffff", threshold: 40 })
    .toBuffer({ resolveWithObject: true });
  // Artwork with its own border: draw our frame right on top of it, not beside it.
  const framed = await hasOwnBorder(art, info.width, info.height);
  const pad = framed ? 0 : FRAME_PAD;

  const boxW = WIDTH - 2 * (MARGIN + pad);
  const boxH = HEIGHT - 2 * (MARGIN + pad);
  const scale = Math.min(boxW / info.width, boxH / info.height);
  const w = Math.round(info.width * scale);
  const h = Math.round(info.height * scale);
  const left = Math.round((WIDTH - w) / 2);
  const top = Math.round((HEIGHT - h) / 2);
  const half = FRAME_STROKE / 2;
  const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <rect x="${left - pad + half}" y="${top - pad + half}" width="${w + 2 * pad - FRAME_STROKE}"
      height="${h + 2 * pad - FRAME_STROKE}" fill="none" stroke="#000" stroke-width="${FRAME_STROKE}"/>
  </svg>`;

  page = sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 3, background: "#ffffff" },
  }).composite([
    { input: await sharp(art).resize(w, h, { fit: "fill" }).toBuffer(), left, top },
    { input: Buffer.from(frame), left: 0, top: 0 },
  ]);
  // Composite into a buffer first so the greyscale step below sees the merged image.
  page = sharp(await page.png().toBuffer());
}

const { data } = await page.greyscale().raw().toBuffer({ resolveWithObject: true });

// Darkness → alpha. Near-white (incl. off-white noise) becomes fully transparent;
// anything reasonably dark becomes solid so thin lines still act as fill barriers.
const rgba = Buffer.alloc(WIDTH * HEIGHT * 4);
for (let i = 0; i < WIDTH * HEIGHT; i++) {
  const darkness = 255 - data[i];
  const alpha = Math.max(0, Math.min(255, Math.round(((darkness - 40) * 255) / 140)));
  rgba[i * 4 + 3] = alpha; // RGB stays 0 (black)
}

await mkdir("public/pages", { recursive: true });
const out = `public/pages/${id}.png`;
await writeFile(
  out,
  await sharp(rgba, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer(),
);
console.log(`Wrote ${out} (${stretch <= MAX_STRETCH ? "stretched" : "fitted + framed"})`);

// True if most of the trimmed artwork's outer edge pixels are dark, i.e. it's
// already enclosed by a drawn border.
async function hasOwnBorder(png, w, h) {
  const { data: px } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  const dark = (x, y) => [0, 1, 2, 3].some((d) => {
    const xx = x === 0 ? d : x === w - 1 ? w - 1 - d : x;
    const yy = y === 0 ? d : y === h - 1 ? h - 1 - d : y;
    return px[yy * w + xx] < 128;
  });
  let hits = 0;
  for (let x = 0; x < w; x++) hits += dark(x, 0) + dark(x, h - 1);
  for (let y = 0; y < h; y++) hits += dark(0, y) + dark(w - 1, y);
  return hits / (2 * (w + h)) > 0.8;
}
