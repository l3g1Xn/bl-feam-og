import type { TargetRef } from "./types";

/** Presentation-only combat FX — never mutates game math. */

export type FxKind = "melee" | "spell" | "summon" | "heal" | "hitstop";

export interface FxEvent {
  id: number;
  kind: FxKind;
  /** Attacker entity key: minion uid or "player-hero" / "enemy-hero" */
  fromKey: string;
  /** Defender entity key */
  toKey: string;
  damage?: number;
  returnDamage?: number;
  heal?: number;
  /** Spell / school tint */
  school?: "steel" | "ember" | "frost" | "shadow" | "nature" | "arcane";
  /** Art path for projectile portrait (optional) */
  artSrc?: string;
  /** Duration hint ms */
  durationMs: number;
  /** Screen shake trauma 0–1 */
  trauma: number;
}

export function entityKeyMinion(uid: string): string {
  return `minion:${uid}`;
}

export function entityKeyHero(side: "player" | "enemy"): string {
  return `hero:${side}`;
}

export function targetToKey(t: TargetRef): string {
  if (t.kind === "hero") return entityKeyHero(t.side);
  return entityKeyMinion(t.uid);
}

let fxSeq = 0;
export function nextFxId(): number {
  fxSeq += 1;
  return fxSeq;
}

export function meleeFx(opts: {
  fromKey: string;
  toKey: string;
  damage: number;
  returnDamage: number;
  artSrc?: string;
}): FxEvent {
  const big = opts.damage >= 5;
  return {
    id: nextFxId(),
    kind: "melee",
    fromKey: opts.fromKey,
    toKey: opts.toKey,
    damage: opts.damage,
    returnDamage: opts.returnDamage,
    artSrc: opts.artSrc,
    durationMs: big ? 520 : 420,
    trauma: Math.min(1, 0.22 + opts.damage * 0.06),
  };
}

export function spellFx(opts: {
  fromKey: string;
  toKey: string;
  damage?: number;
  heal?: number;
  school?: FxEvent["school"];
  artSrc?: string;
}): FxEvent {
  return {
    id: nextFxId(),
    kind: "spell",
    fromKey: opts.fromKey,
    toKey: opts.toKey,
    damage: opts.damage,
    heal: opts.heal,
    school: opts.school,
    artSrc: opts.artSrc,
    durationMs: 480,
    trauma: opts.damage ? Math.min(1, 0.18 + opts.damage * 0.05) : 0.08,
  };
}

export function summonFx(opts: { toKey: string; artSrc?: string }): FxEvent {
  return {
    id: nextFxId(),
    kind: "summon",
    fromKey: opts.toKey,
    toKey: opts.toKey,
    artSrc: opts.artSrc,
    durationMs: 360,
    trauma: 0.06,
  };
}

/** Frame-rate-correct wait using rAF (stays in sync with display refresh). */
export function waitFrames(ms: number, signal?: { cancelled: boolean }): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      if (signal?.cancelled) {
        resolve();
        return;
      }
      if (now - start >= ms) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** Prefer compositor-friendly motion; honor reduced-motion. */
export function motionEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function schoolColor(school?: FxEvent["school"]): string {
  switch (school) {
    case "ember":
      return "#c4844a";
    case "frost":
      return "#6a9ad0";
    case "shadow":
      return "#8a6a9a";
    case "nature":
      return "#5a9a6e";
    case "arcane":
      return "#7a9ad0";
    case "steel":
    default:
      return "#9aa3b2";
  }
}
