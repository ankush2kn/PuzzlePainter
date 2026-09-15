# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000) — plain Next.js
npm run build    # production build — plain Next.js
npm run start    # serve production build — plain Next.js
npm run lint     # eslint
```

No test suite exists in this repo.

This repo has two parallel build pipelines: plain Next.js (above, via `next dev`/`next build`) and a Cloudflare Workers pipeline via vinext (below), which is what actually runs in production. Both read the same `src/`; `npm run dev` is still the fastest inner loop for UI work, but changes that touch the API route or env/secrets handling should also be checked against the vinext pipeline before considering them done.

```bash
npm run dev:vinext     # dev server on the Workers-shaped runtime (port 3001)
npm run build:vinext   # build to dist/client + dist/server
npm run start:vinext   # wrangler dev against the built output — closest thing to a local prod preview
npm run deploy:vinext  # build + deploy to Cloudflare Workers (puzzle-painter.arshanti.workers.dev)
```

If a `start:vinext`/`wrangler dev` process is left running, a re-build can fail with an `EPERM`/permission error on `dist/server/.wrangler` — the `workerd` child process it spawns holds file locks that surviving the parent process's exit. Kill the `workerd.exe` / `wrangler ... dev` processes (not just the `npm run` wrapper) before rebuilding.

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

## Deployment

Production runs as a single Cloudflare Worker at **puzzlepainter.fultu.com** (custom domain attached to the `puzzle-painter` Worker in the Cloudflare dashboard), built via **vinext** (`vinext`/`@vinext/cloudflare`, a Vite plugin that reimplements the Next.js API surface to target Workers) — not the older `@opennextjs/cloudflare` adapter. Config lives in `vite.config.ts` (vinext + `@cloudflare/vite-plugin` plugins, `cdnAdapter()` cache) and `wrangler.jsonc` (`nodejs_compat` flag, `assets` binding to `dist/client`, `account_id`). See `DEPLOYMENT.md` for the full rationale and step-by-step (including a fallback plan if vinext ever falls behind this repo's Next.js version).

Practical notes for this setup:
- `route.ts`'s `export const runtime = "nodejs"` is inert under vinext ("route config currently ignored" per its docs) — Node API access instead comes from the `nodejs_compat` compatibility flag. Don't rely on `runtime`/`preferredRegion` route config meaning anything in the deployed app.
- Despite that, `process.env.OPENROUTER_API_KEY` **does** work correctly under vinext/Workers — confirmed against both `wrangler dev` and the deployed Worker. Locally, vinext generates `dist/server/.dev.vars` from `.env.local` for this. In production, secrets are set directly against the Worker, not via `wrangler.jsonc` `vars` (which stays empty / non-secret only):
  ```bash
  npx wrangler secret put OPENROUTER_API_KEY --name puzzle-painter
  npx wrangler secret put OPENROUTER_SITE_URL --name puzzle-painter   # set to https://puzzlepainter.fultu.com
  ```
- No KV/R2/D1 is used or needed — this app has no ISR, no `use cache`, and all persistence is client-side `localStorage` (see Persistence above).
- The public `/api/generate-page` route spends real OpenRouter credits per call with no auth in front of it — if traffic/abuse ever becomes a concern, see `DEPLOYMENT.md`'s mitigation options (rate limiting rule, Turnstile, a `:free` model, or an OpenRouter spend cap) before it becomes a cost surprise.

## Conventions

- Path alias `@/*` → `src/*`.
- All interactive components are Client Components (`"use client"`); the API route is the only server-side code.
- Studio sub-components live under `src/components/studio/` and are wired together exclusively through `Studio.tsx` — they don't talk to each other directly.
