"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_COLOR,
  DEFAULT_SECONDARY,
  STAMPS,
} from "@/lib/constants";
import { composeExportCanvas } from "@/lib/export";
import { clearStudioState, loadStudioState, saveStudioState } from "@/lib/storage";
import { getTemplateById } from "@/lib/templates";
import type {
  BrushSize,
  Difficulty,
  PieceShape,
  Stage,
  ToolId,
} from "@/types/studio";
import { DescribePageModal } from "@/components/studio/DescribePageModal";
import {
  PaintingCanvas,
  type PaintingCanvasHandle,
} from "@/components/studio/PaintingCanvas";
import { PreviewModal } from "@/components/studio/PreviewModal";
import { PuzzlePanel } from "@/components/studio/PuzzlePanel";
import { SwitchPageConfirm } from "@/components/studio/SwitchPageConfirm";
import { TemplateGallery } from "@/components/studio/TemplateGallery";
import { ToolPanel } from "@/components/studio/ToolPanel";

type PendingPageChange =
  | { kind: "template"; id: string; name: string }
  | { kind: "custom"; svg: string; name: string };

export function Studio() {
  const canvasRef = useRef<PaintingCanvasHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  const [tool, setTool] = useState<ToolId>("brush");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState<BrushSize>("md");
  const [stampId, setStampId] = useState("rainbow");
  const [textValue, setTextValue] = useState("Hello!");
  const [stage, setStage] = useState<Stage>("create");
  const [shape, setShape] = useState<PieceShape>("rectangle");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [showCutLines, setShowCutLines] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>("blank");
  const [customSvg, setCustomSvg] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [describeOpen, setDescribeOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingPage, setPendingPage] = useState<PendingPageChange | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exportCanvas, setExportCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);

  const stampEmoji =
    STAMPS.find((s) => s.id === stampId)?.emoji ?? "⭐";

  const syncHistory = useCallback(() => {
    setCanUndo(canvasRef.current?.canUndo() ?? false);
    setCanRedo(canvasRef.current?.canRedo() ?? false);
  }, []);

  const persist = useCallback(() => {
    const paintDataUrl = canvasRef.current?.getPaintDataUrl() ?? null;
    saveStudioState({
      version: 1,
      paintDataUrl,
      templateId,
      customTemplateSvg: customSvg,
      tool,
      color,
      secondaryColor: DEFAULT_SECONDARY,
      brushSize,
      stampId,
      puzzle: { shape, difficulty, showCutLines },
      textValue,
    });
  }, [
    brushSize,
    color,
    customSvg,
    difficulty,
    shape,
    showCutLines,
    stampId,
    templateId,
    textValue,
    tool,
  ]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(), 400);
  }, [persist]);

  // Hydrate from localStorage once canvas is ready
  useEffect(() => {
    if (hydrated.current) return;
    const saved = loadStudioState();
    hydrated.current = true;
    if (!saved) {
      void canvasRef.current?.loadTemplateSvg(
        getTemplateById("blank")?.svg ?? "",
      );
      return;
    }

    setTool(saved.tool);
    setColor(saved.color);
    setBrushSize(saved.brushSize);
    setStampId(saved.stampId);
    setTextValue(saved.textValue);
    setShape(saved.puzzle.shape);
    setDifficulty(saved.puzzle.difficulty);
    setShowCutLines(saved.puzzle.showCutLines);
    setTemplateId(saved.templateId);
    setCustomSvg(saved.customTemplateSvg);

    const boot = async () => {
      if (saved.customTemplateSvg) {
        await canvasRef.current?.loadTemplateSvg(saved.customTemplateSvg);
      } else if (saved.templateId) {
        const t = getTemplateById(saved.templateId);
        await canvasRef.current?.loadTemplateSvg(t?.svg ?? "");
      }
      if (saved.paintDataUrl) {
        await canvasRef.current?.restorePaintDataUrl(saved.paintDataUrl);
      }
      syncHistory();
    };
    void boot();
  }, [syncHistory]);

  useEffect(() => {
    if (!hydrated.current) return;
    scheduleSave();
  }, [
    tool,
    color,
    brushSize,
    stampId,
    textValue,
    shape,
    difficulty,
    showCutLines,
    templateId,
    customSvg,
    scheduleSave,
  ]);

  const applyTemplate = async (id: string, resetPaint: boolean) => {
    const t = getTemplateById(id);
    if (!t) return;
    setTemplateId(id);
    setCustomSvg(null);
    await canvasRef.current?.loadTemplateSvg(t.svg);
    if (resetPaint) {
      canvasRef.current?.clearPaint();
      syncHistory();
    }
    scheduleSave();
  };

  const applyCustomSvg = async (svg: string, resetPaint: boolean) => {
    setCustomSvg(svg);
    setTemplateId("custom");
    await canvasRef.current?.loadTemplateSvg(svg);
    if (resetPaint) {
      canvasRef.current?.clearPaint();
      syncHistory();
    }
    scheduleSave();
  };

  const requestTemplate = (id: string) => {
    const t = getTemplateById(id);
    if (!t) return;
    if (id === templateId && !customSvg) return;
    if (!canvasRef.current?.hasPaint()) {
      void applyTemplate(id, false);
      return;
    }
    setPendingPage({ kind: "template", id, name: t.name });
  };

  const requestCustomSvg = (svg: string) => {
    if (!canvasRef.current?.hasPaint()) {
      void applyCustomSvg(svg, false);
      return;
    }
    setPendingPage({ kind: "custom", svg, name: "your new page" });
  };

  const confirmPendingPage = (resetPaint: boolean) => {
    if (!pendingPage) return;
    const next = pendingPage;
    setPendingPage(null);
    if (next.kind === "template") {
      void applyTemplate(next.id, resetPaint);
    } else {
      void applyCustomSvg(next.svg, resetPaint);
    }
  };

  const openPreview = async () => {
    setStage("print");
    setShowCutLines(true);
    const paint = canvasRef.current?.getPaintCanvas();
    const lines = canvasRef.current?.getLinesCanvas();
    if (!paint || !lines) return;
    const composed = await composeExportCanvas({
      paintCanvas: paint,
      linesCanvas: lines,
      shape,
      difficulty,
      includeCutLines: true,
    });
    setExportCanvas(composed);
    setPreviewUrl(composed.toDataURL("image/png"));
    setPreviewOpen(true);
  };

  const handleClear = () => {
    if (!window.confirm("Clear your painting? The outline stays.")) return;
    canvasRef.current?.clearPaint();
    scheduleSave();
    syncHistory();
  };

  const handleResetAll = () => {
    if (!window.confirm("Start over completely? This clears saved art too.")) {
      return;
    }
    clearStudioState();
    setCustomSvg(null);
    setTemplateId("blank");
    setShowCutLines(false);
    setTool("brush");
    void (async () => {
      await canvasRef.current?.loadTemplateSvg(
        getTemplateById("blank")?.svg ?? "",
      );
      canvasRef.current?.clearPaint();
      syncHistory();
    })();
  };

  return (
    <div className="studio">
      <header className="studio-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            🎨
          </span>
          <div>
            <h1>Puzzle Painter</h1>
            <p>Paint it. Cut it. Solve it!</p>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn header-icon"
            onClick={() => {
              canvasRef.current?.undo();
              syncHistory();
              scheduleSave();
            }}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo"
          >
            ↶
          </button>
          <button
            type="button"
            className="icon-btn header-icon"
            onClick={() => {
              canvasRef.current?.redo();
              syncHistory();
              scheduleSave();
            }}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo"
          >
            ↷
          </button>
          <button
            type="button"
            className="icon-btn header-icon"
            onClick={handleClear}
            aria-label="Clear painting"
            title="Clear painting"
          >
            🗑️
          </button>
          <div className="zoom-control">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              aria-label="Zoom out"
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="text-reset"
            onClick={handleResetAll}
          >
            New
          </button>
        </div>
      </header>

      <div className="studio-body">
        <ToolPanel
          tool={tool}
          color={color}
          brushSize={brushSize}
          stampId={stampId}
          textValue={textValue}
          onToolChange={setTool}
          onColorChange={setColor}
          onBrushSizeChange={setBrushSize}
          onStampChange={setStampId}
          onTextChange={setTextValue}
          onOpenPages={() => setGalleryOpen(true)}
        />

        <main className="canvas-stage">
          <div
            className="canvas-frame"
            style={{ transform: `scale(${zoom})` }}
          >
            <PaintingCanvas
              ref={canvasRef}
              tool={tool}
              color={color}
              brushSize={brushSize}
              stampEmoji={stampEmoji}
              textValue={textValue}
              showCutLines={showCutLines}
              pieceShape={shape}
              difficulty={difficulty}
              onHistoryChange={syncHistory}
              onPainted={scheduleSave}
            />
          </div>
        </main>

        <PuzzlePanel
          stage={stage}
          shape={shape}
          difficulty={difficulty}
          showCutLines={showCutLines}
          onStageChange={(s) => {
            setStage(s);
            if (s === "cut") setShowCutLines(true);
            if (s === "print") void openPreview();
          }}
          onShapeChange={setShape}
          onDifficultyChange={setDifficulty}
          onToggleCutLines={() => setShowCutLines((v) => !v)}
          onPreview={() => void openPreview()}
        />
      </div>

      <TemplateGallery
        open={galleryOpen}
        activeTemplateId={templateId}
        onClose={() => setGalleryOpen(false)}
        onSelect={requestTemplate}
        onDescribe={() => {
          setGalleryOpen(false);
          setDescribeOpen(true);
        }}
      />

      <DescribePageModal
        open={describeOpen}
        onClose={() => setDescribeOpen(false)}
        onGenerated={requestCustomSvg}
      />

      <SwitchPageConfirm
        open={pendingPage !== null}
        pageName={pendingPage?.name}
        onCancel={() => setPendingPage(null)}
        onKeep={() => confirmPendingPage(false)}
        onReset={() => confirmPendingPage(true)}
      />

      <PreviewModal
        open={previewOpen}
        previewUrl={previewUrl}
        shape={shape}
        difficulty={difficulty}
        exportCanvas={exportCanvas}
        onClose={() => setPreviewOpen(false)}
        onKeepPainting={() => {
          setPreviewOpen(false);
          setStage("create");
        }}
      />
    </div>
  );
}
