import { useEffect, useRef } from "react";
import { getGraphicsProfile, subscribeGraphics } from "@/game/graphics";

/**
 * Canvas-drawn HUD frame for launcher / menu panels.
 * Pure presentation — steel + accent geometry, animated energy rails.
 */
export function CanvasChrome({
  className,
  variant = "panel",
}: {
  className?: string;
  variant?: "panel" | "hero" | "store" | "menu";
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let profile = getGraphicsProfile();
    let raf = 0;
    let running = true;
    let t0 = performance.now();

    const paint = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(paint);
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth || 1;
      const h = parent.clientHeight || 1;
      if (w < 4 || h < 4) return;
      const dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr);
      if (
        canvas.width !== Math.floor(w * dpr) ||
        canvas.height !== Math.floor(h * dpr)
      ) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const t = (now - t0) / 1000;
      const pulse = 0.55 + Math.sin(t * 1.6) * 0.12 * profile.fxScale;
      const accent =
        variant === "store"
          ? [106, 154, 208]
          : variant === "menu"
            ? [200, 208, 220]
            : [255, 106, 26];
      const [ar, ag, ab] = accent;

      // Soft plate fill
      const plate = ctx.createLinearGradient(0, 0, w, h);
      if (variant === "hero") {
        plate.addColorStop(0, "rgba(255,106,26,0.14)");
        plate.addColorStop(0.45, "rgba(12,16,24,0.55)");
        plate.addColorStop(1, "rgba(8,10,16,0.78)");
      } else if (variant === "store") {
        plate.addColorStop(0, "rgba(106,154,208,0.12)");
        plate.addColorStop(1, "rgba(10,12,18,0.74)");
      } else if (variant === "menu") {
        plate.addColorStop(0, "rgba(40,48,64,0.5)");
        plate.addColorStop(1, "rgba(8,10,14,0.72)");
      } else {
        plate.addColorStop(0, "rgba(30,36,48,0.55)");
        plate.addColorStop(1, "rgba(8,10,14,0.7)");
      }
      roundRect(ctx, 1, 1, w - 2, h - 2, 18);
      ctx.fillStyle = plate;
      ctx.fill();

      // Outer frame
      ctx.strokeStyle = `rgba(232,236,242,${0.14 + pulse * 0.08})`;
      ctx.lineWidth = 1.25;
      roundRect(ctx, 1.5, 1.5, w - 3, h - 3, 18);
      ctx.stroke();

      // Accent rim
      ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.28 + pulse * 0.22})`;
      ctx.lineWidth = 1.5;
      roundRect(ctx, 4, 4, w - 8, h - 8, 15);
      ctx.stroke();

      // Secondary inner hairline
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + pulse * 0.04})`;
      ctx.lineWidth = 0.75;
      roundRect(ctx, 7, 7, w - 14, h - 14, 13);
      ctx.stroke();

      // Corner brackets
      const arm = Math.min(32, w * 0.09, h * 0.14);
      ctx.strokeStyle = `rgba(${ar},${Math.min(255, ag + 30)},${ab},${0.55 + pulse * 0.28})`;
      ctx.lineWidth = 2.2;
      drawBracket(ctx, 10, 10, arm, 1, 1);
      drawBracket(ctx, w - 10, 10, arm, -1, 1);
      drawBracket(ctx, 10, h - 10, arm, 1, -1);
      drawBracket(ctx, w - 10, h - 10, arm, -1, -1);

      // Diagonal edge ticks
      if (profile.battleDetail >= 0.7) {
        ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.2 + pulse * 0.15})`;
        ctx.lineWidth = 1;
        const tick = 10;
        for (const [tx, ty, dx, dy] of [
          [18, 18, 1, 1],
          [w - 18, 18, -1, 1],
          [18, h - 18, 1, -1],
          [w - 18, h - 18, -1, -1],
        ] as const) {
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + dx * tick, ty + dy * tick * 0.35);
          ctx.stroke();
        }
      }

      // Top scan line
      if (profile.battleDetail >= 0.7 && h > 40) {
        const y = 12 + ((t * 32) % Math.max(24, h - 24));
        const g = ctx.createLinearGradient(0, y - 10, 0, y + 10);
        g.addColorStop(0, `rgba(${ar},${ag},${ab},0)`);
        g.addColorStop(0.5, `rgba(${ar},${ag},${ab},${0.1 * profile.fxScale})`);
        g.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(8, y - 10, w - 16, 20);
      }

      // Micro grid
      if (profile.sparklines && variant !== "menu") {
        ctx.strokeStyle = "rgba(200,210,230,0.045)";
        ctx.lineWidth = 1;
        const step = 16;
        for (let x = 16; x < w - 16; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 16);
          ctx.lineTo(x, h - 16);
          ctx.stroke();
        }
        for (let y = 16; y < h - 16; y += step) {
          ctx.beginPath();
          ctx.moveTo(16, y);
          ctx.lineTo(w - 16, y);
          ctx.stroke();
        }
      }

      // Energy rail along top edge — clamp stops to [0,1]
      if (variant === "hero" || variant === "store") {
        const railY = 6;
        const railG = ctx.createLinearGradient(0, railY, w, railY);
        const head = (t * 0.35) % 1;
        const a0 = clamp01(head - 0.15);
        const a1 = clamp01(head);
        const a2 = clamp01(head + 0.15);
        // Only add strictly increasing stops
        const stops: [number, string][] = [
          [a0, `rgba(${ar},${ag},${ab},0)`],
          [a1, `rgba(${ar},${ag},${ab},${0.55 * pulse})`],
          [a2, `rgba(${ar},${ag},${ab},0)`],
        ];
        let last = -1;
        for (const [pos, col] of stops) {
          if (pos > last) {
            railG.addColorStop(pos, col);
            last = pos;
          }
        }
        ctx.strokeStyle = railG;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, railY);
        ctx.lineTo(w - 20, railY);
        ctx.stroke();
      }

      // Energy nodes
      const nodes = variant === "hero" ? 6 : variant === "store" ? 4 : 3;
      for (let i = 0; i < nodes; i++) {
        const nx = 20 + ((i + 1) / (nodes + 1)) * (w - 40);
        const ny = 12;
        const glow = 0.35 + pulse * 0.35 + Math.sin(t * 3 + i) * 0.1;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${ar},${ag},${ab},${glow})`;
        ctx.shadowColor = `rgba(${ar},${ag},${ab},0.6)`;
        ctx.shadowBlur = 6;
        ctx.arc(nx, ny, 1.8 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const unsub = subscribeGraphics((p) => {
      profile = p;
    });
    raf = requestAnimationFrame(paint);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [variant]);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        borderRadius: "inherit",
        zIndex: 0,
      }}
    />
  );
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBracket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  arm: number,
  sx: number,
  sy: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y + sy * arm);
  ctx.lineTo(x, y);
  ctx.lineTo(x + sx * arm, y);
  ctx.stroke();
}
