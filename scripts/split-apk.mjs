#!/usr/bin/env node
/**
 * Split BattleLegions.apk into base64 text parts under public/pkg/
 * (NOT under /assets/ — reserved for Vite hashed bundles).
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const apk =
  process.argv[2] || join(root, "public/downloads/BattleLegions.apk");
const outDir = join(root, "public/pkg");
const PART = 256 * 1024;
const APP_VERSION = process.env.APK_VERSION || "1.00";
const BUILD_ID = process.env.BUILD_ID || "2026.07.30-release-1.00";
const GITHUB_APK =
  process.env.GITHUB_APK_URL ||
  "https://github.com/l3g1Xn/bl-feam-og/releases/download/apk-release-1.00/BattleLegions.apk";

if (!existsSync(apk)) {
  console.error("APK not found:", apk);
  process.exit(1);
}

const buf = readFileSync(apk);
const hash = createHash("sha256").update(buf).digest("hex");

for (const d of [
  outDir,
  join(root, "public/apk-parts"),
  join(root, "public/assets/apk"),
]) {
  rmSync(d, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

const parts = [];
for (let i = 0, n = 0; i < buf.length; i += PART, n++) {
  const slice = buf.subarray(i, Math.min(i + PART, buf.length));
  const name = `p${String(n).padStart(3, "0")}.txt`;
  writeFileSync(join(outDir, name), slice.toString("base64"), "utf8");
  parts.push(name);
}

const manifest = {
  version: 4,
  appVersion: APP_VERSION,
  buildId: BUILD_ID,
  filename: "BattleLegions.apk",
  size: buf.length,
  sha256: hash,
  partSize: PART,
  encoding: "base64",
  parts,
  mime: "application/vnd.android.package-archive",
  path: "/pkg/",
  github: GITHUB_APK,
};
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest));

const dlDir = join(root, "public/downloads");
mkdirSync(dlDir, { recursive: true });
writeFileSync(join(dlDir, "BattleLegions.apk"), buf);
writeFileSync(join(dlDir, "BattleLegions.bin"), buf);
try {
  unlinkSync(join(dlDir, "EQUATE-debug.apk"));
} catch {
  /* ok */
}

const installHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>Download BattleLegions.apk v${APP_VERSION}</title>
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { margin: 0; min-height: 100dvh; display: grid; place-items: center; background: #0c0e14; color: #e8eaef; padding: 1.5rem; }
      .card { width: min(440px, 100%); border: 1px solid rgba(255,255,255,.1); border-radius: 1.25rem; background: #141820; padding: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,.45); }
      h1 { font-size: 1.15rem; margin: 0 0 0.5rem; }
      p { margin: 0 0 1rem; color: #9aa3b5; font-size: 0.9rem; line-height: 1.45; }
      button, .linkbtn { width: 100%; min-height: 3rem; border: 0; border-radius: 0.9rem; background: #c8d0dc; color: #0c0e14; font-weight: 700; font-size: 0.95rem; cursor: pointer; display: grid; place-items: center; text-decoration: none; box-sizing: border-box; }
      button:disabled { opacity: 0.55; cursor: wait; }
      .linkbtn { margin-top: 0.6rem; background: transparent; border: 1px solid rgba(255,255,255,.15); color: #c8d0dc; font-weight: 600; font-size: 0.85rem; }
      #status { margin-top: 0.85rem; font-size: 0.8rem; color: #9aa3b5; min-height: 1.2em; }
      #status.err { color: #f07178; }
      #status.ok { color: #7fd99a; }
      .bar { margin-top: 0.75rem; height: 0.4rem; border-radius: 99px; background: #1e2430; overflow: hidden; }
      .bar > i { display: block; height: 100%; width: 0%; background: #c8d0dc; transition: width .15s; }
      .meta { font-size: 0.75rem; color: #6b7385; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Battle Legions — Android APK v${APP_VERSION}</h1>
      <p>
        Release package matching GitHub <code>apk-release-${APP_VERSION}</code>
        (${BUILD_ID}). Assembles from <code>/pkg/</code> chunks.
      </p>
      <button type="button" id="go">Download BattleLegions.apk</button>
      <a class="linkbtn" href="${GITHUB_APK}" target="_blank" rel="noopener">GitHub backup download</a>
      <div class="bar" aria-hidden="true"><i id="prog"></i></div>
      <div id="status">Ready · v${APP_VERSION}</div>
      <p class="meta">Build ${BUILD_ID}</p>
    </div>
    <script>
      const MIME = "application/vnd.android.package-archive";
      const statusEl = document.getElementById("status");
      const progEl = document.getElementById("prog");
      const go = document.getElementById("go");
      function setStatus(msg, cls) { statusEl.textContent = msg; statusEl.className = cls || ""; }
      function looksHtml(t) { const h = String(t).trimStart().slice(0, 40).toLowerCase(); return h.startsWith("<!doctype") || h.startsWith("<html"); }
      function b64ToBytes(b64) {
        const clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
        const bin = atob(clean);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      }
      async function fetchText(url) {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
        const text = await res.text();
        if (looksHtml(text)) throw new Error("Got HTML for " + url);
        return text;
      }
      async function download() {
        go.disabled = true;
        setStatus("Loading manifest…");
        progEl.style.width = "2%";
        let man = null, base = null;
        try {
          const t = await fetchText("/pkg/manifest.json?v=" + Date.now());
          man = JSON.parse(t);
          base = "/pkg/";
        } catch (e) {
          setStatus(String(e.message || e), "err");
          go.disabled = false;
          return;
        }
        if (!man?.parts?.length) {
          setStatus("Invalid manifest", "err");
          go.disabled = false;
          return;
        }
        const chunks = [];
        let total = 0;
        const CONC = 6;
        for (let i = 0; i < man.parts.length; i += CONC) {
          const batch = man.parts.slice(i, i + CONC);
          const results = await Promise.all(
            batch.map((name) => fetchText(base + name + "?t=" + Date.now()).then(b64ToBytes)),
          );
          for (const bytes of results) { chunks.push(bytes); total += bytes.length; }
          const done = Math.min(i + CONC, man.parts.length);
          setStatus("Fetching " + done + " / " + man.parts.length + "…");
          progEl.style.width = Math.round((done / man.parts.length) * 92) + "%";
        }
        const out = new Uint8Array(total);
        let o = 0;
        for (const c of chunks) { out.set(c, o); o += c.length; }
        if (out[0] !== 0x50 || out[1] !== 0x4b) {
          setStatus("Assembled file is not a valid APK.", "err");
          go.disabled = false;
          return;
        }
        const blob = new Blob([out.buffer], { type: MIME });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "BattleLegions.apk";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        progEl.style.width = "100%";
        setStatus("Saved BattleLegions.apk v${APP_VERSION} (" + (total / 1e6).toFixed(1) + " MB).", "ok");
        go.disabled = false;
      }
      go.addEventListener("click", () => {
        download().catch((e) => { setStatus(e.message || String(e), "err"); go.disabled = false; });
      });
      if (location.search.includes("autostart=1")) go.click();
    </script>
  </body>
</html>
`;
writeFileSync(join(outDir, "install.html"), installHtml);
writeFileSync(join(root, "public/get-apk.html"), installHtml);

console.log(
  `split-apk: ${parts.length} parts in /pkg/, ${buf.length} bytes, sha256=${hash.slice(0, 16)}… v${APP_VERSION}`,
);
