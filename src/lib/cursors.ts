import { strokeWidth } from "@/lib/drawing";
import type { ToolId } from "@/types/studio";

// Browsers drop cursor images over 128px, so every cursor stays inside this.
const MAX_SIZE = 128;
const ICON_PX = 26;
const EMOJI_FONT =
  "'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";

const TOOL_EMOJI: Partial<Record<ToolId, string>> = {
  brush: "🖌️",
  pencil: "✏️",
  marker: "🖊️",
  fill: "🪣",
  eraser: "🧹",
};

const FALLBACK: Record<ToolId, string> = {
  brush: "crosshair",
  pencil: "crosshair",
  marker: "crosshair",
  fill: "cell",
  eraser: "cell",
  text: "copy",
  stamp: "copy",
};

const cache = new Map<string, string>();

export interface ToolCursorOptions {
  tool: ToolId;
  color: string;
  opacity: number;
  stampEmoji: string;
  /** Brush size in canvas px (BRUSH_SIZE_PX). */
  sizePx: number;
  /** On-screen px per canvas px, so the preview matches what gets painted. */
  scale: number;
}

/**
 * White-and-dark ring marking the click point. Its diameter is the stroke's
 * on-screen footprint (with a floor so tiny brushes stay visible), filled
 * with the paint color at the chosen opacity.
 */
function drawFootprint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string | null,
  opacity: number,
) {
  if (fill) {
    ctx.beginPath();
    ctx.arc(x, y, r <= 5 ? Math.min(r, 2.5) : r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    // A big solid disc would hide what's being aimed at, so fade it.
    ctx.globalAlpha = r <= 5 ? opacity : opacity * 0.45;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
}

function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const arm = 6;
  ctx.lineCap = "round";
  for (const [width, style] of [
    [3.5, "rgba(0,0,0,0.85)"],
    [1.5, "#fff"],
  ] as const) {
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.beginPath();
    ctx.moveTo(x - arm, y);
    ctx.lineTo(x + arm, y);
    ctx.moveTo(x, y - arm);
    ctx.lineTo(x, y + arm);
    ctx.stroke();
  }
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/**
 * CSS `cursor` value showing the active tool's icon. Drawing tools put the
 * icon up-right of a footprint ring centered on the click point; stamps show
 * a faded, true-size preview centered on a crosshair, matching where the
 * stamp lands.
 */
export function getToolCursor({
  tool,
  color,
  opacity,
  stampEmoji,
  sizePx,
  scale,
}: ToolCursorOptions): string {
  const fallback = FALLBACK[tool];
  if (typeof document === "undefined") return fallback;

  const emoji = tool === "stamp" ? stampEmoji : TOOL_EMOJI[tool];
  if (!emoji) return fallback;

  const roundedScale = Math.round(scale * 100) / 100;
  const key = [tool, color, opacity, emoji, sizePx, roundedScale].join("|");
  const cached = cache.get(key);
  if (cached) return cached;

  let canvas: HTMLCanvasElement;
  let hx: number;
  let hy: number;

  if (tool === "stamp") {
    // Matches placeStampOrText's font size, converted to screen px.
    const stampPx = Math.min(
      MAX_SIZE - 8,
      Math.max(16, sizePx * 3.2 * roundedScale),
    );
    const side = Math.ceil(stampPx + 8);
    canvas = makeCanvas(side, side);
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    hx = Math.floor(side / 2);
    hy = hx;
    ctx.globalAlpha = 0.6;
    ctx.font = `${stampPx}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, hx, hy + stampPx * 0.06);
    ctx.globalAlpha = 1;
    drawCrosshair(ctx, hx, hy);
  } else {
    // Fill has no size, so it keeps the minimum ring.
    const footprint =
      tool === "fill" ? 0 : strokeWidth(tool, sizePx) * roundedScale;
    const maxR = (MAX_SIZE - ICON_PX - 6) / 1.6;
    const r = Math.min(maxR, Math.max(4, footprint / 2));
    const edge = r + 2; // ring radius plus its outline
    // Point on the ring's upper-right where the icon's tip sits.
    const tip = r * 0.6;
    hx = Math.ceil(edge + 1);
    hy = Math.ceil(Math.max(edge + 1, tip + ICON_PX));
    const w = Math.ceil(Math.max(hx + edge + 1, hx + tip + ICON_PX));
    const h = Math.ceil(hy + edge + 1);
    canvas = makeCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback;
    ctx.font = `${ICON_PX}px ${EMOJI_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(emoji, hx + tip - 4, hy - tip + 2);
    drawFootprint(ctx, hx, hy, r, tool === "eraser" ? null : color, opacity);
  }

  const value = `url(${canvas.toDataURL("image/png")}) ${hx} ${hy}, ${fallback}`;
  cache.set(key, value);
  return value;
}

export function getFallbackCursor(tool: ToolId): string {
  return FALLBACK[tool];
}
