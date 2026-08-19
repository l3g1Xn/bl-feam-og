/**
 * Match save — localStorage mirror + LX_SAVE_GAME device folder (APK).
 */

import type { GameState } from "./types";
import {
  lxDelete,
  lxRead,
  lxWrite,
  MATCH_FILE,
  ensureSaveFolder,
} from "./lxSave";

const SAVE_KEY = "bl-match-save-v2";
const SAVE_KEY_BAK = "bl-match-save-v2-bak";
const SAVE_VERSION = 2;

export type MatchSavePayload = {
  version: number;
  savedAt: number;
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
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): boolean {
  let ok = false;
  try {
    localStorage.setItem(key, value);
    ok = true;
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.setItem(key, value);
    ok = true;
  } catch {
    /* ignore */
  }
  return ok;
}

function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(key);
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

export function clearMatchSave(): void {
  storageRemove(SAVE_KEY);
  storageRemove(SAVE_KEY_BAK);
  storageRemove("bl-match-save-v1");
  void lxDelete(MATCH_FILE);
}

export function readMatchSave(): MatchSavePayload | null {
  const primary = parseSave(storageGet(SAVE_KEY));
  if (primary) return primary;
  const bak = parseSave(storageGet(SAVE_KEY_BAK));
  if (bak) return bak;
  return parseSave(storageGet("bl-match-save-v1"));
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

/** Sync write (local) + async device folder LX_SAVE_GAME/match_save.json */
export function writeMatchSave(
  state: GameState,
): { ok: true; savedAt: number } | { ok: false; error: string } {
  // Lethal attack/spell callers write the end-phase state. Do not leave the
  // prior mid-match snapshot sitting in storage — Load game would resume it.
  if (state.phase === "victory" || state.phase === "defeat") {
    clearMatchSave();
    return { ok: false, error: "Match ended — leftover save cleared." };
  }
  if (!isPlayablePhase(state.phase)) {
    return { ok: false, error: "No active match to save." };
  }
  try {
    const payload: MatchSavePayload = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      state: cleanState(state),
    };
    const json = JSON.stringify(payload);
    if (!storageSet(SAVE_KEY, json)) {
      return { ok: false, error: "Device storage blocked." };
    }
    storageSet(SAVE_KEY_BAK, json);
    void ensureSaveFolder().then(() => lxWrite(MATCH_FILE, json));
    return { ok: true, savedAt: payload.savedAt };
  } catch {
    return { ok: false, error: "Could not write local save." };
  }
}

/** Pull match save from LX_SAVE_GAME into localStorage (call on app start). */
export async function hydrateMatchSaveFromDevice(): Promise<boolean> {
  try {
    await ensureSaveFolder();
    const raw = await lxRead(MATCH_FILE);
    const parsed = parseSave(raw);
    if (!parsed) return !!readMatchSave();
    const json = JSON.stringify(parsed);
    storageSet(SAVE_KEY, json);
    storageSet(SAVE_KEY_BAK, json);
    return true;
  } catch {
    return !!readMatchSave();
  }
}

export function formatSaveAge(savedAt: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
