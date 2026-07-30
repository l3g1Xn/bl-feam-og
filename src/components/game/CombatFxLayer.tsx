import { useEffect, useRef, useState } from "react";
import type { FxEvent } from "@/game/fx";
import { beamLabel, schoolColor, motionEnabled } from "@/game/fx";
import { getGraphicsProfile, promoteLayer, subscribeGraphics } from "@/game/graphics";
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
  const [banner, setBanner] = useState<Banner | null>(null);
  const [slashes, setSlashes] = useState<
    Array<{ id: string; x: number; y: number; ang: number; color: string; len: number }>
  >([]);
  const [beams, setBeams] = useState<
    Array<{ id: string; x0: number; y0: number; x1: number; y1: number; color: string; thick: number }>
  >([]);
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

    const toHero = fx.toKey.startsWith("hero:");
    const fromPlayer = fx.fromKey.includes("player") || !fx.fromKey.includes("enemy");
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
      traumaRef.current = Math.min(1, traumaRef.current + fx.trauma * profile.fxScale);
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
      }, Math.min(fx.durationMs + 80, 900));
    }

    const targetEl = findEntity(fx.toKey);
    if (targetEl) {
      targetEl.classList.add("fx-hit-flash");
      if (fx.kind === "dominus") targetEl.classList.add("fx-dominus-glow");
      if (fx.kind === "aegis" || fx.kind === "buff") targetEl.classList.add("fx-buff-glow");
      window.setTimeout(() => {
        targetEl.classList.remove("fx-hit-flash", "fx-dominus-glow", "fx-buff-glow");
      }, 220);
    }
    const fromEl = findEntity(fx.fromKey);
    if (fromEl && (fx.kind === "melee" || fx.kind === "beam")) {
      fromEl.classList.add("fx-lunge");
      window.setTimeout(() => fromEl.classList.remove("fx-lunge"), fx.durationMs);
    }

    if (!reduced && from && to) {
      // Laser / school beam line
      if (
        fx.beam === "laser" ||
        fx.beam === "arcane_beam" ||
        fx.kind === "beam" ||
        fx.kind === "spell" ||
        fx.kind === "dominus"
      ) {
        const beam = {
          id: `b-${fx.id}`,
          x0: from.x,
          y0: from.y,
          x1: to.x,
          y1: to.y,
          color,
          thick: fx.kind === "dominus" ? 6 : fx.aoe ? 5 : 3,
        };
        setBeams((b) => [...b.slice(-4), beam]);
        window.setTimeout(() => {
          setBeams((b) => b.filter((x) => x.id !== beam.id));
        }, Math.min(fx.durationMs * 0.7, 400));
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
        dur: Math.min(fx.durationMs * 0.55, 340),
      };
      setProjectiles((p) => [...p.slice(-8), proj]);
      window.setTimeout(() => {
        setProjectiles((p) => p.filter((x) => x.id !== proj.id));
      }, proj.dur + 40);

      // Animated weaponry strike (blade / beam arc)
      if (fx.kind === "melee" || fx.beam === "slash" || fx.beam === "laser") {
        const ang = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
        const len = Math.hypot(to.x - from.x, to.y - from.y);
        const slash = {
          id: `sl-${fx.id}`,
          x: (from.x + to.x) / 2,
          y: (from.y + to.y) / 2,
          ang,
          color,
          len: Math.min(len, 220),
        };
        setSlashes((s) => [...s.slice(-4), slash]);
        window.setTimeout(() => {
          setSlashes((s) => s.filter((x) => x.id !== slash.id));
        }, 380);
      }
    }

    if (!reduced && to && profile.battleDetail >= 0.55) {
      const waves = fx.aoe || fx.kind === "dominus" ? 3 : fx.damage ? 1 : 0;
      for (let i = 0; i < waves; i++) {
        const wave: Shockwave = {
          id: `s-${fx.id}-${i}`,
          x: to.x + (i - 1) * 18,
          y: to.y + (i % 2) * 10,
          color,
          t0: performance.now(),
          scale: fx.kind === "dominus" ? 9 : 6,
        };
        window.setTimeout(() => {
          setShock((s) => [...s.slice(-6), wave]);
          window.setTimeout(() => {
            setShock((s) => s.filter((x) => x.id !== wave.id));
          }, 480);
        }, i * 70);
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
          color: color,
        });
      }
      if (nextFloats.length) {
        setFloats((f) => [...f.slice(-12), ...nextFloats]);
        window.setTimeout(() => {
          setFloats((f) => f.filter((x) => !nextFloats.some((n) => n.id === x.id)));
        }, 800);
      }
    }

    if (fx.kind === "spell" || fx.kind === "beam" || fx.kind === "dominus" || fx.aoe) {
      setFlash(color);
      window.setTimeout(() => setFlash(null), fx.kind === "dominus" ? 280 : 160);
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
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${flash}, transparent 55%)`,
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
            className="fx-beam absolute origin-left rounded-full"
            style={{
              left: b.x0,
              top: b.y0,
              width: len,
              height: b.thick,
              transform: `rotate(${ang}deg)`,
              background: `linear-gradient(90deg, transparent, ${b.color}, #fff, ${b.color}, transparent)`,
              boxShadow: `0 0 12px ${b.color}, 0 0 24px ${b.color}`,
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
        const isArt = !!p.art && (p.kind === "spell" || p.kind === "beam" || p.kind === "dominus" || p.kind === "melee");
        return (
          <div
            key={p.id}
            className={cn(
              "absolute overflow-hidden rounded-full shadow-lg",
              isArt ? "h-8 w-8 border border-white/30" : p.kind === "spell" ? "h-4 w-4" : "h-2.5 w-8",
            )}
            style={{
              left: p.x0,
              top: p.y0,
              marginLeft: isArt ? -16 : -6,
              marginTop: isArt ? -16 : -6,
              background: isArt
                ? undefined
                : p.kind === "spell" || p.kind === "beam"
                  ? `radial-gradient(circle, #fff, ${p.color})`
                  : p.color,
              boxShadow: `0 0 16px ${p.color}`,
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
            height: 4,
            marginLeft: -s.len / 2,
            marginTop: -2,
            // @ts-expect-error CSS var
            "--ang": `${s.ang}deg`,
            transform: `rotate(${s.ang}deg)`,
            background: `linear-gradient(90deg, transparent, #fff, ${s.color}, #fff, transparent)`,
            boxShadow: `0 0 16px ${s.color}, 0 0 28px ${s.color}`,
          }}
        />
      ))}
      {floats.map((f) => (
        <div
          key={f.id}
          className="fx-float absolute text-lg font-bold tabular drop-shadow-md"
          style={{ left: f.x, top: f.y, color: f.color, transform: "translateX(-50%)" }}
        >
          {f.text}
        </div>
      ))}

      <style>{`
        @keyframes fx-proj {
          from { transform: translate(0,0) scale(1); opacity: 1; }
          to { transform: translate(var(--dx), var(--dy)) scale(0.7); opacity: 0.15; }
        }
        .fx-shockwave {
          animation: fx-shock 460ms ease-out forwards;
        }
        @keyframes fx-shock {
          from { transform: scale(0.4); opacity: 0.9; }
          to { transform: scale(var(--fx-scale, 6)); opacity: 0; }
        }
        .fx-weapon-slash {
          animation: fx-slash 360ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          border-radius: 99px;
        }
        @keyframes fx-slash {
          0% { opacity: 0; transform: rotate(var(--ang, 0deg)) scaleX(0.2); filter: brightness(2.2); }
          35% { opacity: 1; transform: rotate(var(--ang, 0deg)) scaleX(1.05); filter: brightness(1.6); }
          100% { opacity: 0; transform: rotate(var(--ang, 0deg)) scaleX(1.15); filter: brightness(1); }
        }
        .fx-beam {
          animation: fx-beam-fade 380ms ease-out forwards;
        }
        @keyframes fx-beam-fade {
          0% { opacity: 0; filter: brightness(2); }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
        .fx-dominus-glow {
          box-shadow: 0 0 24px 8px rgba(180,120,255,0.55) !important;
        }
        .fx-buff-glow {
          box-shadow: 0 0 18px 4px rgba(90,200,140,0.5) !important;
        }
      `}</style>
    </div>
  );
}
