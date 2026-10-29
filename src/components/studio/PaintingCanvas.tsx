"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  BRUSH_SIZE_PX,
  CANVAS_HEIGHT,
  CANVAS_SIZE,
  CANVAS_WIDTH,
} from "@/lib/constants";
import { getFallbackCursor, getToolCursor } from "@/lib/cursors";
import {
  applyViewTransform,
  floodFill,
  getCanvasPoint,
  strokeWidth,
  toolAlpha,
  viewToPage,
} from "@/lib/drawing";
import { drawCutLines } from "@/lib/puzzleShapes";
import { renderImageToCanvas, renderSvgToCanvas } from "@/lib/templates";
import type {
  BrushSize,
  Difficulty,
  Orientation,
  PieceShape,
  ToolId,
} from "@/types/studio";

export interface PaintingCanvasHandle {
  undo: () => void;
  redo: () => void;
  clearPaint: () => void;
  loadTemplateSvg: (svg: string) => Promise<void>;
  loadTemplateImage: (url: string | null) => Promise<void>;
  restorePaintDataUrl: (dataUrl: string) => Promise<void>;
  getPaintDataUrl: () => string;
  getPaintCanvas: () => HTMLCanvasElement | null;
  getLinesCanvas: () => HTMLCanvasElement | null;
  hasPaint: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface PaintingCanvasProps {
  /**
   * How the page is shown. Only the visible canvas turns; the paint/lines
   * layers and undo history always stay portrait (see lib/drawing.ts).
   */
  orientation: Orientation;
  tool: ToolId;
  color: string;
  /** 0–1 strength of `color`, applied to brush/pencil/marker/fill/text. */
  opacity: number;
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
    orientation,
    tool,
    color,
    opacity,
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
  const view = CANVAS_SIZE[orientation];
  const displayRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef<HTMLCanvasElement | null>(null);
  const linesRef = useRef<HTMLCanvasElement | null>(null);
  // The in-progress stroke is drawn opaque here and laid onto the paint layer
  // at its alpha when it ends, so translucent strokes don't darken wherever
  // their segments overlap. strokeAlpha is null when no such stroke is active.
  const strokeRef = useRef<HTMLCanvasElement | null>(null);
  const strokeAlpha = useRef<number | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<ImageData[]>([]);
  const historyIndex = useRef(-1);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const opacityRef = useRef(opacity);
  const sizeRef = useRef(brushSize);
  const stampRef = useRef(stampEmoji);
  const textRef = useRef(textValue);
  const orientationRef = useRef(orientation);

  orientationRef.current = orientation;
  toolRef.current = tool;
  colorRef.current = color;
  opacityRef.current = opacity;
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
    if (!strokeRef.current) {
      const c = document.createElement("canvas");
      c.width = CANVAS_WIDTH;
      c.height = CANVAS_HEIGHT;
      strokeRef.current = c;
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
    const { width, height } = CANVAS_SIZE[orientation];
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    applyViewTransform(ctx, orientation);
    ctx.drawImage(paint, 0, 0);
    if (strokeAlpha.current !== null && strokeRef.current) {
      ctx.globalAlpha = strokeAlpha.current;
      ctx.drawImage(strokeRef.current, 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(lines, 0, 0);
    ctx.restore();
    // Cut lines belong to the printed sheet, so they follow the view.
    if (showCutLines) {
      drawCutLines(ctx, pieceShape, difficulty, width, height);
    }
  }, [difficulty, ensureLayers, orientation, pieceShape, showCutLines]);

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

  // Also redraws after an orientation change resizes (and so clears) the
  // visible canvas.
  useEffect(() => {
    composite();
  }, [composite, showCutLines, pieceShape, difficulty, orientation]);

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
      loadTemplateImage: async (url: string | null) => {
        ensureLayers();
        const lines = linesRef.current;
        if (!lines) return;
        await renderImageToCanvas(lines, url);
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
    const t = toolRef.current;
    // Eraser cuts straight into the paint layer; color tools go through the
    // stroke layer (see strokeRef).
    const target = t === "eraser" ? paintRef.current : strokeRef.current;
    if (!target) return;
    const ctx = target.getContext("2d");
    if (!ctx) return;

    if (t === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      if (isStart) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        strokeAlpha.current = toolAlpha(t) * opacityRef.current;
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = colorRef.current;
      ctx.fillStyle = colorRef.current;
    }

    ctx.lineWidth = strokeWidth(t, BRUSH_SIZE_PX[sizeRef.current]);
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
    ctx.globalCompositeOperation = "source-over";
    lastPoint.current = { x, y };
    composite();
  };

  /** Lays the finished stroke-layer stroke onto the paint layer at its alpha. */
  const commitStroke = () => {
    const alpha = strokeAlpha.current;
    const stroke = strokeRef.current;
    const ctx = paintRef.current?.getContext("2d");
    if (alpha === null || !stroke || !ctx) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(stroke, 0, 0);
    ctx.globalAlpha = 1;
    strokeAlpha.current = null;
    stroke.getContext("2d")?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    composite();
  };

  const placeStampOrText = (x: number, y: number) => {
    ensureLayers();
    const paint = paintRef.current;
    if (!paint) return;
    const ctx = paint.getContext("2d");
    if (!ctx) return;
    const t = toolRef.current;

    // Counter-rotate so stamps and text read upright in a landscape view.
    ctx.save();
    ctx.translate(x, y);
    if (orientationRef.current === "landscape") ctx.rotate(-Math.PI / 2);
    if (t === "stamp") {
      const size = BRUSH_SIZE_PX[sizeRef.current] * 3.2;
      ctx.font = `${size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(stampRef.current, 0, 0);
    } else if (t === "text") {
      const size = BRUSH_SIZE_PX[sizeRef.current] * 2.4;
      ctx.font = `700 ${size}px Fredoka, Nunito, sans-serif`;
      ctx.fillStyle = colorRef.current;
      ctx.globalAlpha = opacityRef.current;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const value = textRef.current.trim() || "Hello!";
      ctx.fillText(value, 0, 0);
    }
    ctx.restore();
    composite();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = displayRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = viewToPage(
      getCanvasPoint(canvas, e.clientX, e.clientY),
      orientationRef.current,
    );
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
        opacity: opacityRef.current,
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
    const { x, y } = viewToPage(
      getCanvasPoint(canvas, e.clientX, e.clientY),
      orientationRef.current,
    );
    paintStroke(x, y, false);
  };

  const endStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    commitStroke();
    pushHistory();
    onPainted?.();
  };

  // Icon cursors need a DOM canvas, so build them after mount to keep the
  // server render (keyword cursor) and first client render in agreement.
  const [cursor, setCursor] = useState(() => getFallbackCursor(tool));
  // On-screen px per canvas px. Re-measured on resize and on pointer enter,
  // since the zoom control scales the frame with a transform, which
  // ResizeObserver doesn't report.
  const [displayScale, setDisplayScale] = useState(1);
  const measureScale = useCallback(() => {
    const canvas = displayRef.current;
    if (!canvas) return;
    const width = canvas.getBoundingClientRect().width;
    if (width > 0) setDisplayScale(width / canvas.width);
  }, []);
  useEffect(() => {
    const canvas = displayRef.current;
    if (!canvas) return;
    measureScale();
    const observer = new ResizeObserver(measureScale);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [measureScale]);
  useEffect(() => {
    setCursor(
      getToolCursor({
        tool,
        color,
        opacity,
        stampEmoji,
        sizePx: BRUSH_SIZE_PX[brushSize],
        scale: displayScale,
      }),
    );
  }, [tool, color, opacity, stampEmoji, brushSize, displayScale]);

  return (
    <canvas
      ref={displayRef}
      width={view.width}
      height={view.height}
      className={`painting-canvas ${orientation}`}
      style={{ cursor }}
      onPointerEnter={measureScale}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={endStroke}
    />
  );
});
