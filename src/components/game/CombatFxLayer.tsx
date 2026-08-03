import { useEffect, useRef, useState } from "react";
import type { FxEvent } from "@/game/fx";
import {
  beamLabel,
  schoolColor,
  schoolGlow,
  motionEnabled,
} from "@/game/fx";
import {
  getGraphicsProfile,
  promoteLayer,
  subscribeGraphics,
} from "@/game/graphics";
import { playCombatSfx, unlockAudio } from "@/game/audio";
import { keywordLabel } from "@/game/cards";
import { cn } from "@/lib/utils";

interface CombatFxLayerProps {
  fx: FxEvent | null;
  onDone: (id: number) => void;
}

interface FloatNum {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

interface Projectile {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  art?: string;
  color: string;
  kind: string;
  beam?: string;
  t0: number;
  dur: number;
}

interface Shockwave {
  id: string;
  x: number;
  y: number;
  color: string;
  t0: number;
  scale: number;
}

interface Banner {
  id: number;
  title: string;
  detail?: string;
  color: string;
  art?: string;
  tags: string[];
}

interface BeamLine {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  thick: number;
  residual: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: "spark" | "ember" | "frost" | "void" | "leaf" | "arc" | "smoke";
}

function rectCenter(el: Element | null): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function findEntity(key: string): Element | null {
  return document.querySelector(`[data-entity="${CSS.escape(key)}"]`);
}

function particleKindForSchool(
  school?: string,
): Particle["kind"] {
  switch (school) {
    case "ember":
      return "ember";
    case "frost":
      return "frost";
    case "shadow":
      return "void";
    case "nature":
      return "leaf";
    case "arcane":
      return "arc";
    case "steel":
    default:
      return "spark";
  }
}

function spawnBurst(
  into: Particle[],
  cx: number,
  cy: number,
  count: number,
  color: string,
  kind: Particle["kind"],
  speed = 180,
) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = speed * (0.35 + Math.random() * 0.9);
    into.push({
      x: cx + (Math.random() - 0.5) * 8,
      y: cy + (Math.random() - 0.5) * 8,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 40,
      life: 0.35 + Math.random() * 0.45,
      maxLife: 0.35 + Math.random() * 0.45,
      size: 1.5 + Math.random() * (kind === "smoke" ? 6 : 3.5),
      color,
      kind,
    });
  }
}

function spawnTrail(
  into: Particle[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  count: number,
  color: string,
  kind: Particle["kind"],
) {
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const x = x0 + (x1 - x0) * t + (Math.random() - 0.5) * 10;
    const y = y0 + (y1 - y0) * t + (Math.random() - 0.5) * 10;
    into.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40 - 20,
      life: 0.25 + Math.random() * 0.35,
      maxLife: 0.25 + Math.random() * 0.35,
      size: 1.2 + Math.random() * 2.2,
      color,
      kind,
    });
  }
}

