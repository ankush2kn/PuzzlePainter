import type { Orientation, TemplateItem } from "@/types/studio";
import { CANVAS_SIZE } from "@/lib/constants";

// Built-in pages are transparent line-art PNGs in public/pages/, produced from
// generated artwork by scripts/prepare-page.mjs.
export const TEMPLATES: TemplateItem[] = [
  {
    id: "blank",
    name: "Blank Canvas",
    theme: "blank",
    image: null,
  },
  {
    id: "dino-cuddles",
    name: "Dino Cuddles",
    theme: "animals",
    image: "/pages/dino-cuddles.png",
  },
  {
    id: "dino-valley",
    name: "Dino Valley",
    theme: "animals",
    image: "/pages/dino-valley.png",
  },
  {
    id: "rainbow-unicorns",
    name: "Rainbow Unicorns",
    theme: "animals",
    image: "/pages/rainbow-unicorns.png",
  },
  {
    id: "unicorn-meadow",
    name: "Unicorn Meadow",
    theme: "animals",
    image: "/pages/unicorn-meadow.png",
  },
  {
    id: "piggy-puddle-jump",
    name: "Piggy Puddle Jump",
    theme: "animals",
    image: "/pages/piggy-puddle-jump.png",
  },
  {
    id: "roaring-bear",
    name: "Roaring Bear",
    theme: "animals",
    image: "/pages/roaring-bear.png",
  },
  {
    id: "t-rex-roar",
    name: "T-Rex Roar",
    theme: "animals",
    image: "/pages/t-rex-roar.png",
  },
  {
    id: "rainbow-hills",
    name: "Rainbow Hills",
    theme: "nature",
    image: "/pages/rainbow-hills.png",
  },
  {
    id: "melty-ice-cream",
    name: "Melty Ice Cream",
    theme: "food",
    image: "/pages/melty-ice-cream.png",
  },
  {
    id: "race-day",
    name: "Race Day",
    theme: "vehicles",
    image: "/pages/race-day.png",
  },
  {
    id: "big-digger",
    name: "Big Digger",
    theme: "vehicles",
    image: "/pages/big-digger.png",
  },
  {
    id: "sky-jet",
    name: "Sky Jet",
    theme: "vehicles",
    image: "/pages/sky-jet.png",
  },
  {
    id: "choo-choo-train",
    name: "Choo-Choo Train",
    theme: "vehicles",
    image: "/pages/choo-choo-train.png",
  },
];

export function getTemplateById(id: string): TemplateItem | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Draw an SVG string onto a canvas (lines layer). */
export async function renderSvgToCanvas(
  canvas: HTMLCanvasElement,
  svg: string,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const trimmed = svg.trim();
  if (!trimmed || trimmed.includes("></svg>") && /viewBox/.test(trimmed) === false) {
    // blank ok
  }
  // Empty inner content — nothing to draw
  if (/<svg[^>]*>\s*<\/svg>/i.test(trimmed)) {
    return;
  }

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    if (isLandscapeSvg(svg)) {
      // Generated while viewing landscape: lay it onto the portrait page
      // turned counter-clockwise, so it reads upright in the landscape view
      // (the inverse of applyViewTransform in lib/drawing.ts).
      ctx.save();
      ctx.transform(0, -1, 1, 0, 0, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.height, canvas.width);
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

function isLandscapeSvg(svg: string): boolean {
  const viewBox = svg.match(/viewBox\s*=\s*["']([^"']*)["']/i);
  if (!viewBox) return false;
  const [, , w, h] = viewBox[1].trim().split(/[\s,]+/).map(Number);
  return w > h;
}

/** Draw a built-in page's line-art image onto a canvas (lines layer); null clears it. */
export async function renderImageToCanvas(
  canvas: HTMLCanvasElement,
  url: string | null,
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (!url) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const img = await loadImage(url);
  // Clear only after the load so a slow fetch doesn't flash an empty page.
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export function sanitizeSvg(
  raw: string,
  orientation: Orientation = "portrait",
): string | null {
  let svg = raw.trim();
  // Extract svg block if wrapped in markdown/code
  const match = svg.match(/<svg[\s\S]*?<\/svg>/i);
  if (match) svg = match[0];
  if (!svg.toLowerCase().startsWith("<svg")) return null;

  // Strip scripts and event handlers
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  svg = svg.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  svg = svg.replace(/javascript:/gi, "");

  // Ensure xmlns and viewBox
  if (!/xmlns=/.test(svg)) {
    svg = svg.replace(
      /<svg/i,
      `<svg xmlns="http://www.w3.org/2000/svg"`,
    );
  }
  if (!/viewBox=/.test(svg)) {
    svg = svg.replace(
      /<svg/i,
      `<svg viewBox="0 0 ${CANVAS_SIZE[orientation].width} ${CANVAS_SIZE[orientation].height}"`,
    );
  }

  return svg;
}
