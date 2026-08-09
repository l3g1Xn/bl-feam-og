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

function beamTintFor(beam?: string, fallback = "#b0b8c8"): string {
  switch (beam) {
    case "ion_lance":
      return "#7ce8ff";
    case "photon_grid":
      return "#ffd070";
    case "rail_line":
      return "#ff9a4a";
    case "lifesteal_siphon":
      return "#c48ae0";
    case "aegis_shell":
      return "#8ec8ff";
    case "frost_bolt":
      return "#5eb0e8";
    case "shadow_bolt":
      return "#a070c8";
    case "nature_vine":
      return "#48b86a";
    case "ember_orb":
      return "#e07838";
    case "grav_well":
      return "#6a48a8";
    case "swarm_cloud":
      return "#5ecf7a";
    case "nova_burst":
      return "#ff6a2a";
    case "singularity":
      return "#9b5cff";
    case "phase_rift":
      return "#b070ff";
    case "matrix_lock":
      return "#70d0ff";
    case "chrono_slash":
      return "#50e0d0";
    case "hex_grid":
      return "#80a0ff";
    case "mortar_arc":
      return "#ff7040";
    default:
      return fallback;
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
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.9);
    into.push({
      x: cx,
      y: cy,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life: 1,
      maxLife: 0.35 + Math.random() * 0.45,
      size: 1.5 + Math.random() * 3.5,
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
    const x = x0 + (x1 - x0) * t + (Math.random() - 0.5) * 12;
    const y = y0 + (y1 - y0) * t + (Math.random() - 0.5) * 12;
    into.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40 - 20,
      life: 1,
      maxLife: 0.25 + Math.random() * 0.3,
      size: 1.2 + Math.random() * 2.4,
      color,
      kind,
    });
  }
}

