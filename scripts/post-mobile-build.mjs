import {
  copyFileSync,
  existsSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist-mobile");
if (!existsSync(dist)) {
  console.error("dist-mobile missing");
  process.exit(1);
}

const sw = join(dist, "sw.js");
const man = join(dist, "manifest.webmanifest");
if (!existsSync(sw)) {
  copyFileSync(join(root, "public/sw.js"), sw);
}
if (!existsSync(man)) {
  copyFileSync(join(root, "public/manifest.webmanifest"), man);
}

// Never package web download bundles into the mobile APK (size + 404 noise).
for (const drop of [
  "downloads",
  "apk-parts",
  "assets/apk",
  "pkg",
  "get-apk.html",
]) {
  const p = join(dist, drop);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (
      name.endsWith(".apk") ||
      name.endsWith(".bin") ||
      name.endsWith(".b64") ||
      (name.startsWith("p") && name.endsWith(".txt") && name.length < 12)
    )
      rmSync(p);
  }
}
walk(dist);

const cards = join(dist, "cards");
const n = existsSync(cards)
  ? readdirSync(cards).filter((f) => f.endsWith(".jpg")).length
  : 0;
let t = 0;
function w(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    const st = statSync(p);
    if (st.isDirectory()) w(p);
    else t += st.size;
  }
}
w(dist);
console.log(`mobile build ready: ${n} card arts, sw=true, dist≈${(t / 1e6).toFixed(1)}MB`);
