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
  | "aegis_shell"
  | "ion_lance"
  | "photon_grid"
  | "rail_line"
  | "lifesteal_siphon"
  | "grav_well"
  | "swarm_cloud"
  | "nova_burst"
  | "singularity";

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
  /** Secondary residual ring count (presentation) */
  rings?: number;
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
  cardId?: string,
): BeamStyle {
  const id = (cardId ?? "").toLowerCase();
  if (spellKind === "dominus_reximus") return "dominus_ring";
  if (spellKind === "heal") return "heal_pulse";
  if (spellKind === "aegis") return "aegis_shell";
  if (spellKind === "buff" || spellKind === "buff_all_friendly")
    return "nature_vine";
  if (id.includes("grav") || id.includes("singularity")) return "grav_well";
  if (id.includes("singularity")) return "singularity";
  if (id.includes("swarm") || id.includes("nano")) return "swarm_cloud";
  if (id.includes("nova") || id.includes("cataclysm")) return "nova_burst";
  if (id.includes("ion")) return "ion_lance";
  if (id.includes("photon") || id.includes("barrage")) return "photon_grid";
  if (id.includes("rail") || id.includes("sniper")) return "rail_line";
  if (id.includes("blood") || id.includes("leech") || id.includes("pact") || id.includes("harvester"))
    return "lifesteal_siphon";
  if (id.includes("plasma") || id.includes("saber")) return "ember_orb";
  if (id.includes("orbital") || id.includes("scan")) return "arcane_beam";
  if (id.includes("matrix") || id.includes("bastion") || id.includes("phalanx") || id.includes("shield"))
    return "aegis_shell";
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
  rings: number;
} {
  const big = dmg >= 6;
  const lethal = dmg >= 8;
  const overkill = dmg >= 12;
  return {
    durationMs: overkill ? 820 : lethal ? 740 : big ? 640 : 520,
    trauma: Math.min(1, 0.24 + dmg * 0.075),
    hitStopMs: overkill ? 96 : lethal ? 78 : big ? 52 : dmg >= 3 ? 28 : 0,
    particles: overkill ? 78 : lethal ? 60 : big ? 42 : 26,
    residualMs: overkill ? 580 : big ? 480 : 320,
    bloom: overkill ? 1.65 : lethal ? 1.45 : big ? 1.2 : 0.95,
    rings: overkill ? 3 : lethal ? 2 : big ? 2 : 1,
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
  const id = (opts.cardId ?? "").toLowerCase();
  const hasLs = opts.keywords?.includes("lifesteal");
  let beam: BeamStyle =
    opts.school === "arcane" || opts.school === "ember"
      ? "laser"
      : opts.school === "frost"
        ? "frost_bolt"
        : opts.school === "shadow"
          ? "shadow_bolt"
          : "slash";
  if (id.includes("rail") || id.includes("sniper")) beam = "rail_line";
  if (id.includes("ion")) beam = "ion_lance";
  if (id.includes("plasma") || id.includes("saber")) beam = "ember_orb";
  if (id.includes("swarm") || id.includes("flicker")) beam = "swarm_cloud";
  if (id.includes("bastion") || id.includes("phalanx")) beam = "aegis_shell";
  if (hasLs) beam = "lifesteal_siphon";
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
    durationMs: w.durationMs + (hasLs ? 40 : 0),
    trauma: w.trauma,
    hitStopMs: w.hitStopMs,
    particles: w.particles + (hasLs ? 12 : 0),
    residualMs: w.residualMs + (hasLs ? 80 : 0),
    bloom: w.bloom + (hasLs ? 0.12 : 0),
    rings: w.rings + (hasLs ? 1 : 0),
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
  const beam = schoolToBeam(opts.school, spellKind, opts.cardId);
  const heavyBeam =
    beam === "nova_burst" ||
    beam === "grav_well" ||
    beam === "singularity" ||
    beam === "photon_grid";

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
    beam,
    aoe: opts.aoe,
    durationMs: isDominus ? 860 : heavyBeam ? 780 : opts.aoe ? 720 : w.durationMs + 40,
    trauma: isDominus
      ? 0.68
      : heavyBeam
        ? Math.min(1, w.trauma + 0.12)
        : opts.damage
          ? w.trauma
          : isHeal
            ? 0.06
            : 0.14,
    hitStopMs: isDominus ? 96 : heavyBeam ? Math.max(w.hitStopMs, 56) : w.hitStopMs,
    particles: isDominus ? 78 : heavyBeam ? 68 : opts.aoe ? 52 : w.particles,
    residualMs: isDominus ? 600 : heavyBeam ? 560 : w.residualMs + 100,
    bloom: isDominus ? 1.7 : heavyBeam ? 1.55 : w.bloom,
    rings: isDominus ? 4 : heavyBeam ? 3 : opts.aoe ? 3 : w.rings,
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
  const reborn = opts.keywords?.includes("reborn");
  const shielded =
    opts.keywords?.includes("shield") || opts.keywords?.includes("taunt");
  const id = (opts.cardId ?? "").toLowerCase();
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
    banner: `${name} · ${reborn ? "REBORN" : shielded ? "FORTIFIED" : "ONLINE"}`,
    detail: opts.cardText,
    beam: reborn
      ? "dominus_ring"
      : shielded
        ? "aegis_shell"
        : id.includes("swarm")
          ? "swarm_cloud"
          : "arcane_beam",
    durationMs: reborn ? 520 : shielded ? 500 : 460,
    trauma: reborn ? 0.16 : shielded ? 0.12 : 0.1,
    hitStopMs: reborn ? 28 : 16,
    particles: reborn ? 36 : shielded ? 32 : 26,
    residualMs: reborn ? 360 : shielded ? 320 : 280,
    bloom: reborn ? 1.2 : shielded ? 1.1 : 0.95,
    rings: reborn ? 2 : shielded ? 2 : 1,
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
    case "ion_lance":
      return "Ion Lance";
    case "photon_grid":
      return "Photon Grid";
    case "rail_line":
      return "Rail Line";
    case "lifesteal_siphon":
      return "Siphon Beam";
    case "grav_well":
      return "Gravity Well";
    case "swarm_cloud":
      return "Nanite Swarm";
    case "nova_burst":
      return "Nova Burst";
    case "singularity":
      return "Singularity";
    case "slash":
    default:
      return "Blade Clash";
  }
}
