"use client";

import { DIFFICULTY_META, SHAPE_LABELS } from "@/lib/constants";
import { difficultyPieceLabel } from "@/lib/puzzleShapes";
import type { Difficulty, PieceShape, Stage } from "@/types/studio";

const SHAPES: PieceShape[] = ["rectangle", "triangle", "jigsaw"];
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

interface PuzzlePanelProps {
  stage: Stage;
  shape: PieceShape;
  difficulty: Difficulty;
  showCutLines: boolean;
  open: boolean;
  onClose: () => void;
  onStageChange: (stage: Stage) => void;
  onShapeChange: (shape: PieceShape) => void;
  onDifficultyChange: (d: Difficulty) => void;
  onToggleCutLines: () => void;
  onPreview: () => void;
}

export function PuzzlePanel({
  stage,
  shape,
  difficulty,
  showCutLines,
  open,
  onClose,
  onStageChange,
  onShapeChange,
  onDifficultyChange,
  onToggleCutLines,
  onPreview,
}: PuzzlePanelProps) {
  return (
    <aside className={`panel puzzle-panel ${open ? "sheet-open" : ""}`}>
      <button
        type="button"
        className="puzzle-close"
        onClick={onClose}
        aria-label="Close puzzle settings"
      >
        ✕
      </button>

      <div className="stage-tabs" role="tablist" aria-label="Studio stages">
        {(
          [
            ["create", "Create"],
            ["cut", "Cut"],
            ["print", "Print"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={stage === id}
            className={`stage-tab ${stage === id ? "active" : ""}`}
            onClick={() => onStageChange(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <section>
        <h2 className="panel-title">Pieces</h2>
        <div className="diff-stack">
          {DIFFS.map((d) => (
            <button
              key={d}
              type="button"
              className={`diff-btn diff-${d} ${difficulty === d ? "active" : ""}`}
              onClick={() => onDifficultyChange(d)}
            >
              <strong>{DIFFICULTY_META[d].label}</strong>
              <span>
                {difficultyPieceLabel(d, shape)} · {DIFFICULTY_META[d].ages}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="panel-title">Piece shape</h2>
        <div className="shape-row">
          {SHAPES.map((s) => (
            <button
              key={s}
              type="button"
              className={`shape-btn ${shape === s ? "active" : ""}`}
              onClick={() => onShapeChange(s)}
            >
              <ShapeIcon shape={s} />
              {SHAPE_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className={`cut-toggle ${showCutLines ? "on" : ""}`}
        onClick={onToggleCutLines}
        aria-pressed={showCutLines}
      >
        <span className="toggle-knob" />
        <span>
          <strong>Show cut lines</strong>
          <small>Dotted lines for scissors</small>
        </span>
      </button>

      <button type="button" className="make-puzzle-btn" onClick={onPreview}>
        <span aria-hidden>👀</span>
        Make my puzzle!
        <small>Preview before printing</small>
      </button>
    </aside>
  );
}

function ShapeIcon({ shape }: { shape: PieceShape }) {
  if (shape === "rectangle") {
    return (
      <svg viewBox="0 0 32 32" className="shape-icon" aria-hidden>
        <rect x="4" y="4" width="10" height="10" fill="currentColor" opacity="0.85" />
        <rect x="18" y="4" width="10" height="10" fill="currentColor" opacity="0.55" />
        <rect x="4" y="18" width="10" height="10" fill="currentColor" opacity="0.55" />
        <rect x="18" y="18" width="10" height="10" fill="currentColor" opacity="0.85" />
      </svg>
    );
  }
  if (shape === "triangle") {
    return (
      <svg viewBox="0 0 32 32" className="shape-icon" aria-hidden>
        <path d="M4 26 L16 6 L28 26Z" fill="currentColor" opacity="0.8" />
        <path d="M8 24 L16 12 L24 24Z" fill="#fff" opacity="0.35" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="shape-icon" aria-hidden>
      <path
        d="M6 6h8c0 3 4 3 4 0h8v8c-3 0-3 4 0 4v8h-8c0-3-4-3-4 0H6v-8c3 0 3-4 0-4V6z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}
