"use client";

import { useState } from "react";
import { BRUSH_SIZE_PX, CANDY_COLORS } from "@/lib/constants";
import type { BrushSize, ToolId } from "@/types/studio";

const SIZES: BrushSize[] = ["sm", "md", "lg"];

const SIZE_RELEVANT_TOOLS: ToolId[] = [
  "brush",
  "pencil",
  "marker",
  "eraser",
  "stamp",
  "text",
];

interface ColorRailProps {
  tool: ToolId;
  color: string;
  recentColors: string[];
  brushSize: BrushSize;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: BrushSize) => void;
  onOpenPuzzle: () => void;
}

/**
 * Narrow-viewport-only right rail (see globals.css `.color-rail`, hidden on
 * desktop where ToolPanel's inline color grid + size row are used instead).
 * Color and brush size are both paint attributes (not tool choices), so
 * they live together here, opposite the left tool rail. Trades the
 * always-visible 28-swatch grid for current + 3 recents, with the full grid
 * one tap away, so the canvas doesn't have to share height with it.
 */
export function ColorRail({
  tool,
  color,
  recentColors,
  brushSize,
  onColorChange,
  onBrushSizeChange,
  onOpenPuzzle,
}: ColorRailProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const recents = recentColors.filter((c) => c !== color).slice(0, 3);
  const showSize = SIZE_RELEVANT_TOOLS.includes(tool);

  return (
    <aside className="color-rail">
      <button
        type="button"
        className="color-rail-current"
        style={{ background: color }}
        onClick={() => setPickerOpen(true)}
        aria-label="Choose color"
      />

      {recents.map((c) => (
        <button
          key={c}
          type="button"
          className="color-rail-swatch"
          style={{ background: c }}
          onClick={() => onColorChange(c)}
          aria-label={`Recent color ${c}`}
        />
      ))}

      <button
        type="button"
        className="color-rail-more"
        onClick={() => setPickerOpen(true)}
      >
        <span aria-hidden>🎨</span>
        <span>More</span>
      </button>

      {showSize && (
        <div className="color-rail-sizes">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={`color-rail-size-btn ${brushSize === s ? "active" : ""}`}
              onClick={() => onBrushSizeChange(s)}
              aria-label={`Brush size ${s}`}
              aria-pressed={brushSize === s}
            >
              <span
                className="size-dot"
                style={{
                  width: BRUSH_SIZE_PX[s] + 4,
                  height: BRUSH_SIZE_PX[s] + 4,
                }}
              />
            </button>
          ))}
        </div>
      )}

      <button type="button" className="color-rail-puzzle" onClick={onOpenPuzzle}>
        <span aria-hidden>🧩</span>
        <span>Puzzle</span>
      </button>

      {pickerOpen && (
        <div className="modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div
            className="modal color-picker-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Choose a color</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPickerOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="color-grid">
              {CANDY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch ${color === c ? "active" : ""}`}
                  style={{ background: c }}
                  onClick={() => {
                    onColorChange(c);
                    setPickerOpen(false);
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
