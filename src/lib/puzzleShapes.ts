import type { Difficulty, PieceShape } from "@/types/studio";
import { CANVAS_HEIGHT, CANVAS_WIDTH, DIFFICULTY_META } from "@/lib/constants";

// One description of the puzzle feeds both the printed cut lines and the
// on-screen puzzle's pieces, so a piece on screen is exactly the piece a
// child would cut out of the printed sheet.

export interface Point {
  x: number;
  y: number;
}

export type Seg =
  | { t: "L"; x: number; y: number }
  | {
      t: "C";
      c1x: number;
      c1y: number;
      c2x: number;
      c2y: number;
      x: number;
      y: number;
    };

/** A run of line/curve segments starting at `start`, in sheet (view) coordinates. */
export interface PuzzlePath {
  start: Point;
  segs: Seg[];
}

export interface PuzzlePiece {
  id: number;
  /** Closed clockwise outline. */
  outline: PuzzlePath;
  bbox: { x: number; y: number; w: number; h: number };
}

export interface PuzzleGeometry {
  width: number;
  height: number;
  /** Size of one grid cell — a handy unit for snap distances. */
  cell: { w: number; h: number };
  /** Open paths to stroke as cut lines; every seam appears exactly once. */
  cuts: PuzzlePath[];
  pieces: PuzzlePiece[];
}

/** DIFFICULTY_META's grid is for a portrait page; turn it sideways for landscape. */
function pieceCount(
  difficulty: Difficulty,
  landscape: boolean,
): { cols: number; rows: number } {
  const { cols, rows } = DIFFICULTY_META[difficulty];
  return landscape ? { cols: rows, rows: cols } : { cols, rows };
}

function line(from: Point, to: Point): PuzzlePath {
  return { start: from, segs: [{ t: "L", x: to.x, y: to.y }] };
}

function endOf(path: PuzzlePath): Point {
  const last = path.segs[path.segs.length - 1];
  return last ? { x: last.x, y: last.y } : path.start;
}

/** The same path walked from its end back to its start. */
function reversed(path: PuzzlePath): PuzzlePath {
  const points: Point[] = [path.start, ...path.segs.map((s) => ({ x: s.x, y: s.y }))];
  const segs: Seg[] = [];
  for (let i = path.segs.length - 1; i >= 0; i--) {
    const seg = path.segs[i];
    const to = points[i];
    if (seg.t === "L") {
      segs.push({ t: "L", x: to.x, y: to.y });
    } else {
      segs.push({
        t: "C",
        c1x: seg.c2x,
        c1y: seg.c2y,
        c2x: seg.c1x,
        c2y: seg.c1y,
        x: to.x,
        y: to.y,
      });
    }
  }
  return { start: endOf(path), segs };
}

/** Joins paths that meet end-to-start into one closed outline. */
function joined(parts: PuzzlePath[]): PuzzlePath {
  return { start: parts[0].start, segs: parts.flatMap((p) => p.segs) };
}

function bboxOf(path: PuzzlePath): PuzzlePiece["bbox"] {
  // Control points bound their curve, so including them is a safe over-estimate.
  const xs = [path.start.x];
  const ys = [path.start.y];
  for (const s of path.segs) {
    xs.push(s.x);
    ys.push(s.y);
    if (s.t === "C") {
      xs.push(s.c1x, s.c2x);
      ys.push(s.c1y, s.c2y);
    }
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function piece(id: number, parts: PuzzlePath[]): PuzzlePiece {
  const outline = joined(parts);
  return { id, outline, bbox: bboxOf(outline) };
}

export function buildPuzzle(
  shape: PieceShape,
  difficulty: Difficulty,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
): PuzzleGeometry {
  const { cols, rows } = pieceCount(difficulty, width > height);
  const cw = width / cols;
  const ch = height / rows;
  const base = { width, height, cell: { w: cw, h: ch } };
  if (shape === "rectangle") return { ...base, ...rectGrid(cols, rows, cw, ch) };
  if (shape === "triangle") return { ...base, ...triangleGrid(cols, rows, cw, ch) };
  return { ...base, ...jigsawGrid(cols, rows, cw, ch) };
}

type Grid = Pick<PuzzleGeometry, "cuts" | "pieces">;

/** Full-length grid lines (so their dashes run unbroken across the sheet). */
function gridLines(cols: number, rows: number, cw: number, ch: number): PuzzlePath[] {
  const cuts: PuzzlePath[] = [];
  for (let c = 1; c < cols; c++) {
    cuts.push(line({ x: c * cw, y: 0 }, { x: c * cw, y: rows * ch }));
  }
  for (let r = 1; r < rows; r++) {
    cuts.push(line({ x: 0, y: r * ch }, { x: cols * cw, y: r * ch }));
  }
  return cuts;
}

function rectGrid(cols: number, rows: number, cw: number, ch: number): Grid {
  const pieces: PuzzlePiece[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tl = { x: c * cw, y: r * ch };
      const tr = { x: tl.x + cw, y: tl.y };
      const br = { x: tr.x, y: tl.y + ch };
      const bl = { x: tl.x, y: br.y };
      pieces.push(
        piece(pieces.length, [line(tl, tr), line(tr, br), line(br, bl), line(bl, tl)]),
      );
    }
  }
  return { cuts: gridLines(cols, rows, cw, ch), pieces };
}

function triangleGrid(cols: number, rows: number, cw: number, ch: number): Grid {
  const cuts = gridLines(cols, rows, cw, ch);
  const pieces: PuzzlePiece[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tl = { x: c * cw, y: r * ch };
      const tr = { x: tl.x + cw, y: tl.y };
      const br = { x: tr.x, y: tl.y + ch };
      const bl = { x: tl.x, y: br.y };
      const tri = (a: Point, b: Point, d: Point) =>
        pieces.push(piece(pieces.length, [line(a, b), line(b, d), line(d, a)]));
      if ((r + c) % 2 === 0) {
        cuts.push(line(tl, br));
        tri(tl, tr, br);
        tri(tl, br, bl);
      } else {
        cuts.push(line(tr, bl));
        tri(tl, tr, bl);
        tri(tr, br, bl);
      }
    }
  }
  return { cuts, pieces };
}

