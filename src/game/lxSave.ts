/**
 * LX_SAVE_GAME device folder bridge.
 * Native APK: Capacitor plugin LxSave → Android/data/.../files/LX_SAVE_GAME
 * Web/preview: localStorage / sessionStorage mirror under bl-lx-* keys.
 */

import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "@/lib/platform";

const WEB_PREFIX = "bl-lx-file:";

export type LxSavePlugin = {
  ensureFolder(): Promise<{ ok: boolean; path?: string }>;
  writeText(opts: {
    name: string;
    data: string;
  }): Promise<{ ok: boolean; bytes?: number; path?: string }>;
  readText(opts: {
    name: string;
  }): Promise<{ ok: boolean; exists: boolean; data: string; path?: string }>;
  exists(opts: { name: string }): Promise<{ exists: boolean }>;
  deleteFile(opts: { name: string }): Promise<{ ok: boolean }>;
  getPath(): Promise<{ path: string }>;
};

const LxSave = registerPlugin<LxSavePlugin>("LxSave");

export const MATCH_FILE = "match_save.json";
export const PIN_FILE = "pin_vault.json";
export const META_FILE = "meta_snapshot.json";

function webWrite(name: string, data: string): boolean {
  try {
    localStorage.setItem(WEB_PREFIX + name, data);
    try {
      sessionStorage.setItem(WEB_PREFIX + name, data);
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

function webRead(name: string): string | null {
  try {
    return (
      localStorage.getItem(WEB_PREFIX + name) ||
      sessionStorage.getItem(WEB_PREFIX + name)
    );
  } catch {
    return null;
  }
}

function webDelete(name: string): void {
  try {
    localStorage.removeItem(WEB_PREFIX + name);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(WEB_PREFIX + name);
  } catch {
    /* ignore */
  }
}

export async function ensureSaveFolder(): Promise<string | null> {
  if (!isNativeApp()) {
    webWrite(".installed", `web=${Date.now()}`);
    return "web:LX_SAVE_GAME";
  }
  try {
    const r = await LxSave.ensureFolder();
    return r.path ?? null;
  } catch (e) {
    console.warn("[lxSave] ensureFolder", e);
    return null;
  }
}

export async function lxWrite(name: string, data: string): Promise<boolean> {
  if (!isNativeApp()) return webWrite(name, data);
  try {
    await LxSave.ensureFolder();
    const r = await LxSave.writeText({ name, data });
    // mirror to localStorage for fast sync reads
    webWrite(name, data);
    return !!r.ok;
  } catch (e) {
    console.warn("[lxSave] write", name, e);
    return webWrite(name, data);
  }
}

export async function lxRead(name: string): Promise<string | null> {
  if (!isNativeApp()) return webRead(name);
  try {
    const r = await LxSave.readText({ name });
    if (r.exists && r.data) {
      webWrite(name, r.data);
      return r.data;
    }
  } catch (e) {
    console.warn("[lxSave] read", name, e);
  }
  return webRead(name);
}

export async function lxExists(name: string): Promise<boolean> {
  if (!isNativeApp()) return webRead(name) != null;
  try {
    const r = await LxSave.exists({ name });
    return !!r.exists;
  } catch {
    return webRead(name) != null;
  }
}

export async function lxDelete(name: string): Promise<void> {
  webDelete(name);
  if (!isNativeApp()) return;
  try {
    await LxSave.deleteFile({ name });
  } catch {
    /* ignore */
  }
}

export async function lxGetPath(): Promise<string | null> {
  if (!isNativeApp()) return "web:LX_SAVE_GAME";
  try {
    const r = await LxSave.getPath();
    return r.path ?? null;
  } catch {
    return null;
  }
}
