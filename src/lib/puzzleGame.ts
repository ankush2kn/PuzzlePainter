import { CANDY_COLORS } from "@/lib/constants";
import { tracePath, type PuzzleGeometry } from "@/lib/puzzleShapes";

// The on-screen puzzle: pieces are cut out of the finished picture along the
// same geometry as the printed cut lines, scattered around a board, and
// dragged home. Plain canvas + pointer events; React only hears about progress.

export interface PuzzleGameOptions {
  canvas: HTMLCanvasElement;
  /** The flattened picture (no cut lines), at any resolution. */
  image: HTMLCanvasElement;
  geometry: PuzzleGeometry;
  reducedMotion: boolean;
  /** Whether to show the faint picture on the board; read on every draw. */
  getHint: () => boolean;
  onFirstMove: () => void;
  onProgress: (placed: number) => void;
  onSolved: () => void;
}

export interface PuzzleGame {
  redraw: () => void;
  destroy: () => void;
}

interface PieceState {
  /** Centre of the piece's bounding box, as a fraction of the canvas. */
  fx: number;
  fy: number;
  locked: boolean;
  /** Glide into place after a snap. */
  glide?: { fx: number; fy: number; start: number };
}

interface Confetto {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  size: number;
  color: string;
}

const SPRITE_PAD = 2; // sheet px of slack around each piece's sprite
const GLIDE_MS = 180;
const BOARD_SHARE = 0.62; // of the tighter canvas dimension
const CONFETTI_MS = 4500;

