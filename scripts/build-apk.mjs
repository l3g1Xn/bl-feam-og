#!/usr/bin/env node
/**
 * Build Battle Legions debug APK + split download parts.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const jdk21 = join(root, "jdk-21");
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  join(root, "android-sdk");

const env = {
  ...process.env,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  ...(existsSync(jdk21)
    ? {
        JAVA_HOME: jdk21,
        PATH: `${join(jdk21, "bin")}:${process.env.PATH}`,
      }
    : {}),
};

// Don't embed APK inside the APK during mobile packaging
run("rm", ["-f", "public/downloads/*.apk", "public/downloads/*.bin"], { env, shell: true });

run("npx", ["vite", "build", "--config", "vite.mobile.config.ts"], { env });
run("node", ["scripts/post-mobile-build.mjs"], { env });
run("npx", ["cap", "sync", "android"], { env });

const gradlew = join(root, "android", "gradlew");
run("chmod", ["+x", gradlew]);
run(gradlew, ["assembleDebug", "--no-daemon"], {
  cwd: join(root, "android"),
  env,
});

const apk = join(root, "android/app/build/outputs/apk/debug/app-debug.apk");
const outDir = join(root, "artifacts");
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, "BattleLegions.apk");
if (!existsSync(apk)) {
  console.error("APK not found at", apk);
  process.exit(1);
}
copyFileSync(apk, dest);
mkdirSync(join(root, "public/downloads"), { recursive: true });
copyFileSync(apk, join(root, "public/downloads/BattleLegions.apk"));
copyFileSync(apk, join(root, "public/downloads/EQUATE-debug.apk"));
// Split into proxy-safe parts for the web download button
run("node", ["scripts/split-apk.mjs", dest], { env });
console.log("APK ready:", dest);
