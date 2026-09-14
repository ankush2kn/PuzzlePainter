import type { BrushSize, Difficulty, PieceShape, StampItem } from "@/types/studio";

/** US Letter at 96dpi — good screen size; export scales up for print. */
export const CANVAS_WIDTH = 816;
export const CANVAS_HEIGHT = 1056;
export const PRINT_SCALE = 2;

export const STORAGE_KEY = "puzzle-painter-v1";

export const CANDY_COLORS = [
  "#FF4D8D",
  "#FF6B4A",
  "#FF9F1C",
  "#FFE566",
  "#7CFF6B",
  "#5EEBC1",
  "#5BBEFF",
  "#4D7CFF",
  "#B57BFF",
  "#FF6BCB",
  "#FF8FAB",
  "#FFD6A5",
  "#FDFFB6",
  "#CAFFBF",
  "#9BF6FF",
  "#A0C4FF",
  "#BDB2FF",
  "#FFC6FF",
  "#FFFFFF",
  "#F2F2F2",
  "#C4C4C4",
  "#7A7A7A",
  "#3D3D3D",
  "#1A1A1A",
  "#8B4513",
  "#D2691E",
  "#20B2AA",
  "#FF1493",
] as const;

export const BRUSH_SIZE_PX: Record<BrushSize, number> = {
  sm: 4,
  md: 12,
  lg: 28,
};

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; ages: string; cols: number; rows: number }
> = {
  easy: { label: "Easy", ages: "Ages 4+", cols: 2, rows: 3 },
  medium: { label: "Medium", ages: "Ages 6+", cols: 3, rows: 4 },
  hard: { label: "Hard", ages: "Ages 8+", cols: 4, rows: 5 },
};

export const SHAPE_LABELS: Record<PieceShape, string> = {
  rectangle: "Squares",
  triangle: "Triangles",
  jigsaw: "Jigsaw",
};

export const STAMPS: StampItem[] = [
  { id: "star", label: "Star", emoji: "⭐" },
  { id: "heart", label: "Heart", emoji: "❤️" },
  { id: "rainbow", label: "Rainbow", emoji: "🌈" },
  { id: "butterfly", label: "Butterfly", emoji: "🦋" },
  { id: "flower", label: "Flower", emoji: "🌸" },
  { id: "balloon", label: "Balloon", emoji: "🎈" },
  { id: "sun", label: "Sun", emoji: "☀️" },
  { id: "bee", label: "Bee", emoji: "🐝" },
  { id: "lollipop", label: "Lollipop", emoji: "🍭" },
  { id: "cupcake", label: "Cupcake", emoji: "🧁" },
  { id: "sparkles", label: "Sparkles", emoji: "✨" },
  { id: "unicorn", label: "Unicorn", emoji: "🦄" },
];

export const DEFAULT_COLOR = "#FF4D8D";
export const DEFAULT_SECONDARY = "#5BBEFF";
