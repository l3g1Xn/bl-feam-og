/**
 * First-run permission checklist (Samsung S-series / Adreno WebView friendly).
 * APK only — website skips so public visitors land on LEGIXN command immediately.
 */
import { useEffect, useState } from "react";
import { AmbientStage } from "./AmbientStage";
import { GAME_TITLE_SHORT } from "@/game/brand";
import { unlockAudio, playSfx } from "@/game/audio";
import { isNativeApp } from "@/lib/platform";
import {
  CheckCircle2,
  Cpu,
  HardDrive,
  Shield,
  Smartphone,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "bl-permissions-ack-v1";

type Check = {
  id: string;
  label: string;
  detail: string;
  ok: boolean | null;
};

async function runChecks(): Promise<Check[]> {
  const items: Check[] = [];

  let storageOk: boolean | null = null;
  try {
    const k = "__bl_perm_probe__";
    localStorage.setItem(k, "1");
    storageOk = localStorage.getItem(k) === "1";
    localStorage.removeItem(k);
  } catch {
    storageOk = false;
  }
  items.push({
    id: "storage",
    label: "Local game cache",
    detail: "Save / Load and ticket vault on this device",
    ok: storageOk,
  });

  let audioOk: boolean | null = null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (Ctx) {
      const c = new Ctx();
      audioOk = c.state === "running" || c.state === "suspended";
      void c.close();
    } else audioOk = false;
  } catch {
    audioOk = false;
  }
  items.push({
    id: "audio",
    label: "Battle audio",
    detail: "Weapon strikes, grunts, and menu score",
    ok: audioOk,
  });

  let gpuOk: boolean | null = null;
  let gpuLabel = "GPU compositor";
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (gl) {
      gpuOk = true;
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
        gpuLabel = `GPU · ${renderer.slice(0, 48)}`;
      }
    } else gpuOk = false;
  } catch {
    gpuOk = false;
  }
  items.push({
    id: "gpu",
    label: gpuLabel,
    detail: "Hardware-accelerated battle FX (Adreno preferred default)",
    ok: gpuOk,
  });

  const landscape =
    typeof window !== "undefined"
      ? window.matchMedia("(orientation: landscape)").matches ||
        window.innerWidth >= window.innerHeight
      : true;
  items.push({
    id: "orient",
    label: "Landscape display",
    detail: isNativeApp()
      ? "APK locks sensor landscape for battlefield DPI"
      : "Rotate device for best battlefield layout",
    ok: isNativeApp() ? true : landscape,
  });

  const wake =
    typeof navigator !== "undefined" && "wakeLock" in navigator;
  items.push({
    id: "wake",
    label: "Screen wake lock",
    detail: wake
      ? "Supported — battle can request keep-awake"
      : "Optional — system may dim during long matches",
    ok: wake ? true : null,
  });

  return items;
}

export function PermissionsGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [checks, setChecks] = useState<Check[]>([]);

  useEffect(() => {
    // Website: skip checklist so live site lands on LEGIXN home
    if (!isNativeApp()) {
      setShow(false);
      return;
    }
    try {
      if (localStorage.getItem(KEY) === "1") {
        setShow(false);
        return;
      }
    } catch {
      /* show anyway */
    }
    setShow(true);
    void runChecks().then(setChecks);
  }, []);

  if (!show) return <>{children}</>;

  return (
    <div className="launcher-shell relative flex h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-4">
      <AmbientStage variant="launcher" />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-bg-elevated/95 p-5 shadow-2xl backdrop-blur-md">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">{GAME_TITLE_SHORT}</div>
            <div className="text-xs text-fg-subtle">Device readiness · Samsung S / Adreno</div>
          </div>
        </div>
        <p className="mb-3 text-sm text-fg-muted">
          Quick check before first launch. Nothing leaves this device — local saves,
          PIN vault, and offline battle only.
        </p>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-black/25 px-3 py-2"
            >
              {c.id === "storage" && <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              {c.id === "audio" && <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              {c.id === "gpu" && <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              {c.id === "orient" && (
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              )}
              {c.id === "wake" && (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-fg">{c.label}</span>
                  <span
                    className={cn(
                      "text-[0.65rem] font-semibold uppercase tracking-wide",
                      c.ok === true && "text-success",
                      c.ok === false && "text-danger",
                      c.ok === null && "text-fg-subtle",
                    )}
                  >
                    {c.ok === true ? "OK" : c.ok === false ? "Issue" : "Optional"}
                  </span>
                </div>
                <p className="text-[0.65rem] text-fg-muted">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              /* ignore */
            }
            unlockAudio();
            playSfx("ui");
            setShow(false);
          }}
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg"
        >
          Continue to command
        </button>
      </div>
    </div>
  );
}