export function CombatFxLayer({ fx, onDone }: CombatFxLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [shock, setShock] = useState<Shockwave[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [slashes, setSlashes] = useState<
    Array<{
      id: string;
      x: number;
      y: number;
      ang: number;
      color: string;
      len: number;
    }>
  >([]);
  const [beams, setBeams] = useState<BeamLine[]>([]);
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const [hitStop, setHitStop] = useState(false);
  const traumaRef = useRef(0);
  const rafRef = useRef(0);
  const runningId = useRef<number | null>(null);
  const profileRef = useRef(getGraphicsProfile());

  useEffect(() => {
    return subscribeGraphics((p) => {
      profileRef.current = p;
    });
  }, []);

  // Canvas particle + trauma loop
  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const profile = profileRef.current;
      const rawDt = (now - last) / 1000;
      last = now;
      // Hit-stop freezes presentation particles briefly
      const dt = hitStop ? 0 : Math.min(0.05, rawDt);

      if (profile.enableShake && traumaRef.current > 0.001 && !hitStop) {
        traumaRef.current = Math.max(0, traumaRef.current - dt * 2.8);
        const s = traumaRef.current * traumaRef.current;
        const mag = 12 * s * profile.fxScale;
        setShake({
          x: (Math.random() * 2 - 1) * mag,
          y: (Math.random() * 2 - 1) * mag,
        });
      } else if (shake.x !== 0 || shake.y !== 0) {
        if (!hitStop) setShake({ x: 0, y: 0 });
      }

      // Integrate particles
      const parts = particlesRef.current;
      if (parts.length && dt > 0) {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]!;
          p.life -= dt;
          if (p.life <= 0) {
            parts.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += (p.kind === "ember" ? 40 : 90) * dt;
          p.vx *= 0.98;
          if (p.kind === "frost") p.vy *= 0.96;
          if (p.kind === "void") {
            p.vx += Math.sin(now * 0.01 + i) * 20 * dt;
          }
        }
        // Cap budget
        const budget = profile.particleBudget;
        if (parts.length > budget) {
          parts.splice(0, parts.length - budget);
        }
      }

      // Draw canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(
          profile.maxDpr,
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
        );
        const w = window.innerWidth;
        const h = window.innerHeight;
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
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
          for (const p of parts) {
            const a = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = a * 0.95;
            if (p.kind === "ember") {
              ctx.fillStyle = p.color;
              ctx.shadowColor = p.color;
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * (0.6 + a), 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            } else if (p.kind === "frost") {
              ctx.strokeStyle = p.color;
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(p.x - p.size, p.y);
              ctx.lineTo(p.x + p.size, p.y);
              ctx.moveTo(p.x, p.y - p.size);
              ctx.lineTo(p.x, p.y + p.size);
              ctx.stroke();
            } else if (p.kind === "void") {
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "rgba(255,255,255,0.35)";
              ctx.lineWidth = 0.8;
              ctx.stroke();
            } else if (p.kind === "leaf") {
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.ellipse(p.x, p.y, p.size * 1.4, p.size * 0.6, a * 3, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.kind === "arc") {
              ctx.fillStyle = "#fff";
              ctx.shadowColor = p.color;
              ctx.shadowBlur = 10;
              ctx.fillRect(p.x - p.size * 0.4, p.y - p.size, p.size * 0.8, p.size * 2);
              ctx.shadowBlur = 0;
            } else if (p.kind === "smoke") {
              ctx.fillStyle = p.color;
              ctx.globalAlpha = a * 0.35;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * (1.4 - a * 0.4), 0, Math.PI * 2);
              ctx.fill();
            } else {
              // spark
              ctx.strokeStyle = p.color;
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
              ctx.stroke();
              ctx.fillStyle = "#fff";
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitStop]);

  useEffect(() => {
    if (!fx) return;
    if (runningId.current === fx.id) return;
    runningId.current = fx.id;

    unlockAudio();
    const reduced = !motionEnabled();
    const profile = profileRef.current;
    const from = rectCenter(findEntity(fx.fromKey));
    const to = rectCenter(findEntity(fx.toKey));
    const color = schoolColor(fx.school);
    const glow = schoolGlow(fx.school);
    const pKind = particleKindForSchool(fx.school);

    const stage = rootRef.current?.parentElement ?? document.body;
    promoteLayer(stage as HTMLElement, true);

    const toHero = fx.toKey.startsWith("hero:");
    const fromPlayer =
      fx.fromKey.includes("player") || !fx.fromKey.includes("enemy");
    if (fx.kind === "melee" || fx.kind === "beam") {
      playCombatSfx({
        kind: "melee",
        damage: fx.damage,
        fromPlayer,
        toHero,
        school: fx.school,
        beam: fx.beam,
      });
    } else if (fx.kind === "spell" || fx.kind === "dominus") {
      if (fx.heal && fx.heal > 0 && !(fx.damage && fx.damage > 0)) {
        playCombatSfx({ kind: "heal", heal: fx.heal });
      } else {
        playCombatSfx({
          kind: "spell",
          damage: fx.damage,
          toHero,
          fromPlayer: true,
          school: fx.school,
          beam: fx.beam,
        });
      }
    } else if (fx.kind === "heal" || fx.kind === "buff" || fx.kind === "aegis") {
      playCombatSfx({ kind: "heal", heal: fx.heal ?? 4 });
    } else if (fx.kind === "summon") {
      playCombatSfx({ kind: "summon" });
    }

    if (profile.enableShake && fx.trauma > 0) {
      traumaRef.current = Math.min(
        1,
        traumaRef.current + fx.trauma * profile.fxScale,
      );
    }

    // Micro hit-stop
    const stopMs = reduced ? 0 : (fx.hitStopMs ?? 0) * profile.fxScale;
    if (stopMs > 8) {
      setHitStop(true);
      window.setTimeout(() => setHitStop(false), stopMs);
    }

    // Card callout banner
    if (fx.banner || fx.cardName) {
      const tags: string[] = [];
      if (fx.beam) tags.push(beamLabel(fx.beam));
      for (const k of fx.keywords ?? []) tags.push(keywordLabel(k));
      if (fx.spellKind) tags.push(fx.spellKind.replace(/_/g, " "));
      const b: Banner = {
        id: fx.id,
        title: fx.banner ?? fx.cardName ?? "Combat",
        detail: fx.detail ?? fx.cardText,
        color,
        art: fx.artSrc,
        tags: tags.slice(0, 4),
      };
      setBanner(b);
      window.setTimeout(() => {
        setBanner((cur) => (cur?.id === fx.id ? null : cur));
      }, Math.min(fx.durationMs + 80, 960));
    }

    const targetEl = findEntity(fx.toKey);
    if (targetEl) {
      targetEl.classList.add("fx-hit-flash");
      if (fx.kind === "dominus") targetEl.classList.add("fx-dominus-glow");
      if (fx.kind === "aegis" || fx.kind === "buff")
        targetEl.classList.add("fx-buff-glow");
      window.setTimeout(() => {
        targetEl.classList.remove(
          "fx-hit-flash",
          "fx-dominus-glow",
          "fx-buff-glow",
        );
      }, 280);
    }
    const fromEl = findEntity(fx.fromKey);
    if (fromEl && (fx.kind === "melee" || fx.kind === "beam")) {
      fromEl.classList.add("fx-lunge");
      window.setTimeout(
        () => fromEl.classList.remove("fx-lunge"),
        fx.durationMs,
      );
    }

    const budget = Math.floor(
      (fx.particles ?? 16) * profile.fxScale * profile.battleDetail,
    );

    if (!reduced && from && to) {
      // Multi-layer beam: core + halo + residual
      const isBeamish =
        fx.beam === "laser" ||
        fx.beam === "arcane_beam" ||
        fx.beam === "frost_bolt" ||
        fx.beam === "shadow_bolt" ||
        fx.beam === "ember_orb" ||
        fx.kind === "beam" ||
        fx.kind === "spell" ||
        fx.kind === "dominus";

      if (isBeamish) {
        const thick = fx.kind === "dominus" ? 7 : fx.aoe ? 5.5 : 3.5;
        const core: BeamLine = {
          id: `b-${fx.id}`,
          x0: from.x,
          y0: from.y,
          x1: to.x,
          y1: to.y,
          color,
          thick,
          residual: false,
        };
        const halo: BeamLine = {
          id: `bh-${fx.id}`,
          x0: from.x,
          y0: from.y,
          x1: to.x,
          y1: to.y,
          color: glow,
          thick: thick + 4,
          residual: false,
        };
        setBeams((b) => [...b.slice(-6), halo, core]);
        window.setTimeout(() => {
          setBeams((b) => b.filter((x) => x.id !== core.id && x.id !== halo.id));
        }, Math.min(fx.durationMs * 0.65, 420));

        // Residual trail
        const residualMs = fx.residualMs ?? 300;
        window.setTimeout(() => {
          const res: BeamLine = {
            id: `br-${fx.id}`,
            x0: from.x,
            y0: from.y,
            x1: to.x,
            y1: to.y,
            color,
            thick: Math.max(1.5, thick * 0.45),
            residual: true,
          };
          setBeams((b) => [...b.slice(-6), res]);
          window.setTimeout(() => {
            setBeams((b) => b.filter((x) => x.id !== res.id));
          }, residualMs);
        }, 80);

        spawnTrail(
          particlesRef.current,
          from.x,
          from.y,
          to.x,
          to.y,
          Math.min(budget, Math.floor(budget * 0.55)),
          color,
          pKind,
        );
      }

      const proj: Projectile = {
        id: `p-${fx.id}`,
        x0: from.x,
        y0: from.y,
        x1: to.x,
        y1: to.y,
        art: fx.artSrc,
        color,
        kind: fx.kind,
        beam: fx.beam,
        t0: performance.now(),
        dur: Math.min(fx.durationMs * 0.55, 360),
      };
      setProjectiles((p) => [...p.slice(-8), proj]);
      window.setTimeout(() => {
        setProjectiles((p) => p.filter((x) => x.id !== proj.id));
      }, proj.dur + 40);

      if (
        fx.kind === "melee" ||
        fx.beam === "slash" ||
        fx.beam === "laser"
      ) {
        const ang = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
        const len = Math.hypot(to.x - from.x, to.y - from.y);
        const slash = {
          id: `sl-${fx.id}`,
          x: (from.x + to.x) / 2,
          y: (from.y + to.y) / 2,
          ang,
          color,
          len: Math.min(len, 240),
        };
        setSlashes((s) => [...s.slice(-4), slash]);
        // dual-trail return slash for return damage
        if ((fx.returnDamage ?? 0) > 0) {
          const back = {
            ...slash,
            id: `slb-${fx.id}`,
            ang: ang + 180,
          };
          window.setTimeout(() => {
            setSlashes((s) => [...s.slice(-4), back]);
            window.setTimeout(() => {
              setSlashes((s) => s.filter((x) => x.id !== back.id));
            }, 320);
          }, 90);
        }
        window.setTimeout(() => {
          setSlashes((s) => s.filter((x) => x.id !== slash.id));
        }, 400);
      }
    }

    if (!reduced && to && profile.battleDetail >= 0.4) {
      const waves =
        fx.aoe || fx.kind === "dominus" ? 4 : fx.damage ? 2 : fx.kind === "summon" ? 2 : 1;
      for (let i = 0; i < waves; i++) {
        const wave: Shockwave = {
          id: `s-${fx.id}-${i}`,
          x: to.x + (i - 1) * 14,
          y: to.y + (i % 2) * 8,
          color,
          t0: performance.now(),
          scale: (fx.kind === "dominus" ? 10 : 7) * (fx.bloom ?? 1),
        };
        window.setTimeout(() => {
          setShock((s) => [...s.slice(-8), wave]);
          window.setTimeout(() => {
            setShock((s) => s.filter((x) => x.id !== wave.id));
          }, 520);
        }, i * 60);
      }

      // Impact particle burst
      const burstN = Math.min(
        profile.particleBudget,
        Math.floor(budget * (fx.kind === "dominus" ? 1.2 : 0.85)),
      );
      spawnBurst(particlesRef.current, to.x, to.y, burstN, color, pKind, 220);
      spawnBurst(
        particlesRef.current,
        to.x,
        to.y,
        Math.floor(burstN * 0.35),
        "rgba(180,190,210,0.6)",
        "smoke",
        90,
      );
      if (from) {
        spawnBurst(
          particlesRef.current,
          from.x,
          from.y,
          Math.floor(burstN * 0.25),
          color,
          pKind,
          120,
        );
      }
    }

    if (to) {
      const nextFloats: FloatNum[] = [];
      if (fx.damage && fx.damage > 0) {
        nextFloats.push({
          id: `d-${fx.id}`,
          x: to.x,
          y: to.y - 12,
          text: `−${fx.damage}`,
          color: "var(--color-danger)",
        });
      }
      if (fx.returnDamage && fx.returnDamage > 0 && from) {
        nextFloats.push({
          id: `r-${fx.id}`,
          x: from.x,
          y: from.y - 12,
          text: `−${fx.returnDamage}`,
          color: "var(--color-warn)",
        });
      }
      if (fx.heal && fx.heal > 0) {
        nextFloats.push({
          id: `h-${fx.id}`,
          x: to.x,
          y: to.y - 12,
          text: `+${fx.heal}`,
          color: "var(--color-success)",
        });
      }
      if (fx.kind === "summon" && fx.cardName) {
        nextFloats.push({
          id: `n-${fx.id}`,
          x: to.x,
          y: to.y - 18,
          text: "ONLINE",
          color,
        });
      }
      if (nextFloats.length) {
        setFloats((f) => [...f.slice(-12), ...nextFloats]);
        window.setTimeout(() => {
          setFloats((f) =>
            f.filter((x) => !nextFloats.some((n) => n.id === x.id)),
          );
        }, 900);
      }
    }

    if (
      fx.kind === "spell" ||
      fx.kind === "beam" ||
      fx.kind === "dominus" ||
      fx.aoe ||
      (fx.damage && fx.damage >= 5)
    ) {
      setFlash(color);
      window.setTimeout(
        () => setFlash(null),
        fx.kind === "dominus" ? 300 : 180,
      );
    }

    const doneAt = reduced ? 80 : fx.durationMs + (fx.hitStopMs ?? 0) * 0.5;
    const t = window.setTimeout(() => {
      promoteLayer(stage as HTMLElement, false);
      onDone(fx.id);
      if (runningId.current === fx.id) runningId.current = null;
    }, doneAt);

    return () => window.clearTimeout(t);
  }, [fx, onDone]);

  useEffect(() => {
    const el = document.getElementById("battle-stage");
    if (!el) return;
    el.style.transform = `translate3d(${shake.x}px, ${shake.y}px, 0)`;
    el.classList.toggle("fx-hitstop", hitStop);
  }, [shake, hitStop]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "screen" }}
      />

      {flash && (
        <div
          className="absolute inset-0 opacity-35"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${flash}, transparent 58%)`,
          }}
        />
      )}

      {banner && (
        <div className="absolute left-1/2 top-[12%] z-[60] w-[min(92vw,22rem)] -translate-x-1/2">
          <div
            className="flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-2xl backdrop-blur-md"
            style={{
              borderColor: `${banner.color}88`,
              background: `linear-gradient(135deg, ${banner.color}33, rgba(10,12,18,0.92))`,
              boxShadow: `0 0 28px ${banner.color}44`,
            }}
          >
            {banner.art && (
              <img
                src={banner.art}
                alt=""
                className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-white/20"
                draggable={false}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold tracking-wide text-white">
                {banner.title}
              </div>
              {banner.detail && (
                <div className="line-clamp-2 text-[0.65rem] leading-snug text-white/75">
                  {banner.detail}
                </div>
              )}
              {banner.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {banner.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-black/40 px-1.5 py-0.5 text-[0.55rem] font-medium uppercase tracking-wide text-white/80"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {beams.map((b) => {
        const dx = b.x1 - b.x0;
        const dy = b.y1 - b.y0;
        const len = Math.hypot(dx, dy);
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <div
            key={b.id}
            className={cn(
              "absolute origin-left rounded-full",
              b.residual ? "fx-beam-residual" : "fx-beam",
            )}
            style={{
              left: b.x0,
              top: b.y0,
              width: len,
              height: b.thick,
              transform: `rotate(${ang}deg)`,
              background: b.residual
                ? `linear-gradient(90deg, transparent, ${b.color}55, transparent)`
                : `linear-gradient(90deg, transparent, ${b.color}, #fff, ${b.color}, transparent)`,
              boxShadow: b.residual
                ? `0 0 8px ${b.color}66`
                : `0 0 14px ${b.color}, 0 0 28px ${b.color}`,
            }}
          />
        );
      })}

      {shock.map((s) => (
        <div
          key={s.id}
          className="fx-shockwave absolute rounded-full border-2"
          style={{
            left: s.x,
            top: s.y,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            borderColor: s.color,
            boxShadow: `0 0 24px ${s.color}`,
            // @ts-expect-error CSS var
            "--fx-scale": s.scale,
          }}
        />
      ))}

      {projectiles.map((p) => {
        const dx = p.x1 - p.x0;
        const dy = p.y1 - p.y0;
        const isArt =
          !!p.art &&
          (p.kind === "spell" ||
            p.kind === "beam" ||
            p.kind === "dominus" ||
            p.kind === "melee");
        return (
          <div
            key={p.id}
            className={cn(
              "absolute overflow-hidden rounded-full shadow-lg",
              isArt
                ? "h-9 w-9 border border-white/30"
                : p.kind === "spell"
                  ? "h-4 w-4"
                  : "h-2.5 w-8",
            )}
            style={{
              left: p.x0,
              top: p.y0,
              marginLeft: isArt ? -18 : -6,
              marginTop: isArt ? -18 : -6,
              background: isArt
                ? undefined
                : p.kind === "spell" || p.kind === "beam"
                  ? `radial-gradient(circle, #fff, ${p.color})`
                  : p.color,
              boxShadow: `0 0 18px ${p.color}`,
              animation: `fx-proj ${p.dur}ms linear forwards`,
              // @ts-expect-error CSS vars
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
            }}
          >
            {isArt && (
              <img
                src={p.art}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            )}
          </div>
        );
      })}

      {slashes.map((s) => (
        <div
          key={s.id}
          className="fx-weapon-slash absolute"
          style={{
            left: s.x,
            top: s.y,
            width: s.len,
            height: 5,
            marginLeft: -s.len / 2,
            marginTop: -2.5,
            // @ts-expect-error CSS var
            "--ang": `${s.ang}deg`,
            transform: `rotate(${s.ang}deg)`,
            background: `linear-gradient(90deg, transparent, #fff, ${s.color}, #fff, transparent)`,
            boxShadow: `0 0 18px ${s.color}, 0 0 32px ${s.color}`,
          }}
        />
      ))}
      {floats.map((f) => (
        <div
          key={f.id}
          className="fx-float absolute text-lg font-bold tabular drop-shadow-md"
          style={{
            left: f.x,
            top: f.y,
            color: f.color,
            transform: "translateX(-50%)",
          }}
        >
          {f.text}
        </div>
      ))}

      <style>{`
        @keyframes fx-proj {
          from { transform: translate(0,0) scale(1); opacity: 1; }
          to { transform: translate(var(--dx), var(--dy)) scale(0.65); opacity: 0.12; }
        }
        .fx-shockwave {
          animation: fx-shock 500ms ease-out forwards;
        }
        @keyframes fx-shock {
          from { transform: scale(0.35); opacity: 0.95; }
          to { transform: scale(var(--fx-scale, 6)); opacity: 0; }
        }
        .fx-weapon-slash {
          animation: fx-slash 380ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          border-radius: 99px;
        }
        @keyframes fx-slash {
          0% { opacity: 0; transform: rotate(var(--ang, 0deg)) scaleX(0.15); filter: brightness(2.4); }
          30% { opacity: 1; transform: rotate(var(--ang, 0deg)) scaleX(1.08); filter: brightness(1.7); }
          100% { opacity: 0; transform: rotate(var(--ang, 0deg)) scaleX(1.2); filter: brightness(1); }
        }
        .fx-beam {
          animation: fx-beam-fade 400ms ease-out forwards;
        }
        .fx-beam-residual {
          animation: fx-beam-residual 480ms ease-out forwards;
        }
        @keyframes fx-beam-fade {
          0% { opacity: 0; filter: brightness(2.2); }
          18% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes fx-beam-residual {
          0% { opacity: 0.55; }
          100% { opacity: 0; }
        }
        .fx-dominus-glow {
          box-shadow: 0 0 28px 10px rgba(180,120,255,0.6) !important;
        }
        .fx-buff-glow {
          box-shadow: 0 0 20px 5px rgba(90,200,140,0.55) !important;
        }
        .fx-hit-flash {
          animation: fx-hit 220ms ease-out;
          filter: brightness(1.45) saturate(1.2);
        }
        @keyframes fx-hit {
          0% { filter: brightness(2.2) saturate(1.4); }
          100% { filter: brightness(1) saturate(1); }
        }
        .fx-lunge {
          animation: fx-lunge 320ms cubic-bezier(0.2, 0.9, 0.3, 1);
        }
        @keyframes fx-lunge {
          0% { transform: translateY(0) scale(1); }
          35% { transform: translateY(-6px) scale(1.06); }
          100% { transform: translateY(0) scale(1); }
        }
        .fx-float {
          animation: fx-float-up 850ms ease-out forwards;
        }
        @keyframes fx-float-up {
          0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-36px) scale(0.9); }
        }
        .fx-hitstop {
          filter: contrast(1.08) saturate(1.15);
        }
        @media (prefers-reduced-motion: reduce) {
          .fx-beam, .fx-weapon-slash, .fx-shockwave, .fx-lunge, .fx-hit-flash, .fx-float {
            animation-duration: 1ms !important;
          }
        }
      `}</style>
    </div>
  );
}
