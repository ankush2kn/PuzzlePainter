import { jsPDF } from "jspdf";
import { CANVAS_SIZE, PRINT_SCALE } from "@/lib/constants";
import { applyViewTransform } from "@/lib/drawing";
import { drawCutLines } from "@/lib/puzzleShapes";
import type { Difficulty, Orientation, PieceShape } from "@/types/studio";

export async function composeExportCanvas(options: {
  paintCanvas: HTMLCanvasElement;
  linesCanvas: HTMLCanvasElement;
  shape: PieceShape;
  difficulty: Difficulty;
  includeCutLines: boolean;
  /** Exports the page as it is viewed, so landscape comes out sideways. */
  orientation: Orientation;
}): Promise<HTMLCanvasElement> {
  const {
    paintCanvas,
    linesCanvas,
    shape,
    difficulty,
    includeCutLines,
    orientation,
  } = options;
  const out = document.createElement("canvas");
  const { width, height } = CANVAS_SIZE[orientation];
  out.width = width * PRINT_SCALE;
  out.height = height * PRINT_SCALE;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas");

  ctx.scale(PRINT_SCALE, PRINT_SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  applyViewTransform(ctx, orientation);
  ctx.drawImage(paintCanvas, 0, 0);
  ctx.drawImage(linesCanvas, 0, 0);
  ctx.restore();
  if (includeCutLines) {
    drawCutLines(ctx, shape, difficulty, width, height);
  }
  return out;
}

export function downloadPng(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function downloadPdf(canvas: HTMLCanvasElement, filename: string): void {
  const img = canvas.toDataURL("image/jpeg", 0.92);
  const landscape = canvas.width > canvas.height;
  const pdf = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "in",
    format: "letter",
  });
  pdf.addImage(img, "JPEG", 0, 0, landscape ? 11 : 8.5, landscape ? 8.5 : 11);
  pdf.save(filename);
}
