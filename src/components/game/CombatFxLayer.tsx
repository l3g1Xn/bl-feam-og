import { useEffect, useRef, useState } from "react";
import type { FxEvent } from "@/game/fx";
import { schoolColor, motionEnabled } from "@/game/fx";
import { getGraphicsProfile, promoteLayer, subscribeGraphics } from "@/game/graphics";
import { playCombatSfx, unlockAudio } from "@/game/audio";
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
  kind: "melee" | "spell";
  t0: number;
  dur: number;
}

interface Shockwave {
  id: string;
  x: number;
  y: number;
  color: string;
  t0: number;
}

function rectCenter(el: Element | null): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function findEntity(key: string): Element | null {
  return document.querySelector(`[data-entity="${CSS.escape(key)}"]`);
}

export function CombatFxLayer({ fx, onDone }: CombatFxLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [shock, setShock] = useState<Shockwave[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const traumaRef = useRef(0);
  const rafRef = useRef(0);
  const runningId = useRef<number | null>(null);
  const profileRef = useRef(getGraphicsProfile());

  useEffect(() => {
    return subscribeGraphics((p) => {
      profileRef.current = p;
    });
  }, []);

  // Screen shake loop (trauma²)
  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const profile = profileRef.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (profile.enableShake && traumaRef.current > 0.001) {
        traumaRef.current = Math.max(0, traumaRef.current - dt * 2.8);
        const s = traumaRef.current * traumaRef.current;
        const mag = 10 * s * profile.fxScale;
        setShake({
          x: (Math.random() * 2 - 1) * mag,
          y: (Math.random() * 2 - 1) * mag,
        });
      } else if (shake.x !== 0 || shake.y !== 0) {
        setShake({ x: 0, y: 0 });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const stage = rootRef.current?.parentElement ?? document.body;
    promoteLayer(stage as HTMLElement, true);

    // Battle SFX
    const toHero = fx.toKey.startsWith("hero:");
    const fromPlayer = fx.fromKey.includes("player") || !fx.fromKey.includes("enemy");
    if (fx.kind === "melee") {
      playCombatSfx({
        kind: "melee",
        damage: fx.damage,
        fromPlayer,
        toHero,
      });
    } else if (fx.kind === "spell") {
      if (fx.heal && fx.heal > 0 && !(fx.damage && fx.damage > 0)) {
        playCombatSfx({ kind: "heal", heal: fx.heal });
      } else {
        playCombatSfx({
          kind: "spell",
          damage: fx.damage,
          toHero,
          fromPlayer: true,
        });
      }
    } else if (fx.kind === "heal") {
      playCombatSfx({ kind: "heal", heal: fx.heal });
    } else if (fx.kind === "summon") {
      playCombatSfx({ kind: "summon" });
    }

    if (profile.enableShake && fx.trauma > 0) {
      traumaRef.current = Math.min(1, traumaRef.current + fx.trauma * profile.fxScale);
    }

    const targetEl = findEntity(fx.toKey);
    if (targetEl) {
      targetEl.classList.add("fx-hit-flash");
      window.setTimeout(() => targetEl.classList.remove("fx-hit-flash"), 180);
    }
    const fromEl = findEntity(fx.fromKey);
    if (fromEl && fx.kind === "melee") {
      fromEl.classList.add("fx-lunge");
      window.setTimeout(() => fromEl.classList.remove("fx-lunge"), fx.durationMs);
    }

    if (!reduced && from && to) {
      const proj: Projectile = {
        id: `p-${fx.id}`,
        x0: from.x,
        y0: from.y,
        x1: to.x,
        y1: to.y,
        art: fx.artSrc,
        color,
        kind: fx.kind === "spell" ? "spell" : "melee",
        t0: performance.now(),
        dur: Math.min(fx.durationMs * 0.55, 320),
      };
      setProjectiles((p) => [...p.slice(-6), proj]);
      window.setTimeout(() => {
        setProjectiles((p) => p.filter((x) => x.id !== proj.id));
      }, proj.dur + 40);
    }

    if (!reduced && to && profile.battleDetail >= 0.75 && (fx.damage ?? 0) > 0) {
      const wave: Shockwave = {
        id: `s-${fx.id}`,
        x: to.x,
        y: to.y,
        color,
        t0: performance.now(),
      };
      setShock((s) => [...s.slice(-4), wave]);
      window.setTimeout(() => {
        setShock((s) => s.filter((x) => x.id !== wave.id));
      }, 420);
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
      if (nextFloats.length) {
        setFloats((f) => [...f.slice(-10), ...nextFloats]);
        window.setTimeout(() => {
          setFloats((f) => f.filter((x) => !nextFloats.some((n) => n.id === x.id)));
        }, 700);
      }
    }

    if (fx.kind === "spell") {
      setFlash(color);
      window.setTimeout(() => setFlash(null), 160);
    }

    const doneAt = reduced ? 80 : fx.durationMs;
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
  }, [shake]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden
    >
      {flash && (
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${flash}, transparent 55%)`,
          }}
        />
      )}
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
          }}
        />
      ))}
      {projectiles.map((p) => {
        const dx = p.x1 - p.x0;
        const dy = p.y1 - p.y0;
        return (
          <div
            key={p.id}
            className={cn(
              "absolute h-3 w-3 rounded-full shadow-lg",
              p.kind === "spell" ? "h-4 w-4" : "h-2.5 w-8",
            )}
            style={{
              left: p.x0,
              top: p.y0,
              background:
                p.kind === "spell"
                  ? `radial-gradient(circle, #fff, ${p.color})`
                  : p.color,
              boxShadow: `0 0 16px ${p.color}`,
              animation: `fx-proj ${p.dur}ms linear forwards`,
              // @ts-expect-error CSS vars
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
            }}
          />
        );
      })}
      {floats.map((f) => (
        <div
          key={f.id}
          className="fx-float absolute text-lg font-bold tabular drop-shadow-md"
          style={{ left: f.x, top: f.y, color: f.color }}
        >
          {f.text}
        </div>
      ))}
      <style>{`
        @keyframes fx-proj {
          from { transform: translate(0,0) scale(1); opacity: 1; }
          to { transform: translate(var(--dx), var(--dy)) scale(0.7); opacity: 0.2; }
        }
        .fx-shockwave {
          animation: fx-shock 420ms ease-out forwards;
        }
        @keyframes fx-shock {
          from { transform: scale(0.4); opacity: 0.85; }
          to { transform: scale(6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
