import type { Keyword, SpellEffect, TargetRef } from "./types";

/** Presentation-only combat FX — never mutates game math. */

export type FxKind =
  | "melee"
  | "spell"
  | "summon"
  | "heal"
  | "hitstop"
  | "buff"
  | "dominus"
  | "aegis"
  | "beam";

export type FxSchool =
  | "steel"
  | "ember"
  | "frost"
  | "shadow"
  | "nature"
  | "arcane";

export type BeamStyle =
  | "slash"
  | "laser"
  | "frost_bolt"
  | "shadow_bolt"
  | "nature_vine"
  | "ember_orb"
  | "arcane_beam"
  | "dominus_ring"
  | "heal_pulse"
  | "aegis_shell";

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
  school?: FxSchool;
  /** Art path for projectile portrait */
  artSrc?: string;
  /** Duration hint ms */
  durationMs: number;
  /** Screen shake trauma 0–1 */
  trauma: number;
  /** Card identity for custom VFX banners */
  cardId?: string;
  cardName?: string;
  cardText?: string;
  keywords?: Keyword[];
  spellKind?: SpellEffect["kind"];
  /** Short combat callout e.g. "LASER EDGE · 3 dmg" */
  banner?: string;
  detail?: string;
  beam?: BeamStyle;
  aoe?: boolean;
  /** Micro hit-stop freeze ms (presentation) */
  hitStopMs?: number;
  /** Particle burst budget hint (scaled by graphics profile) */
  particles?: number;
  /** Residual trail after beam (ms) */
  residualMs?: number;
  /** Impact bloom scale */
  bloom?: number;
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

export function schoolToBeam(
  school?: FxSchool,
  spellKind?: SpellEffect["kind"],
): BeamStyle {
  if (spellKind === "dominus_reximus") return "dominus_ring";
  if (spellKind === "heal") return "heal_pulse";
  if (spellKind === "aegis") return "aegis_shell";
  if (spellKind === "buff" || spellKind === "buff_all_friendly")
    return "nature_vine";
  switch (school) {
    case "ember":
      return "ember_orb";
    case "frost":
      return "frost_bolt";
    case "shadow":
      return "shadow_bolt";
    case "nature":
      return "nature_vine";
    case "arcane":
      return "arcane_beam";
    case "steel":
      return "slash";
    default:
      return "laser";
  }
}

function spellBanner(
  name: string,
  spell: SpellEffect | undefined,
  dmg?: number,
  heal?: number,
): string {
  if (!spell) return name;
  switch (spell.kind) {
    case "damage":
      return `${name} · ${dmg ?? spell.amount} dmg`;
    case "damage_and_draw":
      return `${name} · ${dmg ?? spell.damage} dmg + draw`;
    case "damage_heal":
      return `${name} · ${dmg ?? spell.damage} dmg / +${heal ?? spell.heal} HP`;
    case "heal":
      return `${name} · +${heal ?? spell.amount} HP`;
    case "buff":
      return `${name} · +${spell.attack}/+${spell.health}`;
    case "buff_all_friendly":
      return `${name} · all +${spell.attack}/+${spell.health}`;
    case "draw":
      return `${name} · draw ${spell.count}`;
    case "spell_power":
      return `${name} · +${spell.amount} SP`;
    case "aegis":
      return `${name} · Aegis shield`;
    case "dominus_reximus":
      return `${name} · DOMINUS PROTOCOL`;
    default:
      return name;
  }
}

function dmgWeight(dmg: number): {
  durationMs: number;
  trauma: number;
  hitStopMs: number;
  particles: number;
  residualMs: number;
  bloom: number;
} {
  const big = dmg >= 6;
  const lethal = dmg >= 8;
  const overkill = dmg >= 12;
  return {
    durationMs: overkill ? 760 : lethal ? 700 : big ? 600 : 500,
    trauma: Math.min(1, 0.22 + dmg * 0.07),
    hitStopMs: overkill ? 88 : lethal ? 72 : big ? 48 : dmg >= 3 ? 26 : 0,
    particles: overkill ? 64 : lethal ? 52 : big ? 36 : 22,
    residualMs: overkill ? 520 : big ? 440 : 300,
    bloom: overkill ? 1.55 : lethal ? 1.4 : big ? 1.15 : 0.9,
  };
}

export function meleeFx(opts: {
  fromKey: string;
  toKey: string;
  damage: number;
  returnDamage: number;
  artSrc?: string;
  cardId?: string;
  cardName?: string;
  cardText?: string;
  keywords?: Keyword[];
  school?: FxSchool;
}): FxEvent {
  const w = dmgWeight(opts.damage);
  const name = opts.cardName ?? "Strike";
  const kw = opts.keywords?.length
    ? ` · ${opts.keywords.map((k) => k.toUpperCase()).join(" ")}`
    : "";
  const beam: BeamStyle =
    opts.school === "arcane" || opts.school === "ember"
      ? "laser"
      : opts.school === "frost"
        ? "frost_bolt"
        : opts.school === "shadow"
          ? "shadow_bolt"
          : "slash";
  return {
    id: nextFxId(),
    kind: "melee",
    fromKey: opts.fromKey,
    toKey: opts.toKey,
    damage: opts.damage,
    returnDamage: opts.returnDamage,
    artSrc: opts.artSrc,
    school: opts.school ?? "steel",
    cardId: opts.cardId,
    cardName: opts.cardName,
    cardText: opts.cardText,
    keywords: opts.keywords,
    banner: `${name} · ${opts.damage} ATK${kw}`,
    detail: opts.cardText,
    beam,
    durationMs: w.durationMs,
    trauma: w.trauma,
    hitStopMs: w.hitStopMs,
    particles: w.particles,
    residualMs: w.residualMs,
    bloom: w.bloom,
  };
}

