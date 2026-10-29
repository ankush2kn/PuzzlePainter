import { CANVAS_HEIGHT } from "@/lib/constants";
import type { Orientation, ToolId } from "@/types/studio";

/** Scanline flood fill. Barriers = dark pixels on the lines layer OR already filled differently. */
export function floodFill(options: {
  paintCtx: CanvasRenderingContext2D;
  linesCtx: CanvasRenderingContext2D;
  x: number;
  y: number;
  fillColor: string;
  /** 0–1; a translucent fill is blended over the region's existing color. */
  opacity?: number;
  width: number;
  height: number;
}): void {
  const { paintCtx, linesCtx, width, height } = options;
  const startX = Math.floor(options.x);
  const startY = Math.floor(options.y);
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) return;

  const paintData = paintCtx.getImageData(0, 0, width, height);
  const linesData = linesCtx.getImageData(0, 0, width, height);
  const pdata = paintData.data;
  const ldata = linesData.data;

  const startIdx = (startY * width + startX) * 4;
  const target: [number, number, number, number] = [
    pdata[startIdx],
    pdata[startIdx + 1],
    pdata[startIdx + 2],
    pdata[startIdx + 3],
  ];

  // Don't fill if clicking on a line
  if (isBarrier(ldata, startIdx)) return;

  // The region is one color (within tolerance), so the blended result is too.
  const fill = blendOver(
    parseCssColor(options.fillColor),
    options.opacity ?? 1,
    target,
  );

  // Already the fill color
  if (colorsMatch(target, fill)) return;

  const stack: number[] = [startX, startY];
  const visited = new Uint8Array(width * height);

  while (stack.length > 0) {
    const y = stack.pop();
    const x = stack.pop();
    if (x === undefined || y === undefined) break;

    let left = x;
    while (
      left >= 0 &&
      canFill(left, y, width, height, pdata, ldata, target, visited)
    ) {
      left--;
    }
    left++;

    let right = x;
    while (
      right < width &&
      canFill(right, y, width, height, pdata, ldata, target, visited)
    ) {
      right++;
    }
    right--;

    for (let i = left; i <= right; i++) {
      const idx = (y * width + i) * 4;
      pdata[idx] = fill[0];
      pdata[idx + 1] = fill[1];
      pdata[idx + 2] = fill[2];
      pdata[idx + 3] = fill[3];
      visited[y * width + i] = 1;

      if (y > 0 && canFill(i, y - 1, width, height, pdata, ldata, target, visited)) {
        stack.push(i, y - 1);
      }
      if (
        y < height - 1 &&
        canFill(i, y + 1, width, height, pdata, ldata, target, visited)
      ) {
        stack.push(i, y + 1);
      }
    }
  }

  paintCtx.putImageData(paintData, 0, 0);
}

function canFill(
  x: number,
  y: number,
  width: number,
  height: number,
  pdata: Uint8ClampedArray,
  ldata: Uint8ClampedArray,
  target: [number, number, number, number],
  visited: Uint8Array,
): boolean {
  if (x < 0 || y < 0 || x >= width || y >= height) return false;
  const vi = y * width + x;
  if (visited[vi]) return false;
  const idx = vi * 4;
  if (isBarrier(ldata, idx)) return false;
  const pixel: [number, number, number, number] = [
    pdata[idx],
    pdata[idx + 1],
    pdata[idx + 2],
    pdata[idx + 3],
  ];
  return colorsMatch(pixel, target);
}

function isBarrier(ldata: Uint8ClampedArray, idx: number): boolean {
  const a = ldata[idx + 3];
  if (a < 40) return false;
  const r = ldata[idx];
  const g = ldata[idx + 1];
  const b = ldata[idx + 2];
  // Dark-ish outline counts as barrier
  return r + g + b < 360 && a > 80;
}

function colorsMatch(
  a: [number, number, number, number],
  b: [number, number, number, number],
  tolerance = 8,
): boolean {
  // Treat near-transparent as matching each other
  if (a[3] < 20 && b[3] < 20) return true;
  return (
    Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance &&
    Math.abs(a[3] - b[3]) <= tolerance
  );
}

/** Source-over blend of `src` (at `alpha`) onto `dst`, straight (non-premultiplied) RGBA. */
function blendOver(
  src: [number, number, number, number],
  alpha: number,
  dst: [number, number, number, number],
): [number, number, number, number] {
  const sa = (src[3] / 255) * alpha;
  const da = dst[3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return [0, 0, 0, 0];
  const ch = (i: number) =>
    Math.round((src[i] * sa + dst[i] * da * (1 - sa)) / oa);
  return [ch(0), ch(1), ch(2), Math.round(oa * 255)];
}

/** Stroke width in canvas px for a drawing tool — shared by painting and the cursor preview. */
export function strokeWidth(tool: ToolId, sizePx: number): number {
  if (tool === "marker") return sizePx * 1.6;
  if (tool === "pencil") return Math.max(1.5, sizePx * 0.35);
  return sizePx;
}

/** Per-stroke alpha a tool applies on top of the user's chosen opacity. */
export function toolAlpha(tool: ToolId): number {
  if (tool === "marker") return 0.35;
  if (tool === "pencil") return 0.9;
  return 1;
}

function parseCssColor(color: string): [number, number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [0, 0, 0, 255];
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2], d[3]];
}

export function getCanvasPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

// The page (paint/lines layers, undo history, saves) is always portrait.
// Landscape is just a way of viewing it: the page turned 90° clockwise.

/** Maps page coordinates to view coordinates on `ctx` (on top of any existing transform). */
export function applyViewTransform(
  ctx: CanvasRenderingContext2D,
  orientation: Orientation,
): void {
  if (orientation === "landscape") ctx.transform(0, 1, -1, 0, CANVAS_HEIGHT, 0);
}

/** Inverse of applyViewTransform for a single point. */
export function viewToPage(
  point: { x: number; y: number },
  orientation: Orientation,
): { x: number; y: number } {
  return orientation === "landscape"
    ? { x: point.y, y: CANVAS_HEIGHT - point.x }
    : point;
}
