/**
 * Robust local match save (device cache only).
 * Dual-write: localStorage + sessionStorage fallback for WebView edge cases.
 */

import type { GameState } from "./types";

const SAVE_KEY = "bl-match-save-v2";
const SAVE_KEY_BAK = "bl-match-save-v2-bak";
const ARCHIVE_KEY = "bl-match-archive-v1";
const SAVE_VERSION = 2;
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
  state: GameState;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function storageGet(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const a = localStorage.getItem(key);
    if (a) return a;
  } catch {
    /* ignore */
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem(key);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function storageSet(key: string, value: string): boolean {
  let ok = false;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
      ok = true;
    }
  } catch {
    /* quota / private mode */
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, value);
      ok = true;
    }
  } catch {
    /* ignore */
  }
  return ok;
}

function storageRemove(key: string): void {
  try {
    localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
}

function isPlayablePhase(phase: unknown): boolean {
  return phase === "mulligan" || phase === "player_turn" || phase === "enemy_turn";
}

function parseSave(raw: string | null): MatchSavePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return null;
    if (parsed.version !== SAVE_VERSION && parsed.version !== 1) return null;
    if (!isObject(parsed.state)) return null;
    const phase = (parsed.state as { phase?: string }).phase;
    if (!isPlayablePhase(phase)) return null;
    // basic structure checks
    const st = parsed.state as Record<string, unknown>;
    if (!isObject(st.player) || !isObject(st.enemy)) return null;
    return {
      version: SAVE_VERSION,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
      state: parsed.state as unknown as GameState,
    };
  } catch {
    return null;
  }
}

export function hasMatchSave(): boolean {
  return !!readMatchSave();
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
  storageRemove(SAVE_KEY);
  storageRemove(SAVE_KEY_BAK);
  // legacy key
  storageRemove("bl-match-save-v1");
}

export function clearMatchArchive(): void {
  storageRemove(ARCHIVE_KEY);
}

export function readMatchSave(): MatchSavePayload | null {
  const primary = parseSave(storageGet(SAVE_KEY));
  if (primary) return primary;
  const bak = parseSave(storageGet(SAVE_KEY_BAK));
  if (bak) return bak;
  // migrate legacy
  return parseSave(storageGet("bl-match-save-v1"));
}

export function readMatchArchive(): MatchArchivePayload | null {
  try {
    const raw = storageGet(ARCHIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed) || parsed.version !== ARCHIVE_VERSION) return null;
    if (parsed.result !== "victory" && parsed.result !== "defeat") return null;
    return parsed as unknown as MatchArchivePayload;
  } catch {
    return null;
  }
}

function cleanState(state: GameState): GameState {
  return {
    ...state,
    animating: false,
    selection: { kind: "none" },
    hoverPreview: null,
    message: state.message,
    log: Array.isArray(state.log) ? state.log.slice(-80) : [],
  };
}

/** Mid-match continue save. */
export function writeMatchSave(
  state: GameState,
): { ok: true; savedAt: number } | { ok: false; error: string } {
  if (!isPlayablePhase(state.phase)) {
    return { ok: false, error: "Start or resume a match first, then save." };
  }
  try {
    const payload: MatchSavePayload = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      state: cleanState(state),
    };
    const json = JSON.stringify(payload);
    if (!storageSet(SAVE_KEY, json)) {
      return { ok: false, error: "Device storage blocked — allow local storage." };
    }
    storageSet(SAVE_KEY_BAK, json);
    return { ok: true, savedAt: payload.savedAt };
  } catch {
    return { ok: false, error: "Could not write local save." };
  }
}

/** Post-match archive. */
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
      state: cleanState(state),
    };
    if (!storageSet(ARCHIVE_KEY, JSON.stringify(payload))) {
      return { ok: false, error: "Could not write match archive." };
    }
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