export function CombatFxLayer({ fx, onDone }: CombatFxLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const runningId = useRef<number | null>(null);
  const traumaRef = useRef(0);
  const profileRef = useRef(getGraphicsProfile());
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [shock, setShock] = useState<Shockwave[]>([]);
  const [beams, setBeams] = useState<BeamLine[]>([]);
  const [slashes, setSlashes] = useState<
    { id: string; x: number; y: number; ang: number; color: string; len: number }[]
  >([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [hitStop, setHitStop] = useState(false);

  useEffect(() => {
    profileRef.current = getGraphicsProfile();
    return subscribeGraphics((p) => {
      profileRef.current = p;
    });
  }, []);

  // Particle canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let last = performance.now();
    const resize = () => {
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        profileRef.current.maxDpr,
      );
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]!;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 120 * dt;
        p.vx *= 0.98;
        const a = Math.max(0, p.life);
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = p.color;
        if (p.kind === "smoke") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.5 - a * 0.5), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;

      // Trauma shake decay on stage
      if (traumaRef.current > 0.001) {
        traumaRef.current *= 0.9;
        const stage = document.getElementById("battle-stage");
        if (stage && profileRef.current.enableShake) {
          const t = traumaRef.current;
          const ox = (Math.random() - 0.5) * t * 14;
          const oy = (Math.random() - 0.5) * t * 12;
          stage.style.transform = `translate3d(${ox}px,${oy}px,0)`;
        }
      } else if (traumaRef.current !== 0) {
        traumaRef.current = 0;
        const stage = document.getElementById("battle-stage");
        if (stage) stage.style.transform = "";
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Hit-stop CSS freeze
  useEffect(() => {
    const stage = document.getElementById("battle-stage");
    if (!stage) return;
    if (hitStop) stage.classList.add("fx-hitstop");
    else stage.classList.remove("fx-hitstop");
    return () => stage.classList.remove("fx-hitstop");
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
    const pKind =
      fx.beam === "lifesteal_siphon" || fx.beam === "singularity"
        ? "void"
        : fx.beam === "ion_lance"
          ? "arc"
          : fx.beam === "swarm_cloud"
            ? "leaf"
            : fx.beam === "nova_burst" || fx.beam === "ember_orb"
              ? "ember"
              : fx.beam === "grav_well"
                ? "smoke"
                : particleKindForSchool(fx.school);

    const stage = rootRef.current?.parentElement ?? document.body;
    promoteLayer(stage as HTMLElement, true);

    const toHero = fx.toKey.startsWith("hero:");
    const fromPlayer =
      fx.fromKey.includes("player") || !fx.fromKey.includes("enemy");
    const lethal = (fx.damage ?? 0) >= 8;
    if (fx.kind === "melee" || fx.kind === "beam") {
      playCombatSfx({
        kind: "melee",
        damage: fx.damage,
        fromPlayer,
        toHero,
        school: fx.school,
        beam: fx.beam,
        cardId: fx.cardId,
        keywords: fx.keywords,
        lethal,
      });
    } else if (fx.kind === "spell" || fx.kind === "dominus") {
      if (fx.heal && fx.heal > 0 && !(fx.damage && fx.damage > 0)) {
        playCombatSfx({
          kind: "heal",
          heal: fx.heal,
          cardId: fx.cardId,
          beam: fx.beam,
        });
      } else {
        playCombatSfx({
          kind: "spell",
          damage: fx.damage,
          toHero,
          fromPlayer: true,
          school: fx.school,
          beam: fx.beam,
          aoe: fx.aoe,
          cardId: fx.cardId,
          keywords: fx.keywords,
          lethal,
        });
      }
    } else if (fx.kind === "heal" || fx.kind === "buff" || fx.kind === "aegis") {
      playCombatSfx({
        kind: "heal",
        heal: fx.heal ?? 4,
        cardId: fx.cardId,
        beam: fx.beam,
      });
    } else if (fx.kind === "summon") {
      playCombatSfx({
        kind: "summon",
        cardId: fx.cardId,
        keywords: fx.keywords,
      });
    }

    if (profile.enableShake && fx.trauma > 0) {
      traumaRef.current = Math.min(
        1,
        traumaRef.current + fx.trauma * profile.fxScale,
      );
    }

    const stopMs = reduced ? 0 : (fx.hitStopMs ?? 0) * profile.fxScale;
    if (stopMs > 8) {
      setHitStop(true);
      window.setTimeout(() => setHitStop(false), stopMs);
    }

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
      const isBeamish =
        fx.beam === "laser" ||
        fx.beam === "arcane_beam" ||
        fx.beam === "frost_bolt" ||
        fx.beam === "shadow_bolt" ||
        fx.beam === "ember_orb" ||
        fx.beam === "ion_lance" ||
        fx.beam === "photon_grid" ||
        fx.beam === "rail_line" ||
        fx.beam === "nature_vine" ||
        fx.beam === "lifesteal_siphon" ||
        fx.beam === "aegis_shell" ||
        fx.kind === "beam" ||
        fx.kind === "spell" ||
        fx.kind === "dominus";

      if (isBeamish) {
        const thick =
          fx.kind === "dominus"
            ? 7
            : fx.beam === "rail_line"
              ? 6
              : fx.beam === "photon_grid"
                ? 5.5
                : fx.beam === "lifesteal_siphon"
                  ? 4.5
                  : fx.aoe
                    ? 5.5
                    : fx.beam === "ion_lance"
                      ? 4
                      : 3.5;
        const beamTint = beamTintFor(fx.beam, color);
        const haloColor =
          fx.beam === "ion_lance"
            ? "rgba(124,232,255,0.7)"
            : fx.beam === "lifesteal_siphon"
              ? "rgba(196,138,224,0.75)"
              : fx.beam === "photon_grid"
                ? "rgba(255,208,112,0.65)"
                : glow;
        const core: BeamLine = {
          id: `b-${fx.id}`,
          x0: from.x,
          y0: from.y,
          x1: to.x,
          y1: to.y,
          color: beamTint,
          thick,
          residual: false,
        };
        const halo: BeamLine = {
          id: `bh-${fx.id}`,
          x0: from.x,
          y0: from.y,
          x1: to.x,
          y1: to.y,
          color: haloColor,
          thick: thick + 4,
          residual: false,
        };
        setBeams((b) => [...b.slice(-6), halo, core]);
        window.setTimeout(() => {
          setBeams((b) => b.filter((x) => x.id !== core.id && x.id !== halo.id));
        }, Math.min(fx.durationMs * 0.65, 420));

        // Reverse siphon for lifesteal
        if (fx.beam === "lifesteal_siphon" || fx.keywords?.includes("lifesteal")) {
          const siphon: BeamLine = {
            id: `bs-${fx.id}`,
            x0: to.x,
            y0: to.y,
            x1: from.x,
            y1: from.y,
            color: "rgba(196,138,224,0.85)",
            thick: Math.max(2, thick * 0.55),
            residual: false,
          };
          window.setTimeout(() => {
            setBeams((b) => [...b.slice(-6), siphon]);
            window.setTimeout(() => {
              setBeams((b) => b.filter((x) => x.id !== siphon.id));
            }, 280);
          }, 90);
        }

        const residualMs = fx.residualMs ?? 300;
        window.setTimeout(() => {
          const res: BeamLine = {
            id: `br-${fx.id}`,
            x0: from.x,
            y0: from.y,
            x1: to.x,
            y1: to.y,
            color: beamTint,
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
          beamTint,
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
        color: beamTintFor(fx.beam, color),
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
          color: beamTintFor(fx.beam, color),
          len: Math.min(len, 240),
        };
        setSlashes((s) => [...s.slice(-4), slash]);
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
      const ringCount = Math.max(
        1,
        Math.min(
          5,
          fx.rings ??
            (fx.aoe || fx.kind === "dominus"
              ? 4
              : fx.damage
                ? 2
                : fx.kind === "summon"
                  ? 2
                  : 1),
        ),
      );
      const waveColor =
        fx.beam === "lifesteal_siphon"
          ? "#c48ae0"
          : fx.beam === "ion_lance"
            ? "#7ce8ff"
            : fx.beam === "aegis_shell"
              ? "#8ec8ff"
              : color;
      for (let i = 0; i < ringCount; i++) {
        const wave: Shockwave = {
          id: `s-${fx.id}-${i}`,
          x: to.x + (i - 1) * 14,
          y: to.y + (i % 2) * 8,
          color: waveColor,
          t0: performance.now(),
          scale:
            (fx.kind === "dominus" ? 10 : 7) *
            (fx.bloom ?? 1) *
            (1 + i * 0.08),
        };
        window.setTimeout(() => {
          setShock((s) => [...s.slice(-8), wave]);
          window.setTimeout(() => {
            setShock((s) => s.filter((x) => x.id !== wave.id));
          }, 520);
        }, i * 55);
      }

      const burstN = Math.min(
        profile.particleBudget,
        Math.floor(budget * (fx.kind === "dominus" ? 1.2 : 0.85)),
      );
      spawnBurst(
        particlesRef.current,
        to.x,
        to.y,
        burstN,
        beamTintFor(fx.beam, color),
        pKind,
        220,
      );
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
          beamTintFor(fx.beam, color),
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
        const label = fx.keywords?.includes("reborn")
          ? "REBORN"
          : fx.keywords?.includes("shield") || fx.keywords?.includes("taunt")
            ? "FORTIFIED"
            : "ONLINE";
        nextFloats.push({
          id: `n-${fx.id}`,
          x: to.x,
          y: to.y - 18,
          text: label,
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
      setFlash(beamTintFor(fx.beam, color));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "screen" }}
      />
      {flash && (
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: `radial-gradient(ellipse at center, ${flash} 0%, transparent 65%)`,
          }}
        />
      )}
      {beams.map((b) => {
        const dx = b.x1 - b.x0;
        const dy = b.y1 - b.y0;
        const len = Math.hypot(dx, dy);
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <div
            key={b.id}
            className={cn("absolute origin-left", b.residual && "fx-beam-residual")}
            style={{
              left: b.x0,
              top: b.y0,
              width: len,
              height: b.thick,
              transform: `rotate(${ang}deg)`,
              background: b.residual
                ? `linear-gradient(90deg, transparent, ${b.color}, transparent)`
                : `linear-gradient(90deg, transparent 0%, ${b.color} 15%, ${b.color} 85%, transparent 100%)`,
              boxShadow: b.residual
                ? `0 0 ${b.thick * 2}px ${b.color}`
                : `0 0 ${b.thick * 3}px ${b.color}, 0 0 ${b.thick * 6}px ${b.color}`,
              borderRadius: 99,
              opacity: b.residual ? 0.55 : 0.95,
            }}
          />
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
            height: 3,
            marginLeft: -s.len / 2,
            marginTop: -1.5,
            transform: `rotate(${s.ang}deg)`,
            background: `linear-gradient(90deg, transparent, ${s.color}, white, ${s.color}, transparent)`,
            boxShadow: `0 0 12px ${s.color}`,
          }}
        />
      ))}
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
            boxShadow: `0 0 16px ${s.color}`,
            // @ts-expect-error css var
            "--fx-scale": s.scale,
          }}
        />
      ))}
      {projectiles.map((p) => {
        const dx = p.x1 - p.x0;
        const dy = p.y1 - p.y0;
        return (
          <div
            key={p.id}
            className="fx-projectile absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/30 shadow-lg"
            style={{
              left: p.x0,
              top: p.y0,
              // @ts-expect-error css vars for animation
              "--dx": `${dx}px`,
              "--dy": `${dy}px`,
              "--dur": `${p.dur}ms`,
              background: p.art
                ? `center/cover url(${p.art})`
                : `radial-gradient(circle, white 0%, ${p.color} 55%, transparent 70%)`,
              boxShadow: `0 0 18px ${p.color}`,
            }}
          />
        );
      })}
      {floats.map((f) => (
        <div
          key={f.id}
          className="fx-float absolute -translate-x-1/2 font-bold tabular-nums tracking-tight"
          style={{
            left: f.x,
            top: f.y,
            color: f.color,
            fontSize: "1.15rem",
            textShadow: "0 2px 8px rgba(0,0,0,0.85)",
          }}
        >
          {f.text}
        </div>
      ))}
      {banner && (
        <div className="absolute left-1/2 top-[18%] z-[70] w-[min(92vw,28rem)] -translate-x-1/2">
          <div
            className="fx-banner flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-2xl backdrop-blur-md"
            style={{
              borderColor: `${banner.color}88`,
              background:
                "linear-gradient(135deg, rgba(8,10,14,0.92), rgba(12,16,24,0.88))",
              boxShadow: `0 12px 40px rgba(0,0,0,0.45), 0 0 24px ${banner.color}33`,
            }}
          >
            {banner.art && (
              <img
                src={banner.art}
                alt=""
                className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-white/20"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {banner.title}
              </div>
              {banner.detail && (
                <div className="truncate text-[0.65rem] text-white/60">
                  {banner.detail}
                </div>
              )}
              {banner.tags.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {banner.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-white/10 px-1.5 py-px text-[0.55rem] uppercase tracking-wide text-white/80"
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
      <style>{`
        .fx-projectile {
          animation: fx-proj var(--dur, 300ms) cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes fx-proj {
          from { transform: translate(-50%, -50%) scale(0.6); opacity: 0.2; }
          20% { opacity: 1; }
          to { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.05); opacity: 1; }
        }
        .fx-shockwave {
          animation: fx-shock 500ms ease-out forwards;
        }
        @keyframes fx-shock {
          from { transform: scale(0.4); opacity: 0.9; }
          to { transform: scale(var(--fx-scale, 7)); opacity: 0; }
        }
        .fx-float {
          animation: fx-float-up 900ms ease-out forwards;
        }
        @keyframes fx-float-up {
          from { transform: translate(-50%, 0); opacity: 0; }
          15% { opacity: 1; }
          to { transform: translate(-50%, -42px); opacity: 0; }
        }
        .fx-weapon-slash {
          animation: fx-slash 380ms ease-out forwards;
        }
        @keyframes fx-slash {
          from { opacity: 0; filter: blur(2px); }
          30% { opacity: 1; }
          to { opacity: 0; filter: blur(0); }
        }
        .fx-banner {
          animation: fx-banner-in 420ms cubic-bezier(0.2, 0.9, 0.2, 1) both;
        }
        @keyframes fx-banner-in {
          from { transform: translateY(-12px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        :global(.fx-hit-flash) {
          animation: fx-hit 280ms ease-out;
        }
        :global(.fx-lunge) {
          animation: fx-lunge 280ms ease-out;
        }
        :global(.fx-dominus-glow) {
          box-shadow: 0 0 28px rgba(255, 106, 26, 0.65) !important;
        }
        :global(.fx-buff-glow) {
          box-shadow: 0 0 18px rgba(94, 176, 232, 0.55) !important;
        }
        :global(.fx-hitstop) {
          filter: brightness(1.08) contrast(1.05);
        }
        @keyframes fx-hit {
          0% { filter: brightness(2.2); }
          100% { filter: brightness(1); }
        }
        @keyframes fx-lunge {
          0% { transform: scale(1); }
          40% { transform: scale(1.08) translateY(-4px); }
          100% { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fx-beam, .fx-weapon-slash, .fx-shockwave, .fx-lunge, .fx-hit-flash, .fx-float {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
