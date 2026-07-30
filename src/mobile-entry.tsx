import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "@/components/game/GameApp";
import { getGraphicsProfile } from "@/game/graphics";
import "./styles.css";

// Offline mobile shell — no SSR, no auth/db. All game state is local.
const profile = getGraphicsProfile();
document.documentElement.dataset.gpuTier = profile.tier;
document.documentElement.dataset.renderer = profile.renderer;
document.documentElement.style.setProperty("--target-fps", String(profile.targetFps));

// Keep screen awake during matches when supported (APK / PWA)
if ("wakeLock" in navigator) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<unknown> } })
        .wakeLock.request("screen")
        .catch(() => {});
    }
  });
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <GameApp />
    </StrictMode>,
  );
}

// Register offline service worker (production mobile build only)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
