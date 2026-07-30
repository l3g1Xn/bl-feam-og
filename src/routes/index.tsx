import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/components/game/GameApp";
import { BUILD_ID } from "@/game/brand";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: HomePage,
});

function HomePage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Drop stale service workers from earlier builds so UI/APK updates appear
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const r of regs) void r.unregister();
      });
      if (typeof caches !== "undefined") {
        void caches.keys().then((keys) => {
          for (const k of keys) {
            if (k.startsWith("battle-legions")) void caches.delete(k);
          }
        });
      }
    }
    // Stamp for support / confirm sync
    try {
      document.documentElement.dataset.buildId = BUILD_ID;
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-fg-muted">
        <p className="text-sm">Loading Battle Legions…</p>
      </div>
    );
  }

  return <GameApp />;
}
