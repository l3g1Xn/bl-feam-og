/**
 * Local mid-match save + post-match archive (device cache only — no cloud).
 */

import type { GameState } from "./types";

const SAVE_KEY = "bl-match-save-v1";
const ARCHIVE_KEY = "bl-match-archive-v1";
const SAVE_VERSION = 1;
const ARCHIVE_VERSION = 1;

export type MatchSavePayload = {
  version: number;
  savedAt: number;
  state: GameState;
};

export type MatchArchivePayload = {
  version: number;
  savedAt: number;
  result: "victory" | "defeat";
  enemyName: string;
  turn: number;
  difficulty: "normal" | "hard";
  playerHp: number;
  enemyHp: number;
  playerBoardAttack: number;
  enemyBoardAttack: number;
  logSnippet: string[];
  /** Full state snapshot for local cache / review */
  state: GameState;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

export function hasMatchSave(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function hasMatchArchive(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return !!localStorage.getItem(ARCHIVE_KEY);
  } catch {
    return false;
  }
}

export function clearMatchSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function clearMatchArchive(): void {
  try {
    localStorage.removeItem(ARCHIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function readMatchSave(): MatchSavePayload | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed) || parsed.version !== SAVE_VERSION) return null;
    if (!isObject(parsed.state)) return null;
    const phase = (parsed.state as { phase?: string }).phase;
    if (
      phase !== "mulligan" &&
      phase !== "player_turn" &&
      phase !== "enemy_turn"
    ) {
      return null;
    }
    return {
      version: SAVE_VERSION,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
      state: parsed.state as unknown as GameState,
    };
  } catch {
    return null;
  }
}

export function readMatchArchive(): MatchArchivePayload | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed) || parsed.version !== ARCHIVE_VERSION) return null;
    if (parsed.result !== "victory" && parsed.result !== "defeat") return null;
    return parsed as unknown as MatchArchivePayload;
  } catch {
    return null;
  }
}

/** Mid-match continue save. */
export function writeMatchSave(
  state: GameState,
): { ok: true } | { ok: false; error: string } {
  if (
    state.phase === "menu" ||
    state.phase === "victory" ||
    state.phase === "defeat"
  ) {
    return { ok: false, error: "Nothing to save in this phase." };
  }
  try {
    const clean: GameState = {
      ...state,
      animating: false,
      selection: { kind: "none" },
      hoverPreview: null,
      message: state.message,
    };
    const payload: MatchSavePayload = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      state: clean,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not write local save." };
  }
}

/** Post-match archive to local player cache (after victory/defeat). */
export function writeMatchArchive(
  state: GameState,
  math?: { playerBoardAttack: number; enemyBoardAttack: number },
): { ok: true } | { ok: false; error: string } {
  if (state.phase !== "victory" && state.phase !== "defeat") {
    return { ok: false, error: "Archive only after a finished match." };
  }
  try {
    const payload: MatchArchivePayload = {
      version: ARCHIVE_VERSION,
      savedAt: Date.now(),
      result: state.phase,
      enemyName: state.enemyName,
      turn: state.turn,
      difficulty: state.difficulty,
      playerHp: state.player.heroHp,
      enemyHp: state.enemy.heroHp,
      playerBoardAttack: math?.playerBoardAttack ?? 0,
      enemyBoardAttack: math?.enemyBoardAttack ?? 0,
      logSnippet: state.log.slice(-12).map((l) => l.text),
      state: {
        ...state,
        animating: false,
        selection: { kind: "none" },
        hoverPreview: null,
      },
    };
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not write match archive." };
  }
}

export function formatSaveAge(savedAt: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