/**
 * Tab/blank jigsaw seams along a grid. Tabs are plain bumps without a neck:
 * they have to be cut out of paper by a child with scissors.
 */
function jigsawGrid(cols: number, rows: number, cw: number, ch: number): Grid {
  const tabR = Math.min(cw, ch) * 0.14;

  /** Seam on the left side of column `c`, for row `r`, running top to bottom. */
  const vSeam = (c: number, r: number): PuzzlePath => {
    const x = c * cw;
    const y0 = r * ch;
    const y1 = (r + 1) * ch;
    const mid = (y0 + y1) / 2;
    const dir = (c + r) % 2 === 0 ? 1 : -1;
    return {
      start: { x, y: y0 },
      segs: [
        { t: "L", x, y: mid - tabR },
        {
          t: "C",
          c1x: x + dir * tabR * 1.6,
          c1y: mid - tabR,
          c2x: x + dir * tabR * 1.6,
          c2y: mid + tabR,
          x,
          y: mid + tabR,
        },
        { t: "L", x, y: y1 },
      ],
    };
  };

  /** Seam on the top side of row `r`, for column `c`, running left to right. */
  const hSeam = (r: number, c: number): PuzzlePath => {
    const y = r * ch;
    const x0 = c * cw;
    const x1 = (c + 1) * cw;
    const mid = (x0 + x1) / 2;
    const dir = (c + r) % 2 === 0 ? 1 : -1;
    return {
      start: { x: x0, y },
      segs: [
        { t: "L", x: mid - tabR, y },
        {
          t: "C",
          c1x: mid - tabR,
          c1y: y + dir * tabR * 1.6,
          c2x: mid + tabR,
          c2y: y + dir * tabR * 1.6,
          x: mid + tabR,
          y,
        },
        { t: "L", x: x1, y },
      ],
    };
  };

  const cuts: PuzzlePath[] = [];
  for (let c = 1; c < cols; c++) {
    for (let r = 0; r < rows; r++) cuts.push(vSeam(c, r));
  }
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) cuts.push(hSeam(r, c));
  }

  const pieces: PuzzlePiece[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tl = { x: c * cw, y: r * ch };
      const tr = { x: tl.x + cw, y: tl.y };
      const br = { x: tr.x, y: tl.y + ch };
      const bl = { x: tl.x, y: br.y };
      pieces.push(
        piece(pieces.length, [
          r === 0 ? line(tl, tr) : hSeam(r, c),
          c === cols - 1 ? line(tr, br) : vSeam(c + 1, r),
          r === rows - 1 ? line(br, bl) : reversed(hSeam(r + 1, c)),
          c === 0 ? line(bl, tl) : reversed(vSeam(c, r)),
        ]),
      );
    }
  }
  return { cuts, pieces };
}

/** Adds `path` to a canvas path (a context or a Path2D) without stroking it. */
export function tracePath(
  target: Pick<CanvasPath, "moveTo" | "lineTo" | "bezierCurveTo">,
  path: PuzzlePath,
): void {
  target.moveTo(path.start.x, path.start.y);
  for (const s of path.segs) {
    if (s.t === "L") target.lineTo(s.x, s.y);
    else target.bezierCurveTo(s.c1x, s.c1y, s.c2x, s.c2y, s.x, s.y);
  }
}

/** Draw dashed cut lines onto a canvas context. */
export function drawCutLines(
  ctx: CanvasRenderingContext2D,
  shape: PieceShape,
  difficulty: Difficulty,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(80, 80, 100, 0.55)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const cut of buildPuzzle(shape, difficulty, width, height).cuts) {
    ctx.beginPath();
    tracePath(ctx, cut);
    ctx.stroke();
  }
  ctx.restore();
}

export function difficultyPieceLabel(difficulty: Difficulty, shape: PieceShape): string {
  const { cols, rows } = DIFFICULTY_META[difficulty];
  const base = cols * rows;
  if (shape === "triangle") return `${base * 2} pieces`;
  return `${base} pieces`;
}
