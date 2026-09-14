import { jsPDF } from "jspdf";
import { CANVAS_HEIGHT, CANVAS_WIDTH, PRINT_SCALE } from "@/lib/constants";
import { drawCutLines } from "@/lib/puzzleShapes";
import type { Difficulty, PieceShape } from "@/types/studio";

export async function composeExportCanvas(options: {
  paintCanvas: HTMLCanvasElement;
  linesCanvas: HTMLCanvasElement;
  shape: PieceShape;
  difficulty: Difficulty;
  includeCutLines: boolean;
}): Promise<HTMLCanvasElement> {
  const { paintCanvas, linesCanvas, shape, difficulty, includeCutLines } = options;
  const out = document.createElement("canvas");
  out.width = CANVAS_WIDTH * PRINT_SCALE;
  out.height = CANVAS_HEIGHT * PRINT_SCALE;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas");

  ctx.scale(PRINT_SCALE, PRINT_SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.drawImage(paintCanvas, 0, 0);
  ctx.drawImage(linesCanvas, 0, 0);
  if (includeCutLines) {
    drawCutLines(ctx, shape, difficulty);
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
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "in",
    format: "letter",
  });
  pdf.addImage(img, "JPEG", 0, 0, 8.5, 11);
  pdf.save(filename);
}
