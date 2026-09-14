/** Scanline flood fill. Barriers = dark pixels on the lines layer OR already filled differently. */
export function floodFill(options: {
  paintCtx: CanvasRenderingContext2D;
  linesCtx: CanvasRenderingContext2D;
  x: number;
  y: number;
  fillColor: string;
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

  const fill = parseCssColor(options.fillColor);
  const startIdx = (startY * width + startX) * 4;
  const target: [number, number, number, number] = [
    pdata[startIdx],
    pdata[startIdx + 1],
    pdata[startIdx + 2],
    pdata[startIdx + 3],
  ];

  // Don't fill if clicking on a line
  if (isBarrier(ldata, startIdx)) return;

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
