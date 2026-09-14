"use client";

import { useMemo, useState } from "react";
import { TEMPLATES } from "@/lib/templates";

interface TemplateGalleryProps {
  open: boolean;
  activeTemplateId: string | null;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  onDescribe: () => void;
}

const THEMES = [
  { id: "all", label: "All" },
  { id: "animals", label: "Animals" },
  { id: "food", label: "Food" },
  { id: "space", label: "Space" },
  { id: "balls", label: "Balls" },
  { id: "vehicles", label: "Vehicles" },
] as const;

export function TemplateGallery({
  open,
  activeTemplateId,
  onClose,
  onSelect,
  onDescribe,
}: TemplateGalleryProps) {
  const [theme, setTheme] = useState<(typeof THEMES)[number]["id"]>("all");

  const items = useMemo(() => {
    if (theme === "all") return TEMPLATES;
    if (theme === "animals") {
      return TEMPLATES.filter(
        (t) => t.theme === "animals" || t.theme === "blank",
      );
    }
    return TEMPLATES.filter((t) => t.theme === theme || t.theme === "blank");
  }, [theme]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal gallery-modal"
        role="dialog"
        aria-labelledby="gallery-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="gallery-title">Coloring Pages</h2>
            <p>Pick a page — or invent your own!</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <button type="button" className="describe-launch" onClick={onDescribe}>
          <span className="describe-sparkle" aria-hidden>
            ✨
          </span>
          <span>
            <strong>Describe a page</strong>
            <small>Tell the art helper what you want to paint</small>
          </span>
        </button>

        <div className="theme-chips">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`chip ${theme === t.id ? "active" : ""}`}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="gallery-grid">
          {items.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`gallery-card ${activeTemplateId === t.id ? "active" : ""}`}
              onClick={() => {
                onSelect(t.id);
                onClose();
              }}
            >
              <div className="gallery-thumb">
                {t.id === "blank" ? (
                  <span className="blank-thumb">✏️</span>
                ) : (
                  <div
                    className="thumb-svg"
                    dangerouslySetInnerHTML={{ __html: scaleThumb(t.svg) }}
                  />
                )}
              </div>
              <span className="gallery-label">{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function scaleThumb(svg: string): string {
  return svg
    .replace(/width="[^"]*"/, 'width="100%"')
    .replace(/height="[^"]*"/, 'height="100%"')
    .replace(/stroke-width="3"/g, 'stroke-width="5"');
}
