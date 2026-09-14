# Puzzle Painter

Paint a picture, turn on cut lines, download, print, and snip your own jigsaw puzzle.

Built for kids ~6–10 (especially girls): bright candy studio, simple tools, letter-size print.

## Quick start

```bash
npm install
cp .env.local.example .env.local
# Add your OpenRouter key to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### OpenRouter (Describe a page)

1. Create a key at [openrouter.ai](https://openrouter.ai/)
2. Put it in `.env.local`:

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemini-2.5-flash
```

Without a key, the rest of the app still works; only **Describe a page** needs it.

## Features

- Tools: brush, pencil, marker, fill, eraser, text, stamps
- Coloring page gallery (animals, food, space, balls, vehicles)
- **Describe a page** via OpenRouter → SVG outline
- Cut shapes: squares, triangles, jigsaw
- Difficulty: easy / medium / hard
- Preview + download **PNG** and **PDF** (US Letter)
- Autosave to `localStorage`

## Scripts

- `npm run dev` — local studio
- `npm run build` — production build
- `npm run start` — serve production build
