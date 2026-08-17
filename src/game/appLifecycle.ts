/**
 * APK lifecycle: save match + PIN vault on close/pause; lock PIN session.
 */

import { ensureSaveFolder, lxWrite, META_FILE } from "./lxSave";
import { writeMatchSave } from "./matchSave";
import {
  lockSession,
  loadRegistry,
  persistPinVaultToDevice,
} from "./deviceVault";
import { useGameStore } from "./store";
import { useMetaStore } from "./meta";

let installed = false;
let pausing = false;

function snapshotGameForSave() {
  const s = useGameStore.getState();
  if (
    s.phase === "mulligan" ||
    s.phase === "player_turn" ||
    s.phase === "enemy_turn"
  ) {
    return writeMatchSave({
      phase: s.phase,
      turn: s.turn,
      player: s.player,
      enemy: s.enemy,
      enemyName: s.enemyName,
      matchId: s.matchId,
      selection: { kind: "none" },
      log: s.log,
      logSeq: s.logSeq,
      lastPreview: s.lastPreview,
      hoverPreview: null,
      animating: false,
      message: s.message,
      difficulty: s.difficulty,
    });
  }
  return null;
}

/** Called from native onPause/onStop and web pagehide/visibility. */
export async function onAppPauseOrClose(): Promise<void> {
  if (pausing) return;
  pausing = true;
  try {
    await ensureSaveFolder();
    snapshotGameForSave();
    await persistPinVaultToDevice(loadRegistry());
    try {
      const meta = useMetaStore.getState().getSnapshot();
      await lxWrite(META_FILE, JSON.stringify({ savedAt: Date.now(), meta }));
    } catch {
      /* ignore */
    }
    // Require PIN when the APK is reopened
    lockSession();
  } catch (e) {
    console.warn("[lifecycle] pause save", e);
  } finally {
    pausing = false;
  }
}

export function installAppLifecycleHooks(): () => void {
  if (installed || typeof window === "undefined") return () => {};
  installed = true;

  const w = window as Window & {
    __BL_ON_APP_PAUSE?: () => void;
    __BL_ON_APP_RESUME?: () => void;
  };

  w.__BL_ON_APP_PAUSE = () => {
    void onAppPauseOrClose();
  };

  w.__BL_ON_APP_RESUME = () => {
    // PIN gate re-evaluates via session lock + needsUnlock
  };

  const onVis = () => {
    if (document.visibilityState === "hidden") {
      void onAppPauseOrClose();
    }
  };
  const onPageHide = () => {
    void onAppPauseOrClose();
  };

  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("pagehide", onPageHide);

  return () => {
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", onPageHide);
    delete w.__BL_ON_APP_PAUSE;
    delete w.__BL_ON_APP_RESUME;
    installed = false;
  };
}
