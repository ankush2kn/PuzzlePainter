# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

No test suite exists in this repo.

## What this app is

Puzzle Painter: a browser-based coloring/painting studio for kids. Users paint over a coloring-page outline, overlay puzzle cut lines, then export the result as a printable PNG/PDF (US Letter). Everything is client-side except one API route that generates a custom coloring-page outline via an LLM.

## Architecture

**Layered canvas model** (`PaintingCanvas.tsx`): every page is three canvases composited together on each change:
- `paintRef` — the user's brush/fill/stamp/text strokes (what gets saved/exported as art)
- `linesRef` — the coloring-page outline, rendered once from a template's SVG string via `renderSvgToCanvas` (`lib/templates.ts`)
- `displayRef` — the visible `<canvas>`, redrawn by `composite()` as paint + lines (+ live cut-line overlay when `showCutLines` is on)

Undo/redo is a manual stack of `ImageData` snapshots of the paint layer only (`history.current`, capped at `MAX_HISTORY = 30`) — the lines layer is never undone, only reloaded via `loadTemplateSvg`. All canvas mutation methods are exposed to the parent via `useImperativeHandle` (`PaintingCanvasHandle`), not props, because `Studio.tsx` needs imperative access (undo, export, "has the user painted anything yet") that doesn't fit a declarative render cycle.

**State ownership**: `Studio.tsx` owns all UI state (tool, color, puzzle settings, which template/stage is active) and drives `PaintingCanvas` via props; the canvas reports back through the `onHistoryChange`/`onPainted` callbacks. Fixed canvas dimensions live in `lib/constants.ts` (`CANVAS_WIDTH`/`CANVAS_HEIGHT` = 816×1056, i.e. US Letter at 96dpi) and are used consistently across drawing, export, and template rendering — don't hardcode canvas sizes elsewhere.

**Persistence** (`lib/storage.ts`): the entire studio state (including the paint layer as a base64 PNG data URL) is debounced (400ms, see `scheduleSave` in `Studio.tsx`) into a single `localStorage` key (`STORAGE_KEY`). `StudioPersistedState.version` gates the shape — bump it and handle migration if the schema changes.

**Templates vs. custom SVG**: built-in coloring pages live in `lib/templates.ts` as literal SVG path strings (`TEMPLATES`). User-generated pages come from `POST /api/generate-page` (OpenRouter LLM call, requires `OPENROUTER_API_KEY`), whose raw output is passed through `sanitizeSvg()` before ever touching the DOM — it strips `<script>`, event-handler attributes, and `javascript:` URLs, and rejects anything not shaped like a bare `<svg>` root. Never bypass `sanitizeSvg` for LLM- or user-supplied SVG.

**Cut lines** (`lib/puzzleShapes.ts`): `drawCutLines()` draws dashed grid lines (rectangle/triangle/jigsaw variants) directly onto a canvas context, driven by `DIFFICULTY_META` piece counts (`lib/constants.ts`). It's called both for the live on-canvas overlay and again at 2x scale (`PRINT_SCALE`) during export (`lib/export.ts`) — keep these two call sites in sync if you change how lines are computed.

**Export** (`lib/export.ts`): `composeExportCanvas()` flattens paint + lines + cut lines onto one offscreen canvas at print resolution, then `downloadPng`/`downloadPdf` (via `jspdf`) serialize it. PDF export always targets 8.5×11in letter format.

## Conventions

- Path alias `@/*` → `src/*`.
- All interactive components are Client Components (`"use client"`); the API route is the only server-side code.
- Studio sub-components live under `src/components/studio/` and are wired together exclusively through `Studio.tsx` — they don't talk to each other directly.
