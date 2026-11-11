"use client";

import { useEffect, useRef, useState } from "react";
import { createCubePreview, type CubePreview as Preview } from "@/lib/cubePreview";

interface CubePreviewProps {
  /** The page's paint and lines layers, once they exist. */
  getLayers: () => { paint: HTMLCanvasElement; lines: HTMLCanvasElement } | null;
  /** Bumped by the parent whenever the page changes. */
  version: number;
}

/** Floating 3D view of the paper cube being painted; folds, unfolds, spins. */
export function CubePreview({ getLayers, version }: CubePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<Preview | null>(null);
  const getLayersRef = useRef(getLayers);
  const foldedRef = useRef(true);
  const [folded, setFolded] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    getLayersRef.current = getLayers;
  }, [getLayers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    createCubePreview(canvas, {
      folded: foldedRef.current,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      isCancelled: () => cancelled,
    })
      .then((preview) => {
        previewRef.current = preview;
        setReady(true);
      })
      .catch(() => {
        // No WebGL: painting and printing still work without the preview.
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      previewRef.current?.destroy();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const layers = getLayersRef.current();
    if (layers) previewRef.current?.update(layers.paint, layers.lines);
  }, [ready, version]);

  useEffect(() => {
    foldedRef.current = folded;
    previewRef.current?.setFolded(folded);
  }, [folded]);

  if (failed) return null;

  return (
    <div className={`cube-preview ${minimized ? "minimized" : ""}`}>
      <button
        type="button"
        className="cube-preview-toggle"
        onClick={() => setMinimized((m) => !m)}
        aria-expanded={!minimized}
        title={minimized ? "Show my cube" : "Hide my cube"}
      >
        🧊 {minimized ? "My cube" : "Hide"}
      </button>
      {/* Kept mounted while minimized so the 3D scene isn't rebuilt. */}
      <div className="cube-preview-body" hidden={minimized}>
        <canvas
          ref={canvasRef}
          className="cube-preview-canvas"
          aria-label="3D preview of your paper cube"
        />
        <button
          type="button"
          className="cube-fold-btn"
          onClick={() => setFolded((f) => !f)}
          disabled={!ready}
        >
          {!ready ? "Loading…" : folded ? "Unfold" : "Fold it up!"}
        </button>
      </div>
    </div>
  );
}
