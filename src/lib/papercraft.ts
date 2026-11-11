import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/constants";

// A paper cube: six square faces laid out as a cross on the (always portrait)
// page, with glue tabs. The same layout drives the outline drawn on the lines
// layer and the 3D preview's per-face textures, so they can't drift apart.
//
//         [top]
//   [left][front][right]
//         [bottom]
//         [back]

export type CubeFaceId = "top" | "left" | "front" | "right" | "bottom" | "back";

/** Side of one face, in page px. Leaves room for tabs inside a printer's margin. */
export const CUBE_FACE = 228;
const TAB_DEPTH = 28;
const TAB_INSET = 0.18; // how far a tab's outer corners sit in from its base, as a share of the side
const ORIGIN_X = (CANVAS_WIDTH - 3 * CUBE_FACE) / 2;
const ORIGIN_Y = (CANVAS_HEIGHT - 4 * CUBE_FACE - TAB_DEPTH) / 2;

/** Grid cell (column, row) of each face within the cross. */
const CELLS: Record<CubeFaceId, { col: number; row: number }> = {
  top: { col: 1, row: 0 },
  left: { col: 0, row: 1 },
  front: { col: 1, row: 1 },
  right: { col: 2, row: 1 },
  bottom: { col: 1, row: 2 },
  back: { col: 1, row: 3 },
};

export const CUBE_FACE_IDS = Object.keys(CELLS) as CubeFaceId[];

/** Top-left corner of a face on the page. */
export function cubeFaceOrigin(face: CubeFaceId): { x: number; y: number } {
  const { col, row } = CELLS[face];
  return { x: ORIGIN_X + col * CUBE_FACE, y: ORIGIN_Y + row * CUBE_FACE };
}

type Side = "top" | "right" | "bottom" | "left";

// One tab per pair of edges that meet when folded, each placed on the side
// that has free paper next to it.
const TABS: { face: CubeFaceId; side: Side }[] = [
  { face: "top", side: "left" },
  { face: "top", side: "right" },
  { face: "bottom", side: "left" },
  { face: "bottom", side: "right" },
  { face: "back", side: "left" },
  { face: "back", side: "right" },
  { face: "back", side: "bottom" },
];

// Edges shared by two faces: fold lines.
const FOLDS: { face: CubeFaceId; side: Side }[] = [
  { face: "front", side: "top" },
  { face: "front", side: "left" },
  { face: "front", side: "right" },
  { face: "front", side: "bottom" },
  { face: "back", side: "top" },
];

/** A face edge as [start, end] plus the unit direction pointing away from the face. */
function edge(face: CubeFaceId, side: Side) {
  const { x, y } = cubeFaceOrigin(face);
  const s = CUBE_FACE;
  switch (side) {
    case "top":
      return { a: { x, y }, b: { x: x + s, y }, out: { x: 0, y: -1 } };
    case "right":
      return { a: { x: x + s, y }, b: { x: x + s, y: y + s }, out: { x: 1, y: 0 } };
    case "bottom":
      return { a: { x: x + s, y: y + s }, b: { x, y: y + s }, out: { x: 0, y: 1 } };
    case "left":
      return { a: { x, y: y + s }, b: { x, y }, out: { x: -1, y: 0 } };
  }
}

/**
 * Draws the cube net onto the lines layer. Thick lines are for cutting, thin
 * lines for folding. Fold lines are solid, not dashed, so the fill tool can't
 * leak from one face into the next.
 */
export function drawCubeNet(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.strokeStyle = "#000";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.lineWidth = 2;
  for (const { face, side } of [...FOLDS, ...TABS]) {
    const { a, b } = edge(face, side);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.lineWidth = 4;
  const tabbed = new Set(TABS.map((t) => `${t.face}:${t.side}`));
  const folded = new Set(FOLDS.map((f) => `${f.face}:${f.side}`));
  // A fold is listed from one face only; these are its other side.
  const foldTwins = new Set([
    "top:bottom",
    "left:right",
    "right:left",
    "bottom:top",
    "bottom:bottom",
  ]);
  for (const face of CUBE_FACE_IDS) {
    for (const side of ["top", "right", "bottom", "left"] as Side[]) {
      const key = `${face}:${side}`;
      if (folded.has(key) || foldTwins.has(key)) continue;
      const { a, b, out } = edge(face, side);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      if (tabbed.has(key)) {
        const along = { x: (b.x - a.x) * TAB_INSET, y: (b.y - a.y) * TAB_INSET };
        ctx.lineTo(a.x + along.x + out.x * TAB_DEPTH, a.y + along.y + out.y * TAB_DEPTH);
        ctx.lineTo(b.x - along.x + out.x * TAB_DEPTH, b.y - along.y + out.y * TAB_DEPTH);
      }
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}