export function spellFx(opts: {
  fromKey: string;
  toKey: string;
  damage?: number;
  heal?: number;
  school?: FxSchool;
  artSrc?: string;
  cardId?: string;
  cardName?: string;
  cardText?: string;
  keywords?: Keyword[];
  spell?: SpellEffect;
  aoe?: boolean;
}): FxEvent {
  const spellKind = opts.spell?.kind;
  const isDominus = spellKind === "dominus_reximus";
  const isHeal =
    !!opts.heal &&
    opts.heal > 0 &&
    !(opts.damage && opts.damage > 0) &&
    (spellKind === "heal" || !spellKind);
  const isBuff =
    spellKind === "buff" ||
    spellKind === "buff_all_friendly" ||
    spellKind === "aegis";
  const kind: FxKind = isDominus
    ? "dominus"
    : isHeal
      ? "heal"
      : isBuff
        ? spellKind === "aegis"
          ? "aegis"
          : "buff"
        : opts.school === "arcane" || opts.school === "ember"
          ? "beam"
          : "spell";

  const dmg = opts.damage ?? 0;
  const w = dmgWeight(Math.max(dmg, isDominus ? 10 : opts.aoe ? 5 : 2));

  return {
    id: nextFxId(),
    kind,
    fromKey: opts.fromKey,
    toKey: opts.toKey,
    damage: opts.damage,
    heal: opts.heal,
    school: opts.school,
    artSrc: opts.artSrc,
    cardId: opts.cardId,
    cardName: opts.cardName,
    cardText: opts.cardText,
    keywords: opts.keywords,
    spellKind,
    banner: spellBanner(
      opts.cardName ?? "Protocol",
      opts.spell,
      opts.damage,
      opts.heal,
    ),
    detail: opts.cardText ?? opts.spell?.kind,
    beam: schoolToBeam(opts.school, spellKind),
    aoe: opts.aoe,
    durationMs: isDominus ? 820 : opts.aoe ? 680 : w.durationMs + 40,
    trauma: isDominus
      ? 0.62
      : opts.damage
        ? w.trauma
        : isHeal
          ? 0.06
          : 0.12,
    hitStopMs: isDominus ? 90 : w.hitStopMs,
    particles: isDominus ? 64 : opts.aoe ? 44 : w.particles,
    residualMs: isDominus ? 560 : w.residualMs + 80,
    bloom: isDominus ? 1.6 : w.bloom,
  };
}

export function summonFx(opts: {
  toKey: string;
  artSrc?: string;
  cardId?: string;
  cardName?: string;
  cardText?: string;
  school?: FxSchool;
  keywords?: Keyword[];
}): FxEvent {
  const name = opts.cardName ?? "Deploy";
  return {
    id: nextFxId(),
    kind: "summon",
    fromKey: opts.toKey,
    toKey: opts.toKey,
    artSrc: opts.artSrc,
    cardId: opts.cardId,
    cardName: opts.cardName,
    cardText: opts.cardText,
    school: opts.school,
    keywords: opts.keywords,
    banner: `${name} · ONLINE`,
    detail: opts.cardText,
    beam: "arcane_beam",
    durationMs: 440,
    trauma: 0.1,
    hitStopMs: 16,
    particles: 22,
    residualMs: 260,
    bloom: 0.9,
  };
}

/** Frame-rate-correct wait using rAF (stays in sync with display refresh). */
export function waitFrames(
  ms: number,
  signal?: { cancelled: boolean },
): Promise<void> {
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
      return "#e07838";
    case "frost":
      return "#5eb0e8";
    case "shadow":
      return "#a070c8";
    case "nature":
      return "#48b86a";
    case "arcane":
      return "#6a9ef0";
    case "steel":
    default:
      return "#b0b8c8";
  }
}

export function schoolGlow(school?: FxEvent["school"]): string {
  switch (school) {
    case "ember":
      return "rgba(224,120,56,0.85)";
    case "frost":
      return "rgba(94,176,232,0.85)";
    case "shadow":
      return "rgba(160,112,200,0.85)";
    case "nature":
      return "rgba(72,184,106,0.85)";
    case "arcane":
      return "rgba(106,158,240,0.85)";
    case "steel":
    default:
      return "rgba(176,184,200,0.8)";
  }
}

export function beamLabel(beam?: BeamStyle): string {
  switch (beam) {
    case "laser":
      return "Discombobulator Beam";
    case "arcane_beam":
      return "Arc Laser";
    case "frost_bolt":
      return "Cryo Bolt";
    case "ember_orb":
      return "Plasma Orb";
    case "shadow_bolt":
      return "Void Siphon";
    case "nature_vine":
      return "Bio Weave";
    case "dominus_ring":
      return "Dominus Field";
    case "heal_pulse":
      return "Repair Pulse";
    case "aegis_shell":
      return "Aegis Shell";
    case "slash":
    default:
      return "Blade Clash";
  }
}
