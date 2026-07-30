/**
 * Shrink Vercel static output for deploy limits:
 * - Prefer /pkg/*.txt chunked base64 (small files) for APK download
 * - Strip full APK from deploy (duplicate of /pkg; keeps upload under platform caps)
 * - Drop WAVs / .bin / accidental SDK trees
 */
import {
  existsSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const staticDir = join(root, ".vercel/output/static");
const MAX_FILE = 20 * 1024 * 1024; // keep individual static assets lean for Grok deploy

if (!existsSync(staticDir)) {
  console.log("[prune-vercel] no .vercel/output/static — skip");
  process.exit(0);
}

function sizeOf(p) {
  if (!existsSync(p)) return 0;
  const st = statSync(p);
  if (st.isFile()) return st.size;
  let t = 0;
  for (const n of readdirSync(p)) t += sizeOf(join(p, n));
  return t;
}

function walkFiles(dir, fn) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, fn);
    else fn(p, name, st.size);
  }
}

// Always remove WAVs and .bin
walkFiles(staticDir, (p, name) => {
  if (name.endsWith(".wav") || name.endsWith(".bin")) {
    unlinkSync(p);
    console.log("[prune-vercel] removed", p.replace(staticDir, ""));
  }
});

// Prefer chunked /pkg over full APK — Grok deploy hangs / fails on large binary packages
const downloads = join(staticDir, "downloads");
const pkgDir = join(staticDir, "pkg");
if (existsSync(downloads)) {
  for (const name of readdirSync(downloads)) {
    if (name.endsWith(".apk") || name.endsWith(".bin")) {
      const p = join(downloads, name);
      unlinkSync(p);
      console.log("[prune-vercel] stripped", name, "from downloads (use /pkg parts)");
    }
  }
  // Tiny marker so path exists for UI copy
  writeFileSync(
    join(downloads, "README.txt"),
    "BattleLegions.apk is delivered via /pkg chunked download (see Download button).\n",
  );
}

// Remove any remaining oversized singles (except /pkg text parts)
walkFiles(staticDir, (p, name, size) => {
  if (p.includes(`${join("pkg")}`) || p.includes("/pkg/")) return;
  if (size > MAX_FILE) {
    // Keep music under 12MB each if possible; strip if somehow huge
    if (name.endsWith(".mp3") || name.endsWith(".ogg") || name.endsWith(".jpg")) {
      if (size > 12 * 1024 * 1024) {
        unlinkSync(p);
        console.log(
          `[prune-vercel] removed oversized media ${p.replace(staticDir, "")} (${(size / 1e6).toFixed(1)}MB)`,
        );
      }
      return;
    }
    unlinkSync(p);
    console.log(
      `[prune-vercel] removed oversized ${p.replace(staticDir, "")} (${(size / 1e6).toFixed(1)}MB)`,
    );
  }
});

if (!existsSync(pkgDir)) {
  console.warn(
    "[prune-vercel] WARNING: /pkg missing — APK download may fail on deploy. Run split-apk.mjs before build.",
  );
} else {
  const man = join(pkgDir, "manifest.json");
  if (!existsSync(man)) {
    console.warn("[prune-vercel] WARNING: /pkg/manifest.json missing");
  }
}

// Never ship SDK / local trees if somehow copied
for (const drop of [
  "android",
  "android-sdk",
  "jdk-21",
  "artifacts",
  "dist-mobile",
  "screenshots",
  "attachments",
  "node_modules",
]) {
  const p = join(staticDir, drop);
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    console.log("[prune-vercel] removed accidental", drop);
  }
}

const final = sizeOf(staticDir);
const largest = { size: 0, path: "" };
walkFiles(staticDir, (p, _n, size) => {
  if (size > largest.size) {
    largest.size = size;
    largest.path = p.replace(staticDir, "");
  }
});
console.log(
  `[prune-vercel] static ≈ ${(final / 1e6).toFixed(1)} MB · largest file ${largest.path} ${(largest.size / 1e6).toFixed(1)} MB`,
);
