import { useEffect, useRef, useState } from "react";
import {
  getGraphicsProfile,
  subscribeGraphics,
} from "@/game/graphics";

/** Layered atmospheric battlefield / launcher — denser VFX at high quality. */
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
    const n = Math.floor(profile.particleBudget * (variant === "battle" ? 1.15 : 0.9));
    const particles = Array.from({ length: n }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * (variant === "battle" ? 2.8 : 2.0),
      sp: 0.02 + Math.random() * 0.09,
      a: 0.08 + Math.random() * 0.32,
      hue:
        variant === "battle"
          ? 10 + Math.random() * 40 + (Math.random() > 0.5 ? 190 : 0)
          : Math.random() > 0.45
            ? 18 + Math.random() * 22
            : 200 + Math.random() * 40,
      kind: Math.random() > 0.65 ? "spark" : Math.random() > 0.5 ? "dust" : "ember",
    }));

    const bolts =
      variant === "battle" && profile.battleDetail >= 0.9
        ? Array.from({ length: Math.floor(6 * profile.battleDetail) }, () => ({
            x: Math.random(),
            y: 0.25 + Math.random() * 0.5,
            life: Math.random(),
            len: 0.05 + Math.random() * 0.1,
            hue: Math.random() > 0.5 ? 200 : 25,
          }))
        : [];

    const auroras =
      profile.battleDetail >= 0.7
        ? Array.from({ length: variant === "battle" ? 3 : 2 }, (_, i) => ({
            y: 0.15 + i * 0.22 + Math.random() * 0.05,
            amp: 0.02 + Math.random() * 0.025,
            speed: 0.15 + Math.random() * 0.2,
            phase: Math.random() * Math.PI * 2,
            hue: variant === "battle" ? (i % 2 === 0 ? 210 : 18) : 22 + i * 40,
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

      for (const a of auroras) {
        a.phase += dt * a.speed;
        ctx.beginPath();
        const yBase = a.y * h;
        ctx.moveTo(0, yBase);
        for (let x = 0; x <= w; x += 12) {
          const y =
            yBase +
            Math.sin(x * 0.008 + a.phase) * a.amp * h +
            Math.sin(x * 0.02 - a.phase * 1.3) * a.amp * h * 0.4;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${a.hue}, 70%, 60%, ${0.06 * profile.fxScale})`;
        ctx.lineWidth = 18 * profile.fxScale;
        ctx.stroke();
        ctx.strokeStyle = `hsla(${a.hue}, 80%, 70%, ${0.1 * profile.fxScale})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      if (variant === "battle" && profile.battleDetail >= 0.7) {
        const g = ctx.createLinearGradient(0, h * 0.32, 0, h * 0.68);
        g.addColorStop(0, "rgba(74,122,176,0)");
        g.addColorStop(0.5, `rgba(74,122,176,${0.055 * profile.fxScale})`);
        g.addColorStop(1, "rgba(160,96,96,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        const seam = ctx.createLinearGradient(w * 0.1, h * 0.5, w * 0.9, h * 0.5);
        seam.addColorStop(0, "rgba(100,200,255,0)");
        seam.addColorStop(0.5, `rgba(120,220,255,${0.08 * profile.fxScale})`);
        seam.addColorStop(1, "rgba(100,200,255,0)");
        ctx.fillStyle = seam;
        ctx.fillRect(0, h * 0.48, w, h * 0.04);
      }

      if (profile.battleDetail >= 1) {
        const t = now / 1000;
        for (let i = 0; i < 3; i++) {
          const cx = w * (0.2 + i * 0.3 + Math.sin(t * 0.2 + i) * 0.04);
          const shaft = ctx.createLinearGradient(cx, 0, cx + 40, h);
          shaft.addColorStop(0, `rgba(255,160,80,${0.04 * profile.fxScale})`);
          shaft.addColorStop(0.5, `rgba(255,120,40,${0.02 * profile.fxScale})`);
          shaft.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = shaft;
          ctx.beginPath();
          ctx.moveTo(cx - 30, 0);
          ctx.lineTo(cx + 50, 0);
          ctx.lineTo(cx + 90, h);
          ctx.lineTo(cx - 60, h);
          ctx.closePath();
          ctx.fill();
        }
      }

      for (const p of particles) {
        p.y -= p.sp * dt * (12 + profile.fxScale * 6);
        p.x += Math.sin(now * 0.0004 + p.y * 8) * 0.0012 * profile.fxScale;
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        const px = p.x * w;
        const py = p.y * h;
        if (p.kind === "spark" && profile.sparklines) {
          ctx.beginPath();
          ctx.strokeStyle = `hsla(${p.hue}, 75%, 78%, ${p.a * profile.fxScale})`;
          ctx.lineWidth = 1.3 * profile.fxScale;
          ctx.shadowColor = `hsla(${p.hue}, 80%, 70%, 0.5)`;
          ctx.shadowBlur = 6;
          ctx.moveTo(px, py);
          ctx.lineTo(px + 2, py - 7 * profile.fxScale);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (p.kind === "ember") {
          ctx.beginPath();
          ctx.fillStyle = `hsla(${p.hue}, 85%, 60%, ${p.a * profile.fxScale})`;
          ctx.shadowColor = `hsla(${p.hue}, 90%, 55%, 0.6)`;
          ctx.shadowBlur = 8;
          ctx.arc(px, py, p.r * profile.fxScale * 1.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.beginPath();
          ctx.fillStyle = `hsla(${p.hue}, 40%, 70%, ${p.a * profile.fxScale})`;
          ctx.arc(px, py, p.r * profile.fxScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const b of bolts) {
        b.life += dt * 1.25;
        if (b.life > 1) {
          b.life = 0;
          b.x = Math.random();
          b.y = 0.22 + Math.random() * 0.55;
        }
        const alpha = Math.sin(b.life * Math.PI) * 0.4 * profile.fxScale;
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${b.hue}, 80%, 75%, ${alpha})`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = `hsla(${b.hue}, 90%, 70%, ${alpha})`;
        ctx.shadowBlur = 10;
        ctx.moveTo(b.x * w, b.y * h);
        const segs = 4;
        for (let s = 1; s <= segs; s++) {
          const t = s / segs;
          const nx = b.x * w + b.len * w * t + (Math.random() - 0.5) * 8;
          const ny = b.y * h - b.len * h * 0.35 * t + (Math.random() - 0.5) * 6;
          ctx.lineTo(nx, ny);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
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
    "radial-gradient(ellipse 90% 55% at 50% 15%, rgba(74,122,176,0.26), transparent 60%), radial-gradient(ellipse 70% 45% at 50% 100%, rgba(160,96,96,0.22), transparent 55%), radial-gradient(ellipse 40% 30% at 20% 50%, rgba(200,160,80,0.08), transparent 50%), radial-gradient(ellipse 35% 28% at 80% 40%, rgba(100,160,255,0.07), transparent 50%), linear-gradient(180deg, #06070b 0%, #10141c 42%, #090a0e 100%)";
  const launcherBg =
    "radial-gradient(ellipse 100% 70% at 50% -10%, rgba(125,143,168,0.32), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(255,106,26,0.1), transparent 50%), radial-gradient(ellipse 50% 40% at 15% 70%, rgba(138,106,154,0.12), transparent 50%), linear-gradient(165deg, #07080c 0%, #12151c 50%, #090b10 100%)";

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          position: "absolute",
          inset: 0,
          background: variant === "battle" ? battleBg : launcherBg,
        }}
      />
      {profile.rimLight && variant === "battle" && (
        <div
          className="absolute inset-0"
          style={{
            position: "absolute",
            inset: 0,
            boxShadow:
              "inset 0 0 100px rgba(106,154,208,0.14), inset 0 -50px 70px rgba(160,96,96,0.12)",
          }}
        />
      )}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.055 + profile.battleDetail * 0.035,
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
            height: "30%",
            background:
              "linear-gradient(to top, rgba(80,40,40,0.28), rgba(40,60,100,0.1), transparent)",
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
          background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 128,
          background: "linear-gradient(to top, rgba(0,0,0,0.58), transparent)",
        }}
      />
    </div>
  );
}
