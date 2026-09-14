"use client";

import { useState } from "react";
import { downloadPdf, downloadPng } from "@/lib/export";
import { SHAPE_LABELS } from "@/lib/constants";
import { difficultyPieceLabel } from "@/lib/puzzleShapes";
import type { Difficulty, PieceShape } from "@/types/studio";

interface PreviewModalProps {
  open: boolean;
  previewUrl: string | null;
  shape: PieceShape;
  difficulty: Difficulty;
  exportCanvas: HTMLCanvasElement | null;
  onClose: () => void;
  onKeepPainting: () => void;
}

export function PreviewModal({
  open,
  previewUrl,
  shape,
  difficulty,
  exportCanvas,
  onClose,
  onKeepPainting,
}: PreviewModalProps) {
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);

  if (!open) return null;

  const handlePng = () => {
    if (!exportCanvas) return;
    setBusy("png");
    downloadPng(exportCanvas, "puzzle-painter.png");
    setBusy(null);
  };

  const handlePdf = () => {
    if (!exportCanvas) return;
    setBusy("pdf");
    downloadPdf(exportCanvas, "puzzle-painter.pdf");
    setBusy(null);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal preview-modal"
        role="dialog"
        aria-labelledby="preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header centered">
          <h2 id="preview-title">⭐ Your Puzzle Preview! ⭐</h2>
          <p>
            Dotted lines show where to cut · {SHAPE_LABELS[shape]} ·{" "}
            {difficultyPieceLabel(difficulty, shape)}
          </p>
        </header>

        <div className="preview-frame">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Puzzle preview with cut lines" />
          ) : (
            <p>Making preview…</p>
          )}
        </div>

        <div className="howto">
          <strong>How to make your puzzle:</strong>
          <ol>
            <li>Download and print on letter-size paper</li>
            <li>Cut along every dotted line</li>
            <li>Mix up the pieces and solve your puzzle!</li>
          </ol>
        </div>

        <div className="modal-actions wrap">
          <button type="button" className="btn-secondary" onClick={onKeepPainting}>
            Keep painting
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handlePng}
            disabled={!exportCanvas || busy !== null}
          >
            {busy === "png" ? "Saving…" : "Download PNG"}
          </button>
          <button
            type="button"
            className="btn-primary alt"
            onClick={handlePdf}
            disabled={!exportCanvas || busy !== null}
          >
            {busy === "pdf" ? "Saving…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