export function startPuzzleGame(options: PuzzleGameOptions): PuzzleGame {
  const { canvas, image, geometry, reducedMotion } = options;
  const { pieces } = geometry;
  const ctx = canvas.getContext("2d");
  const hitCtx = document.createElement("canvas").getContext("2d");
  if (!ctx || !hitCtx) return { redraw: () => {}, destroy: () => {} };

  const outlines = pieces.map((p) => {
    const path = new Path2D();
    tracePath(path, p.outline);
    path.closePath();
    return path;
  });

  // One sprite per piece: the picture clipped to the piece, with a soft bevel.
  const k = image.width / geometry.width;
  const sprites = pieces.map((p, i) => {
    const sprite = document.createElement("canvas");
    sprite.width = Math.ceil((p.bbox.w + 2 * SPRITE_PAD) * k);
    sprite.height = Math.ceil((p.bbox.h + 2 * SPRITE_PAD) * k);
    const sctx = sprite.getContext("2d");
    if (!sctx) return sprite;
    sctx.scale(k, k);
    sctx.translate(SPRITE_PAD - p.bbox.x, SPRITE_PAD - p.bbox.y);
    sctx.clip(outlines[i]);
    sctx.drawImage(image, 0, 0, geometry.width, geometry.height);
    // Light catches the top-left edge, shade falls on the bottom-right.
    sctx.lineWidth = 3;
    sctx.translate(1, 1);
    sctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    sctx.stroke(outlines[i]);
    sctx.translate(-2, -2);
    sctx.strokeStyle = "rgba(30, 20, 50, 0.3)";
    sctx.stroke(outlines[i]);
    sctx.translate(1, 1);
    sctx.lineWidth = 1.5;
    sctx.strokeStyle = "rgba(30, 20, 50, 0.55)";
    sctx.stroke(outlines[i]);
    return sprite;
  });

  const state: PieceState[] = pieces.map(() => ({ fx: 0.5, fy: 0.5, locked: false }));
  /** Draw order, bottom to top. */
  let order = pieces.map((_, i) => i);
  let layout = { w: 0, h: 0, scale: 1, bx: 0, by: 0 };
  let scattered = false;
  let moved = false;
  let placed = 0;
  let drag: { id: number; pointerId: number; dx: number; dy: number } | null = null;
  let confetti: Confetto[] = [];
  let confettiStart = 0;
  let dirty = true;
  let lastFrame = 0;
  let frame = 0;

  const centerOf = (i: number) => {
    const b = pieces[i].bbox;
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  };

  /** Where piece `i` sits when solved, as canvas fractions. */
  const homeOf = (i: number) => {
    const c = centerOf(i);
    return {
      fx: (layout.bx + c.x * layout.scale) / layout.w,
      fy: (layout.by + c.y * layout.scale) / layout.h,
    };
  };

  /** Canvas position of the sheet's origin as carried by piece `i`. */
  const originOf = (i: number, now: number) => {
    const s = state[i];
    let { fx, fy } = s;
    if (s.glide) {
      const t = Math.min(1, (now - s.glide.start) / GLIDE_MS);
      const e = 1 - (1 - t) * (1 - t);
      fx = s.glide.fx + (fx - s.glide.fx) * e;
      fy = s.glide.fy + (fy - s.glide.fy) * e;
      if (t >= 1) s.glide = undefined;
    }
    const c = centerOf(i);
    return {
      x: fx * layout.w - c.x * layout.scale,
      y: fy * layout.h - c.y * layout.scale,
    };
  };

  const clampCenter = (i: number, x: number, y: number) => {
    const hw = (pieces[i].bbox.w * layout.scale) / 2;
    const hh = (pieces[i].bbox.h * layout.scale) / 2;
    return {
      x: layout.w > 2 * hw ? Math.min(layout.w - hw, Math.max(hw, x)) : layout.w / 2,
      y: layout.h > 2 * hh ? Math.min(layout.h - hh, Math.max(hh, y)) : layout.h / 2,
    };
  };

  const scatter = () => {
    const boardW = geometry.width * layout.scale;
    const boardH = geometry.height * layout.scale;
    pieces.forEach((_, i) => {
      let spot = { x: layout.w / 2, y: layout.h / 2 };
      // Prefer the free table around the board; give up after a few tries.
      for (let attempt = 0; attempt < 30; attempt++) {
        spot = clampCenter(i, Math.random() * layout.w, Math.random() * layout.h);
        const onBoard =
          spot.x > layout.bx &&
          spot.x < layout.bx + boardW &&
          spot.y > layout.by &&
          spot.y < layout.by + boardH;
        if (!onBoard) break;
      }
      state[i].fx = spot.x / layout.w;
      state[i].fy = spot.y / layout.h;
    });
    order = order
      .map((id) => ({ id, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((o) => o.id);
  };

  const measure = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const scale = Math.min(
      (rect.width * BOARD_SHARE) / geometry.width,
      (rect.height * BOARD_SHARE) / geometry.height,
    );
    const previous = layout;
    layout = {
      w: rect.width,
      h: rect.height,
      scale,
      bx: (rect.width - geometry.width * scale) / 2,
      by: (rect.height - geometry.height * scale) / 2,
    };
    if (!scattered) {
      scatter();
      scattered = true;
    } else if (previous.w !== layout.w || previous.h !== layout.h) {
      // The board moved; solved pieces move with it.
      state.forEach((s, i) => {
        if (s.locked) Object.assign(s, homeOf(i));
      });
    }
    dirty = true;
  };

  const draw = (now: number) => {
    const dpr = canvas.width / layout.w;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, layout.w, layout.h);
    const { scale, bx, by } = layout;
    const boardW = geometry.width * scale;
    const boardH = geometry.height * scale;

    // Board
    ctx.save();
    ctx.shadowColor = "rgba(43, 27, 61, 0.22)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx, by, boardW, boardH);
    ctx.restore();
    if (options.getHint()) {
      ctx.globalAlpha = 0.22;
      ctx.drawImage(image, bx, by, boardW, boardH);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(scale, scale);
    ctx.lineWidth = 1.5 / scale;
    ctx.strokeStyle = "rgba(120, 100, 150, 0.4)";
    for (const cut of geometry.cuts) {
      ctx.beginPath();
      tracePath(ctx, cut);
      ctx.stroke();
    }
    ctx.restore();

    // Pieces
    for (const id of order) {
      const s = state[id];
      const b = pieces[id].bbox;
      const origin = originOf(id, now);
      const held = drag?.id === id;
      ctx.save();
      if (!s.locked) {
        ctx.shadowColor = "rgba(43, 27, 61, 0.35)";
        ctx.shadowBlur = held ? 22 : 8;
        ctx.shadowOffsetY = held ? 12 : 3;
      }
      ctx.drawImage(
        sprites[id],
        origin.x + (b.x - SPRITE_PAD) * scale,
        origin.y + (b.y - SPRITE_PAD) * scale - (held ? 4 : 0),
        (b.w + 2 * SPRITE_PAD) * scale,
        (b.h + 2 * SPRITE_PAD) * scale,
      );
      ctx.restore();
    }

    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      ctx.restore();
    }
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (layout.w === 0) return;
    const gliding = state.some((s) => s.glide);
    if (confetti.length > 0) {
      for (const c of confetti) {
        c.vy += 520 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.angle += c.spin * dt;
      }
      if (now - confettiStart > CONFETTI_MS) confetti = [];
    }
    if (!dirty && !gliding && confetti.length === 0) return;
    dirty = false;
    draw(now);
    // One more frame after the last glide/confetti frame leaves a clean picture.
    if (gliding || confetti.length > 0) dirty = true;
  };

  const celebrate = () => {
    if (reducedMotion) return;
    confettiStart = performance.now();
    confetti = Array.from({ length: 140 }, () => ({
      x: Math.random() * layout.w,
      y: -20 - Math.random() * layout.h * 0.4,
      vx: (Math.random() - 0.5) * 160,
      vy: 60 + Math.random() * 180,
      spin: (Math.random() - 0.5) * 12,
      angle: Math.random() * Math.PI,
      size: 8 + Math.random() * 10,
      color: CANDY_COLORS[Math.floor(Math.random() * 10)],
    }));
  };

  const pointerPos = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  /** Topmost loose piece under a point; fingers get a little slack. */
  const pieceAt = (x: number, y: number, slack: number): number | null => {
    const now = performance.now();
    for (const exact of [true, false]) {
      for (let n = order.length - 1; n >= 0; n--) {
        const id = order[n];
        if (state[id].locked) continue;
        const origin = originOf(id, now);
        const sx = (x - origin.x) / layout.scale;
        const sy = (y - origin.y) / layout.scale;
        if (exact) {
          if (hitCtx.isPointInPath(outlines[id], sx, sy)) return id;
        } else {
          const b = pieces[id].bbox;
          const pad = slack / layout.scale;
          if (
            sx > b.x - pad &&
            sx < b.x + b.w + pad &&
            sy > b.y - pad &&
            sy < b.y + b.h + pad
          ) {
            return id;
          }
        }
      }
    }
    return null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (drag || layout.w === 0) return;
    const { x, y } = pointerPos(e);
    const id = pieceAt(x, y, e.pointerType === "touch" ? 12 : 0);
    if (id === null) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const s = state[id];
    s.glide = undefined;
    drag = { id, pointerId: e.pointerId, dx: x - s.fx * layout.w, dy: y - s.fy * layout.h };
    order = [...order.filter((o) => o !== id), id];
    if (!moved) {
      moved = true;
      options.onFirstMove();
    }
    dirty = true;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { x, y } = pointerPos(e);
    const c = clampCenter(drag.id, x - drag.dx, y - drag.dy);
    state[drag.id].fx = c.x / layout.w;
    state[drag.id].fy = c.y / layout.h;
    dirty = true;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const id = drag.id;
    drag = null;
    dirty = true;
    const s = state[id];
    const home = homeOf(id);
    const distance = Math.hypot(
      (s.fx - home.fx) * layout.w,
      (s.fy - home.fy) * layout.h,
    );
    const snap = Math.max(
      14,
      0.3 * Math.min(geometry.cell.w, geometry.cell.h) * layout.scale,
    );
    if (distance > snap) return;
    s.glide = reducedMotion ? undefined : { fx: s.fx, fy: s.fy, start: performance.now() };
    s.fx = home.fx;
    s.fy = home.fy;
    s.locked = true;
    // Solved pieces lie flat under the loose ones.
    order = [id, ...order.filter((o) => o !== id)];
    placed += 1;
    options.onProgress(placed);
    if (placed === pieces.length) {
      celebrate();
      options.onSolved();
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  const observer = new ResizeObserver(measure);
  observer.observe(canvas);
  measure();
  frame = requestAnimationFrame(tick);

  return {
    redraw: () => {
      dirty = true;
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    },
  };
}
