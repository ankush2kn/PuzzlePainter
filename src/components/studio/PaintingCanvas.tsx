"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { BRUSH_SIZE_PX, CANVAS_HEIGHT, CANVAS_WIDTH } from "@/lib/constants";
import { floodFill, getCanvasPoint } from "@/lib/drawing";
import { drawCutLines } from "@/lib/puzzleShapes";
import { renderSvgToCanvas } from "@/lib/templates";
import type { BrushSize, Difficulty, PieceShape, ToolId } from "@/types/studio";

export interface PaintingCanvasHandle {
  undo: () => void;
  redo: () => void;
  clearPaint: () => void;
  loadTemplateSvg: (svg: string) => Promise<void>;
  restorePaintDataUrl: (dataUrl: string) => Promise<void>;
  getPaintDataUrl: () => string;
  getPaintCanvas: () => HTMLCanvasElement | null;
  getLinesCanvas: () => HTMLCanvasElement | null;
  hasPaint: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface PaintingCanvasProps {
  tool: ToolId;
  color: string;
  brushSize: BrushSize;
  stampEmoji: string;
  textValue: string;
  showCutLines: boolean;
  pieceShape: PieceShape;
  difficulty: Difficulty;
  onHistoryChange?: () => void;
  onPainted?: () => void;
}

const MAX_HISTORY = 30;

export const PaintingCanvas = forwardRef<
  PaintingCanvasHandle,
  PaintingCanvasProps
>(function PaintingCanvas(
  {
    tool,
    color,
    brushSize,
    stampEmoji,
    textValue,
    showCutLines,
    pieceShape,
    difficulty,
    onHistoryChange,
    onPainted,
  },
  ref,
) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef<HTMLCanvasElement | null>(null);
  const linesRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const historyIndex = useRef(-1);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(brushSize);
  const stampRef = useRef(stampEmoji);
  const textRef = useRef(textValue);

  toolRef.current = tool;
  colorRef.current = color;
  sizeRef.current = brushSize;
  stampRef.current = stampEmoji;
  textRef.current = textValue;

  const ensureLayers = useCallback(() => {
    if (!paintRef.current) {
      const c = document.createElement("canvas");
      c.width = CANVAS_WIDTH;
      c.height = CANVAS_HEIGHT;
      paintRef.current = c;
    }
    if (!linesRef.current) {
      const c = document.createElement("canvas");
      c.width = CANVAS_WIDTH;
      c.height = CANVAS_HEIGHT;
      linesRef.current = c;
    }
  }, []);

  const composite = useCallback(() => {
    ensureLayers();
    const display = displayRef.current;
    const paint = paintRef.current;
    const lines = linesRef.current;
    if (!display || !paint || !lines) return;
    const ctx = display.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(paint, 0, 0);
    ctx.drawImage(lines, 0, 0);
    if (showCutLines) {
      drawCutLines(ctx, pieceShape, difficulty);
    }
  }, [difficulty, ensureLayers, pieceShape, showCutLines]);

  const pushHistory = useCallback(() => {
    ensureLayers();
    const paint = paintRef.current;
    if (!paint) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push(snapshot);
    if (history.current.length > MAX_HISTORY) {
      history.current.shift();
    }
    historyIndex.current = history.current.length - 1;
    onHistoryChange?.();
  }, [ensureLayers, onHistoryChange]);

  const restoreHistory = useCallback(() => {
    ensureLayers();
    const paint = paintRef.current;
    if (!paint) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;
    const snap = history.current[historyIndex.current];
    if (!snap) return;
    ctx.putImageData(snap, 0, 0);
    composite();
    onHistoryChange?.();
    onPainted?.();
  }, [composite, ensureLayers, onHistoryChange, onPainted]);

  useEffect(() => {
    ensureLayers();
    const paint = paintRef.current;
    if (!paint) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;
    if (history.current.length === 0) {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      pushHistory();
    }
    composite();
  }, [composite, ensureLayers, pushHistory]);

  useEffect(() => {
    composite();
  }, [composite, showCutLines, pieceShape, difficulty]);

  useImperativeHandle(
    ref,
    () => ({
      undo: () => {
        if (historyIndex.current <= 0) return;
        historyIndex.current -= 1;
        restoreHistory();
      },
      redo: () => {
        if (historyIndex.current >= history.current.length - 1) return;
        historyIndex.current += 1;
        restoreHistory();
      },
      clearPaint: () => {
        ensureLayers();
        const paint = paintRef.current;
        if (!paint) return;
        const ctx = paint.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        pushHistory();
        composite();
        onPainted?.();
      },
      loadTemplateSvg: async (svg: string) => {
        ensureLayers();
        const lines = linesRef.current;
        if (!lines) return;
        await renderSvgToCanvas(lines, svg);
        composite();
      },
      restorePaintDataUrl: async (dataUrl: string) => {
        ensureLayers();
        const paint = paintRef.current;
        if (!paint) return;
        const ctx = paint.getContext("2d");
        if (!ctx) return;
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error("restore failed"));
          i.src = dataUrl;
        });
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.drawImage(img, 0, 0);
        history.current = [];
        historyIndex.current = -1;
        pushHistory();
        composite();
      },
      getPaintDataUrl: () => {
        ensureLayers();
        return paintRef.current?.toDataURL("image/png") ?? "";
      },
      getPaintCanvas: () => paintRef.current,
      getLinesCanvas: () => linesRef.current,
      hasPaint: () => {
        ensureLayers();
        const paint = paintRef.current;
        if (!paint) return false;
        const ctx = paint.getContext("2d");
        if (!ctx) return false;
        const { data } = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 8) return true;
        }
        return false;
      },
      canUndo: () => historyIndex.current > 0,
      canRedo: () => historyIndex.current < history.current.length - 1,
    }),
    [composite, ensureLayers, onPainted, pushHistory, restoreHistory],
  );

  const paintStroke = (x: number, y: number, isStart: boolean) => {
    ensureLayers();
    const paint = paintRef.current;
    if (!paint) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;

    const t = toolRef.current;
    const size = BRUSH_SIZE_PX[sizeRef.current];
    const col = colorRef.current;

    if (t === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
    }

    if (t === "marker") {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = size * 1.6;
    } else if (t === "pencil") {
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = Math.max(1.5, size * 0.35);
    } else {
      ctx.globalAlpha = 1;
      ctx.lineWidth = size;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const prev = lastPoint.current;
    if (isStart || !prev) {
      ctx.beginPath();
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    lastPoint.current = { x, y };
    composite();
  };

  const placeStampOrText = (x: number, y: number) => {
    ensureLayers();
    const paint = paintRef.current;
    if (!paint) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;
    const t = toolRef.current;

    if (t === "stamp") {
      const size = BRUSH_SIZE_PX[sizeRef.current] * 3.2;
      ctx.font = `${size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stampRef.current, x, y);
    } else if (t === "text") {
      const size = BRUSH_SIZE_PX[sizeRef.current] * 2.4;
      ctx.font = `700 ${size}px Fredoka, Nunito, sans-serif`;
      ctx.fillStyle = colorRef.current;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const value = textRef.current.trim() || "Hello!";
      ctx.fillText(value, x, y);
    }
    composite();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = displayRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasPoint(canvas, e.clientX, e.clientY);
    const t = toolRef.current;

    if (t === "fill") {
      ensureLayers();
      const paint = paintRef.current;
      const lines = linesRef.current;
      if (!paint || !lines) return;
      const paintCtx = paint.getContext("2d");
      const linesCtx = lines.getContext("2d");
      if (!paintCtx || !linesCtx) return;
      floodFill({
        paintCtx,
        linesCtx,
        x,
        y,
        fillColor: colorRef.current,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      });
      pushHistory();
      composite();
      onPainted?.();
      return;
    }

    if (t === "stamp" || t === "text") {
      placeStampOrText(x, y);
      pushHistory();
      onPainted?.();
      return;
    }

    drawing.current = true;
    lastPoint.current = null;
    paintStroke(x, y, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = displayRef.current;
    if (!canvas) return;
    const { x, y } = getCanvasPoint(canvas, e.clientX, e.clientY);
    paintStroke(x, y, false);
  };

  const endStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    pushHistory();
    onPainted?.();
  };

  const cursor =
    tool === "fill"
      ? "cell"
      : tool === "text" || tool === "stamp"
        ? "copy"
        : tool === "eraser"
          ? "cell"
          : "crosshair";

  return (
    <canvas
      ref={displayRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="painting-canvas"
      style={{ cursor }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={endStroke}
    />
  );
});
