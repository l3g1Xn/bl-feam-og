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
  version: 3,
  filename: "BattleLegions.apk",
  size: buf.length,
  sha256: hash,
  partSize: PART,
  encoding: "base64",
  parts,
  mime: "application/vnd.android.package-archive",
  path: "/pkg/",
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

// Install helper uses same /pkg/ paths
const installSrc = join(root, "public/get-apk.html");
if (existsSync(installSrc)) {
  let html = readFileSync(installSrc, "utf8");
  html = html
    .replaceAll("/assets/apk/", "/pkg/")
    .replaceAll("/apk-parts/", "/pkg/")
    .replaceAll(".b64", ".txt");
  writeFileSync(join(outDir, "install.html"), html);
  writeFileSync(join(root, "public/get-apk.html"), html);
}

console.log(
  `split-apk: ${parts.length} parts in /pkg/, ${buf.length} bytes, sha256=${hash.slice(0, 16)}…`,
);
