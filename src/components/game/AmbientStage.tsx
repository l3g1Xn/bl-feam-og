import { useEffect, useRef, useState } from "react";
import {
  getGraphicsProfile,
  subscribeGraphics,
  type GraphicsProfile,
} from "@/game/graphics";

/** Layered atmospheric battlefield / launcher — reacts to quality in real time. */
export function AmbientStage({
  variant = "launcher",
}: {
  variant?: "launcher" | "battle";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [profile, setProfile] = useState(() => getGraphicsProfile());

  useEffect(() => {
    setProfile(getGraphicsProfile());
    return subscribeGraphics((p) => setProfile({ ...p }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!profile.ambientDepth) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr);
    const n = profile.particleBudget;
    const particles = Array.from({ length: n }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * (variant === "battle" ? 2.4 : 1.8),
      sp: 0.02 + Math.random() * 0.08,
      a: 0.08 + Math.random() * 0.28,
      hue:
        variant === "battle"
          ? 10 + Math.random() * 40 + (Math.random() > 0.5 ? 190 : 0)
          : Math.random() > 0.45
            ? 18 + Math.random() * 22  /* LEGIXN orange */
            : 200 + Math.random() * 40,
      kind: Math.random() > 0.7 ? "spark" : "dust",
    }));

    // Embers / energy bolts for high detail battle
    const bolts =
      variant === "battle" && profile.battleDetail >= 1
        ? Array.from({ length: Math.floor(4 * profile.battleDetail) }, () => ({
            x: Math.random(),
            y: 0.3 + Math.random() * 0.4,
            life: Math.random(),
            len: 0.04 + Math.random() * 0.08,
          }))
        : [];

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || window.innerWidth || 1;
      const h = parent?.clientHeight || window.innerHeight || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    const frameMs = 1000 / Math.max(24, Math.min(profile.targetFps, 120));

    const tick = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (now - last < frameMs * 0.8) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Battle fog bands
      if (variant === "battle" && profile.battleDetail >= 0.7) {
        const g = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.65);
        g.addColorStop(0, "rgba(74,122,176,0)");
        g.addColorStop(0.5, `rgba(74,122,176,${0.04 * profile.fxScale})`);
        g.addColorStop(1, "rgba(160,96,96,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      for (const p of particles) {
        p.y -= p.sp * dt * (12 + profile.fxScale * 6);
        p.x += Math.sin(now * 0.0004 + p.y * 8) * 0.001 * profile.fxScale;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        const px = p.x * w;
        const py = p.y * h;
        if (p.kind === "spark" && profile.sparklines) {
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${p.hue}, 70%, 75%, ${p.a * profile.fxScale})`;
          ctx.lineWidth = 1.2 * profile.fxScale;
          ctx.moveTo(px, py);
          ctx.lineTo(px + 2, py - 6 * profile.fxScale);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.fillStyle = `hsla(${p.hue}, 40%, 70%, ${p.a * profile.fxScale})`;
          ctx.arc(px, py, p.r * profile.fxScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const b of bolts) {
        b.life += dt * 1.2;
        if (b.life > 1) {
          b.life = 0;
          b.x = Math.random();
          b.y = 0.25 + Math.random() * 0.5;
        }
        const alpha = Math.sin(b.life * Math.PI) * 0.35 * profile.fxScale;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(200,220,255,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.moveTo(b.x * w, b.y * h);
        ctx.lineTo((b.x + b.len) * w, (b.y - b.len * 0.3) * h);
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [variant, profile]);

  const battleBg =
    "radial-gradient(ellipse 90% 55% at 50% 15%, rgba(74,122,176,0.22), transparent 60%), radial-gradient(ellipse 70% 45% at 50% 100%, rgba(160,96,96,0.18), transparent 55%), radial-gradient(ellipse 40% 30% at 20% 50%, rgba(200,160,80,0.06), transparent 50%), linear-gradient(180deg, #07080c 0%, #10141c 42%, #0a0b0d 100%)";
  const launcherBg =
    "radial-gradient(ellipse 100% 70% at 50% -10%, rgba(125,143,168,0.28), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(106,154,208,0.12), transparent 50%), radial-gradient(ellipse 50% 40% at 15% 70%, rgba(138,106,154,0.1), transparent 50%), linear-gradient(165deg, #08090c 0%, #12151c 50%, #0a0c10 100%)";

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          position: "absolute",
          inset: 0,
          background: variant === "battle" ? battleBg : launcherBg,
          filter: profile.enableBlur ? undefined : undefined,
        }}
      />
      {profile.rimLight && variant === "battle" && (
        <div
          className="absolute inset-0"
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 0 80px rgba(106,154,208,0.12), inset 0 -40px 60px rgba(160,96,96,0.1)",
          }}
        />
      )}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05 + profile.battleDetail * 0.03,
          mixBlendMode: "overlay",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {variant === "battle" && profile.quality !== "low" && (
        <div
          className="battle-floor-glow absolute inset-x-0 bottom-0"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "28%",
            background:
              "linear-gradient(to top, rgba(80,40,40,0.25), rgba(40,60,100,0.08), transparent)",
            opacity: profile.fxScale,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 96,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 128,
          background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
        }}
      />
    </div>
  );
}
