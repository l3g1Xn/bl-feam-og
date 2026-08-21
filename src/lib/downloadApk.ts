/**
 * Client-side APK download.
 * Order: /pkg parts (only if manifest appVersion matches ship) → local binary → GitHub release asset.
 * GitHub URL matches bl-feam-og release apk-release-1.0.7.
 */

import {
  APK_DOWNLOAD_NAME,
  APK_DOWNLOAD_PATH,
  APK_VERSION,
  GITHUB_APK_URL,
} from "@/game/brand";

export type DownloadProgress = {
  phase: "manifest" | "parts" | "assemble" | "save";
  done: number;
  total: number;
  label: string;
};

export type DownloadResult =
  | { ok: true; method: string; bytes: number }
  | { ok: false; error: string };

const APK_MIME = "application/vnd.android.package-archive";
const FILENAME = APK_DOWNLOAD_NAME;
const PKG_BASES = ["/pkg/"];

/** Public direct path — available in local preview; may 404 on slim deploys. */
export const DIRECT_APK_PATH = APK_DOWNLOAD_PATH;

type Manifest = {
  version?: number;
  filename: string;
  size: number;
  parts: string[];
  encoding?: string;
  sha256?: string;
  appVersion?: string;
  buildId?: string;
};

function isPkZip(bytes: Uint8Array): boolean {
  return bytes.length > 100_000 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function looksLikeHtml(text: string): boolean {
  const h = text.replace(/^\uFEFF/, "").trimStart().slice(0, 64).toLowerCase();
  return (
    h.startsWith("<!doctype") ||
    h.startsWith("<html") ||
    h.startsWith("<head") ||
    h.startsWith("<script")
  );
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function resolveUrl(path: string): string {
  const base =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
    "/";
  if (path.startsWith("http")) return path;
  if (base === "/" || base === "") return path;
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${b}${path.startsWith("/") ? path : `/${path}`}`;
}

function manifestMatchesShip(man: Manifest): boolean {
  const v = typeof man.appVersion === "string" ? man.appVersion.trim() : "";
  // Stale chunked package (currently 1.06.666) must not win over GitHub 1.0.7.
  if (v && v !== APK_VERSION) return false;
  return true;
}

async function fetchTextStrict(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "text/plain,application/json,*/*" },
  });
  if (res.status === 404) throw new Error(`404 Not Found: ${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  if (!text || looksLikeHtml(text)) {
    throw new Error(`Got a web page instead of package data`);
  }
  return text;
}

async function loadManifest(): Promise<{ man: Manifest; base: string }> {
  const stamp = Date.now();
  let lastErr: Error | null = null;
  for (const rel of PKG_BASES) {
    const base = resolveUrl(rel);
    try {
      const text = await fetchTextStrict(`${base}manifest.json?v=${stamp}`);
      const man = JSON.parse(text) as Manifest;
      if (!man?.parts?.length || !man.size) throw new Error("Invalid manifest");
      return { man, base: base.endsWith("/") ? base : `${base}/` };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("Could not load /pkg/manifest.json");
}

async function fetchAllParts(
  base: string,
  parts: string[],
  onProgress?: (p: DownloadProgress) => void,
): Promise<Uint8Array[]> {
  const concurrency = 10;
  const out: Uint8Array[] = new Array(parts.length);
  let done = 0;

  for (let i = 0; i < parts.length; i += concurrency) {
    const slice = parts.slice(i, i + concurrency);
    await Promise.all(
      slice.map(async (name, j) => {
        const idx = i + j;
        const url = `${base}${name}?t=${Date.now()}_${idx}`;
        const text = await fetchTextStrict(url);
        out[idx] = base64ToBytes(text);
        done += 1;
        onProgress?.({
          phase: "parts",
          done,
          total: parts.length,
          label: `Downloading package… ${done}/${parts.length}`,
        });
      }),
    );
  }
  return out as Uint8Array[];
}

function assemble(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.byteLength;
  }
  return out;
}

function saveBlob(bytes: Uint8Array, filename: string): void {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: APK_MIME });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".apk") ? filename : `${filename}.apk`;
    a.rel = "noopener";
    a.type = APK_MIME;
    a.setAttribute("download", a.download);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
  }
}

