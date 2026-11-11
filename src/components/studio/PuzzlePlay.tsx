"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CANVAS_SIZE } from "@/lib/constants";
import { startPuzzleGame, type PuzzleGame } from "@/lib/puzzleGame";
import { buildPuzzle } from "@/lib/puzzleShapes";
import type { Difficulty, Orientation, PieceShape } from "@/types/studio";

interface PuzzlePlayProps {
  /** The finished picture without cut lines (see composeExportCanvas). */
  image: HTMLCanvasElement;
  shape: PieceShape;
  difficulty: Difficulty;
  orientation: Orientation;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Full-screen game: solve your own painting as a puzzle. */
export function PuzzlePlay({
  image,
  shape,
  difficulty,
  orientation,
  onClose,
}: PuzzlePlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PuzzleGame | null>(null);
  const hintRef = useRef(true);
  const [round, setRound] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [solved, setSolved] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [hint, setHint] = useState(true);

  const geometry = useMemo(() => {
    const { width, height } = CANVAS_SIZE[orientation];
    return buildPuzzle(shape, difficulty, width, height);
  }, [shape, difficulty, orientation]);
  const total = geometry.pieces.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = startPuzzleGame({
      canvas,
      image,
      geometry,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      getHint: () => hintRef.current,
      onFirstMove: () => setStartedAt(Date.now()),
      onProgress: setPlaced,
      onSolved: () => setSolved(true),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [image, geometry, round]);

  useEffect(() => {
    hintRef.current = hint;
    gameRef.current?.redraw();
  }, [hint]);

  useEffect(() => {
    if (startedAt === null || solved) return;
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - startedAt) / 1000)),
      500,
    );
    return () => clearInterval(timer);
  }, [startedAt, solved]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const playAgain = () => {
    setPlaced(0);
    setSolved(false);
    setStartedAt(null);
    setSeconds(0);
    setRound((r) => r + 1);
  };

  return (
    <div className="puzzle-play" role="dialog" aria-label="Solve your puzzle">
      <header className="puzzle-play-bar">
        <h2>🧩 Solve it!</h2>
        <p className="puzzle-play-status" aria-live="polite">
          <strong>
            {placed} / {total}
          </strong>{" "}
          pieces · {formatTime(seconds)}
        </p>
        <div className="puzzle-play-actions">
          <button
            type="button"
            className={`play-chip ${hint ? "on" : ""}`}
            onClick={() => setHint((h) => !h)}
            aria-pressed={hint}
            title="Show a faint picture on the board"
          >
            👀 Hint
          </button>
          <button type="button" className="play-chip" onClick={playAgain}>
            🔀 Mix up
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Back to painting"
            title="Back to painting"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="puzzle-play-table">
        <canvas ref={canvasRef} className="puzzle-play-canvas" />
        {solved && (
          <div className="puzzle-play-win">
            <h3>You did it! 🎉</h3>
            <p>
              {total} pieces in {formatTime(seconds)}
            </p>
            <div className="modal-actions wrap">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Back to painting
              </button>
              <button type="button" className="btn-primary" onClick={playAgain}>
                Play again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
