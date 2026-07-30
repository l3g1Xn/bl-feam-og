/**
 * LX_SAVE_GAME device folder bridge.
 * Priority: window.LxSaveNative (JavascriptInterface) → Capacitor LxSave → web mirror.
 */

import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "@/lib/platform";

const WEB_PREFIX = "bl-lx-file:";

export type LxSavePluginApi = {
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

const LxSaveCap = registerPlugin<LxSavePluginApi>("LxSave");

export const MATCH_FILE = "match_save.json";
export const PIN_FILE = "pin_vault.json";
export const META_FILE = "meta_snapshot.json";

type NativeBridge = {
  ensureFolder: () => string;
  getPath: () => string;
  writeText: (name: string, data: string) => boolean;
  readText: (name: string) => string;
  exists: (name: string) => boolean;
  deleteFile: (name: string) => boolean;
};

function nativeBridge(): NativeBridge | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { LxSaveNative?: NativeBridge };
  const b = w.LxSaveNative;
  if (!b || typeof b.ensureFolder !== "function") return null;
  return b;
}

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
  const nb = nativeBridge();
  if (nb) {
    try {
      const path = nb.ensureFolder();
      if (path) {
        (window as Window & { __BL_SAVE_PATH?: string }).__BL_SAVE_PATH = path;
        return path;
      }
    } catch (e) {
      console.warn("[lxSave] native ensure", e);
    }
  }
  if (isNativeApp()) {
    try {
      const r = await LxSaveCap.ensureFolder();
      if (r.path) {
        (window as Window & { __BL_SAVE_PATH?: string }).__BL_SAVE_PATH = r.path;
        return r.path;
      }
    } catch (e) {
      console.warn("[lxSave] cap ensure", e);
    }
  }
  webWrite(".installed", `web=${Date.now()}`);
  return "web:LX_SAVE_GAME";
}

export async function lxWrite(name: string, data: string): Promise<boolean> {
  const nb = nativeBridge();
  if (nb) {
    try {
      const ok = !!nb.writeText(name, data);
      if (ok) {
        webWrite(name, data);
        return true;
      }
    } catch (e) {
      console.warn("[lxSave] native write", name, e);
    }
  }
  if (isNativeApp()) {
    try {
      await LxSaveCap.ensureFolder();
      const r = await LxSaveCap.writeText({ name, data });
      webWrite(name, data);
      return !!r.ok;
    } catch (e) {
      console.warn("[lxSave] cap write", name, e);
    }
  }
  return webWrite(name, data);
}

export async function lxRead(name: string): Promise<string | null> {
  const nb = nativeBridge();
  if (nb) {
    try {
      const data = nb.readText(name);
      if (data) {
        webWrite(name, data);
        return data;
      }
    } catch (e) {
      console.warn("[lxSave] native read", name, e);
    }
  }
  if (isNativeApp()) {
    try {
      const r = await LxSaveCap.readText({ name });
      if (r.exists && r.data) {
        webWrite(name, r.data);
        return r.data;
      }
    } catch (e) {
      console.warn("[lxSave] cap read", name, e);
    }
  }
  return webRead(name);
}

export async function lxExists(name: string): Promise<boolean> {
  const nb = nativeBridge();
  if (nb) {
    try {
      if (nb.exists(name)) return true;
    } catch {
      /* ignore */
    }
  }
  if (isNativeApp()) {
    try {
      const r = await LxSaveCap.exists({ name });
      if (r.exists) return true;
    } catch {
      /* ignore */
    }
  }
  return webRead(name) != null;
}

export async function lxDelete(name: string): Promise<void> {
  webDelete(name);
  const nb = nativeBridge();
  if (nb) {
    try {
      nb.deleteFile(name);
    } catch {
      /* ignore */
    }
  }
  if (isNativeApp()) {
    try {
      await LxSaveCap.deleteFile({ name });
    } catch {
      /* ignore */
    }
  }
}

export async function lxGetPath(): Promise<string | null> {
  const nb = nativeBridge();
  if (nb) {
    try {
      const p = nb.getPath() || nb.ensureFolder();
      if (p) return p;
    } catch {
      /* ignore */
    }
  }
  if (isNativeApp()) {
    try {
      const r = await LxSaveCap.getPath();
      return r.path ?? null;
    } catch {
      /* ignore */
    }
  }
  return "web:LX_SAVE_GAME";
}
