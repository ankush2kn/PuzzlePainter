import type { StudioPersistedState } from "@/types/studio";
import { STORAGE_KEY } from "@/lib/constants";

export function loadStudioState(): StudioPersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      (parsed as { version: unknown }).version === 1
    ) {
      return parsed as StudioPersistedState;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStudioState(state: StudioPersistedState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota or private mode — ignore
  }
}

export function clearStudioState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