/** Trigger browser download of the direct binary URL (when host serves it cleanly). */
export function triggerDirectApkHref(): void {
  const a = document.createElement("a");
  a.href = `${resolveUrl(DIRECT_APK_PATH)}?v=${Date.now()}`;
  a.download = FILENAME;
  a.rel = "noopener";
  a.type = APK_MIME;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Open the GitHub release asset (same binary as site package). */
export function openGithubApk(): void {
  window.open(GITHUB_APK_URL, "_blank", "noopener,noreferrer");
}

async function tryBinaryUrls(
  urls: string[],
  onProgress?: (p: DownloadProgress) => void,
  label = "Fetching Android package…",
): Promise<Uint8Array | null> {
  for (const url of urls) {
    try {
      onProgress?.({
        phase: "parts",
        done: 0,
        total: 1,
        label,
      });
      const res = await fetch(url, {
        cache: "no-store",
        credentials: url.includes("github.com") ? "omit" : "same-origin",
        headers: { Accept: "application/vnd.android.package-archive,*/*" },
        mode: url.includes("github.com") ? "cors" : "same-origin",
      });
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      const head = new TextDecoder().decode(buf.slice(0, 32)).toLowerCase();
      if (head.includes("<!doctype") || head.includes("<html")) continue;
      if (isPkZip(buf)) return buf;
    } catch {
      /* next */
    }
  }
  return null;
}

async function trySingleBinary(
  onProgress?: (p: DownloadProgress) => void,
): Promise<Uint8Array | null> {
  const stamp = Date.now();
  return tryBinaryUrls(
    [
      resolveUrl(`${DIRECT_APK_PATH}?v=${stamp}`),
      resolveUrl(`/downloads/BattleLegions.bin?v=${stamp}`),
    ],
    onProgress,
    "Fetching Android package…",
  );
}

async function tryGithubBinary(
  onProgress?: (p: DownloadProgress) => void,
): Promise<Uint8Array | null> {
  return tryBinaryUrls(
    [`${GITHUB_APK_URL}?v=${Date.now()}`],
    onProgress,
    `Fetching release ${APK_VERSION} from GitHub…`,
  );
}

export async function downloadApk(
  onProgress?: (p: DownloadProgress) => void,
): Promise<DownloadResult> {
  try {
    onProgress?.({
      phase: "manifest",
      done: 0,
      total: 1,
      label: `Locating package v${APK_VERSION}…`,
    });

    // 1) Chunked /pkg — only when the assembled binary is the current 1.0.7 ship.
    try {
      const { man, base } = await loadManifest();
      if (!manifestMatchesShip(man)) {
        throw new Error(
          `Stale /pkg package ${man.appVersion ?? "unknown"} (need ${APK_VERSION})`,
        );
      }
      onProgress?.({
        phase: "parts",
        done: 0,
        total: man.parts.length,
        label: `Downloading package… 0/${man.parts.length}`,
      });
      const chunks = await fetchAllParts(base, man.parts, onProgress);
      onProgress?.({
        phase: "assemble",
        done: 1,
        total: 1,
        label: "Assembling APK…",
      });
      const bytes = assemble(chunks);
      if (!isPkZip(bytes)) {
        throw new Error("Assembled file is not a valid Android package");
      }
      if (man.size && Math.abs(bytes.byteLength - man.size) > 64) {
        console.warn("[apk] size mismatch", bytes.byteLength, man.size);
      }
      onProgress?.({
        phase: "save",
        done: 1,
        total: 1,
        label: `Saving ${FILENAME}…`,
      });
      saveBlob(bytes, man.filename || FILENAME);
      return { ok: true, method: "pkg-parts", bytes: bytes.byteLength };
    } catch (partErr) {
      console.warn("[apk] /pkg/ path failed", partErr);
    }

    // 2) Direct binary (local preview / hosts that allow large files)
    const single = await trySingleBinary(onProgress);
    if (single) {
      onProgress?.({
        phase: "save",
        done: 1,
        total: 1,
        label: `Saving ${FILENAME}…`,
      });
      saveBlob(single, FILENAME);
      return { ok: true, method: "direct-apk", bytes: single.byteLength };
    }

    // 3) GitHub release apk-release-1.0.7 — same package
    const fromGh = await tryGithubBinary(onProgress);
    if (fromGh) {
      onProgress?.({
        phase: "save",
        done: 1,
        total: 1,
        label: `Saving ${FILENAME}…`,
      });
      saveBlob(fromGh, FILENAME);
      return { ok: true, method: "github-release", bytes: fromGh.byteLength };
    }

    return {
      ok: false,
      error:
        "Package not found. Hard-refresh and try again, open the Install page, or use the GitHub release link.",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Download failed.",
    };
  }
}
