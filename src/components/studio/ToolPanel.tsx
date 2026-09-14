"use client";

import {
  BRUSH_SIZE_PX,
  CANDY_COLORS,
  STAMPS,
} from "@/lib/constants";
import type { BrushSize, ToolId } from "@/types/studio";

const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: "brush", label: "Brush", icon: "🖌️" },
  { id: "pencil", label: "Pencil", icon: "✏️" },
  { id: "marker", label: "Marker", icon: "🖊️" },
  { id: "fill", label: "Fill", icon: "🪣" },
  { id: "eraser", label: "Eraser", icon: "🧹" },
  { id: "text", label: "Text", icon: "🔤" },
  { id: "stamp", label: "Stamp", icon: "⭐" },
];

const SIZES: BrushSize[] = ["sm", "md", "lg"];

interface ToolPanelProps {
  tool: ToolId;
  color: string;
  brushSize: BrushSize;
  stampId: string;
  textValue: string;
  onToolChange: (tool: ToolId) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: BrushSize) => void;
  onStampChange: (id: string) => void;
  onTextChange: (value: string) => void;
  onOpenPages: () => void;
}

export function ToolPanel({
  tool,
  color,
  brushSize,
  stampId,
  textValue,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onStampChange,
  onTextChange,
  onOpenPages,
}: ToolPanelProps) {
  return (
    <aside className="panel tool-panel">
      <button type="button" className="pages-launch" onClick={onOpenPages}>
        <span className="pages-launch-icon">📚</span>
        <span>
          <strong>Coloring Pages</strong>
          <small>Pick a template</small>
        </span>
      </button>

      <section>
        <h2 className="panel-title">Tools</h2>
        <div className="tool-grid">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tool-btn ${tool === t.id ? "active" : ""}`}
              onClick={() => onToolChange(t.id)}
              aria-pressed={tool === t.id}
            >
              <span aria-hidden>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {tool === "stamp" && (
        <section>
          <h2 className="panel-title">Pick a stamp</h2>
          <div className="stamp-grid">
            {STAMPS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`stamp-btn ${stampId === s.id ? "active" : ""}`}
                onClick={() => onStampChange(s.id)}
                title={s.label}
                aria-label={s.label}
              >
                {s.emoji}
              </button>
            ))}
          </div>
        </section>
      )}

      {tool === "text" && (
        <section>
          <h2 className="panel-title">Your words</h2>
          <input
            className="text-input"
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Type here…"
            maxLength={40}
          />
          <p className="hint">Then tap the canvas to place it!</p>
        </section>
      )}

      <section>
        <h2 className="panel-title">Color</h2>
        <div className="color-current" style={{ background: color }} />
        <div className="color-grid">
          {CANDY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch ${color === c ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => onColorChange(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </section>

      {(tool === "brush" ||
        tool === "pencil" ||
        tool === "marker" ||
        tool === "eraser" ||
        tool === "stamp" ||
        tool === "text") && (
        <section>
          <h2 className="panel-title">Size</h2>
          <div className="size-row">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={`size-btn ${brushSize === s ? "active" : ""}`}
                onClick={() => onBrushSizeChange(s)}
              >
                <span
                  className="size-dot"
                  style={{
                    width: BRUSH_SIZE_PX[s] + 6,
                    height: BRUSH_SIZE_PX[s] + 6,
                  }}
                />
                {s === "sm" ? "Sm" : s === "md" ? "Med" : "Lg"}
              </button>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
