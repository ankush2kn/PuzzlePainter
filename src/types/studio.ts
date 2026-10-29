export type ToolId =
  | "brush"
  | "pencil"
  | "marker"
  | "fill"
  | "eraser"
  | "text"
  | "stamp";

export type BrushSize = "sm" | "md" | "lg";

export type PieceShape = "rectangle" | "triangle" | "jigsaw";

export type Difficulty = "easy" | "medium" | "hard";

export type Stage = "create" | "cut" | "print";

export type Orientation = "portrait" | "landscape";

export interface StampItem {
  id: string;
  label: string;
  emoji: string;
}

export interface TemplateItem {
  id: string;
  name: string;
  theme: "animals" | "nature" | "food" | "space" | "balls" | "vehicles" | "blank";
  /** URL of a transparent portrait line-art PNG sized to the canvas; null for a blank page. */
  image: string | null;
}

export interface PuzzleSettings {
  shape: PieceShape;
  difficulty: Difficulty;
  showCutLines: boolean;
}

export interface StudioPersistedState {
  version: 1;
  paintDataUrl: string | null;
  templateId: string | null;
  customTemplateSvg: string | null;
  tool: ToolId;
  color: string;
  /** 0–1 strength of `color`. Optional: saves from before it existed load as 1. */
  opacity?: number;
  /** Optional: saves from before it existed load as portrait. */
  orientation?: Orientation;
  secondaryColor: string;
  brushSize: BrushSize;
  stampId: string;
  puzzle: PuzzleSettings;
  textValue: string;
}
