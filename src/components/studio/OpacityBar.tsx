"use client";

import { useRef } from "react";

const MIN_OPACITY = 0.1;
const STEP = 0.05;

interface OpacityBarProps {
  color: string;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

function clampOpacity(value: number): number {
  const stepped = Math.round(value / STEP) * STEP;
  return Math.min(1, Math.max(MIN_OPACITY, Number(stepped.toFixed(2))));
}

/**
 * Current-color swatch that doubles as an opacity slider: it fades from
 * see-through on the left to solid on the right, and tapping/dragging along
 * it picks how strong the color is.
 */
export function OpacityBar({ color, opacity, onOpacityChange }: OpacityBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pickAt = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    onOpacityChange(clampOpacity((clientX - rect.left) / rect.width));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const delta =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? STEP
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? -STEP
          : null;
    if (e.key === "Home") onOpacityChange(MIN_OPACITY);
    else if (e.key === "End") onOpacityChange(1);
    else if (delta !== null) onOpacityChange(clampOpacity(opacity + delta));
    else return;
    e.preventDefault();
  };

  const percent = Math.round(opacity * 100);

  return (
    <div className="opacity-bar-wrap">
      <div
        ref={barRef}
        className="color-current opacity-bar"
        style={{ "--bar-color": color } as React.CSSProperties}
        role="slider"
        tabIndex={0}
        aria-label="Color strength"
        aria-valuemin={MIN_OPACITY * 100}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%`}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          pickAt(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) pickAt(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={handleKeyDown}
      >
        <span className="opacity-bar-thumb" style={{ left: `${percent}%` }} />
      </div>
      <div className="opacity-bar-labels" aria-hidden>
        <span>See-through</span>
        <span>{percent}%</span>
        <span>Solid</span>
      </div>
    </div>
  );
}
