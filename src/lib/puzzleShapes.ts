import type { Difficulty, PieceShape } from "@/types/studio";
import { CANVAS_HEIGHT, CANVAS_WIDTH, DIFFICULTY_META } from "@/lib/constants";

function pieceCount(difficulty: Difficulty): { cols: number; rows: number } {
  const { cols, rows } = DIFFICULTY_META[difficulty];
  return { cols, rows };
}

/** Draw dashed cut lines onto a canvas context. */
export function drawCutLines(
  ctx: CanvasRenderingContext2D,
  shape: PieceShape,
  difficulty: Difficulty,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
): void {
  const { cols, rows } = pieceCount(difficulty);
  ctx.save();
  ctx.strokeStyle = "rgba(80, 80, 100, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (shape === "rectangle") {
    drawRectGrid(ctx, cols, rows, width, height);
  } else if (shape === "triangle") {
    drawTriangleGrid(ctx, cols, rows, width, height);
  } else {
    drawJigsawGrid(ctx, cols, rows, width, height);
  }

  ctx.restore();
}

function drawRectGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  width: number,
  height: number,
): void {
  const cw = width / cols;
  const ch = height / rows;
  for (let c = 1; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cw, 0);
    ctx.lineTo(c * cw, height);
    ctx.stroke();
  }
  for (let r = 1; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * ch);
    ctx.lineTo(width, r * ch);
    ctx.stroke();
  }
}

function drawTriangleGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  width: number,
  height: number,
): void {
  drawRectGrid(ctx, cols, rows, width, height);
  const cw = width / cols;
  const ch = height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      const y = r * ch;
      ctx.beginPath();
      if ((r + c) % 2 === 0) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + cw, y + ch);
      } else {
        ctx.moveTo(x + cw, y);
        ctx.lineTo(x, y + ch);
      }
      ctx.stroke();
    }
  }
}

/**
 * Classic tab/blank jigsaw outlines along a grid.
 * Tabs point into neighboring cells so printed pieces interlock visually.
 */
function drawJigsawGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  width: number,
  height: number,
): void {
  const cw = width / cols;
  const ch = height / rows;
  const tabR = Math.min(cw, ch) * 0.14;

  // Vertical seams
  for (let c = 1; c < cols; c++) {
    const x = c * cw;
    for (let r = 0; r < rows; r++) {
      const y0 = r * ch;
      const y1 = (r + 1) * ch;
      const mid = (y0 + y1) / 2;
      const dir = (c + r) % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, mid - tabR);
      // semicircle tab
      ctx.bezierCurveTo(
        x + dir * tabR * 1.6,
        mid - tabR,
        x + dir * tabR * 1.6,
        mid + tabR,
        x,
        mid + tabR,
      );
      ctx.lineTo(x, y1);
      ctx.stroke();
    }
  }

  // Horizontal seams
  for (let r = 1; r < rows; r++) {
    const y = r * ch;
    for (let c = 0; c < cols; c++) {
      const x0 = c * cw;
      const x1 = (c + 1) * cw;
      const mid = (x0 + x1) / 2;
      const dir = (c + r) % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(mid - tabR, y);
      ctx.bezierCurveTo(
        mid - tabR,
        y + dir * tabR * 1.6,
        mid + tabR,
        y + dir * tabR * 1.6,
        mid + tabR,
        y,
      );
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
  }
}

export function difficultyPieceLabel(difficulty: Difficulty, shape: PieceShape): string {
  const { cols, rows } = DIFFICULTY_META[difficulty];
  const base = cols * rows;
  if (shape === "triangle") return `${base * 2} pieces`;
  return `${base} pieces`;
}
