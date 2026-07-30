import type { CardDef } from "./types";

/** Full collectible set — modern combat high-tech + medieval physics theme. */
export const CARD_POOL: CardDef[] = [
  {
    id: "squire",
    name: "Pulse Recruit",
    cost: 1,
    type: "minion",
    attack: 1,
    health: 2,
    text: "1/2 for 1. Light powered armor.",
    art: "steel",
  },
  {
    id: "spark_imp",
    name: "Plasma Spark",
    cost: 1,
    type: "minion",
    attack: 2,
    health: 1,
    text: "2/1 Charge drone. Aggressive open.",
    keywords: ["charge"],
    art: "ember",
  },
  {
    id: "warden",
    name: "Riot Bastion",
    cost: 2,
    type: "minion",
    attack: 1,
    health: 3,
    text: "Taunt. Energy tower shield.",
    keywords: ["taunt"],
    art: "steel",
  },
  {
    id: "arc_blade",
    name: "Laser Edge",
    cost: 2,
    type: "minion",
    attack: 3,
    health: 2,
    text: "3/2 laser blades. Efficient attacker.",
    art: "arcane",
  },
  {
    id: "frost_hound",
    name: "Cryo Hound",
    cost: 2,
    type: "minion",
    attack: 2,
    health: 2,
    text: "Rush — frost laser pet.",
    keywords: ["rush"],
    art: "frost",
  },
  {
    id: "shieldbearer",
    name: "Aegis Operator",
    cost: 3,
    type: "minion",
    attack: 2,
    health: 3,
    text: "Shield projector absorbs first hit.",
    keywords: ["shield"],
    art: "steel",
  },
  {
    id: "blood_leech",
    name: "Nano Leech",
    cost: 3,
    type: "minion",
    attack: 2,
    health: 3,
    text: "Lifesteal siphon beams.",
    keywords: ["lifesteal"],
    art: "shadow",
  },
  {
    id: "iron_colossus",
    name: "Siege Chassis",
    cost: 4,
    type: "minion",
    attack: 3,
    health: 5,
    text: "Taunt. 3/5 laser artillery wall.",
    keywords: ["taunt"],
    art: "steel",
  },
  {
    id: "storm_rider",
    name: "Storm Drone",
    cost: 4,
    type: "minion",
    attack: 4,
    health: 3,
    text: "Charge hover-bike with railguns.",
    keywords: ["charge"],
    art: "frost",
  },
  {
    id: "grove_keeper",
    name: "Bio-Forge Unit",
    cost: 3,
    type: "minion",
    attack: 2,
    health: 4,
    text: "Sturdy 2/4 nanite vines.",
    art: "nature",
  },
  {
    id: "void_knight",
    name: "Void Operative",
    cost: 5,
    type: "minion",
    attack: 4,
    health: 5,
    text: "Shield + void plasma blade.",
    keywords: ["shield"],
    art: "shadow",
  },
  {
    id: "ember_giant",
    name: "Magma Titan",
    cost: 6,
    type: "minion",
    attack: 6,
    health: 6,
    text: "6/6 lava reactor giant.",
    art: "ember",
  },
  {
    id: "prism_titan",
    name: "Prism Battery",
    cost: 7,
    type: "minion",
    attack: 7,
    health: 7,
    text: "7/7 holographic prism closer.",
    keywords: ["taunt"],
    art: "arcane",
  },
  {
    id: "night_stalker",
    name: "Night Ops",
    cost: 5,
    type: "minion",
    attack: 5,
    health: 3,
    text: "Lifesteal laser daggers. Charge.",
    keywords: ["lifesteal", "charge"],
    art: "shadow",
  },
  {
    id: "math_golem",
    name: "Logic Core",
    cost: 4,
    type: "minion",
    attack: 4,
    health: 4,
    text: "Perfect square. 4/4 equation reactor.",
    art: "arcane",
  },
  {
    id: "bolt",
    name: "Arc Bolt",
    cost: 1,
    type: "spell",
    text: "Deal 2 damage (orbital arc laser).",
    spell: { kind: "damage", amount: 2, target: "any" },
    art: "arcane",
  },
  {
    id: "firelance",
    name: "Discombobulator Beam",
    cost: 2,
    type: "spell",
    text: "Deal 3 damage with a multi-frequency laser.",
    spell: { kind: "damage", amount: 3, target: "enemy" },
    art: "ember",
  },
  {
    id: "reckoning",
    name: "Final Reckoning",
    cost: 4,
    type: "spell",
    text: "Deal 4 damage — judgment laser.",
    spell: { kind: "damage", amount: 4, target: "any" },
    art: "arcane",
  },
  {
    id: "sweep",
    name: "Sweep Laser",
    cost: 3,
    type: "spell",
    text: "Deal 2 to all enemy minions (laser grid).",
    spell: { kind: "damage", amount: 2, target: "all_enemy_minions" },
    art: "frost",
  },
  {
    id: "cataclysm",
    name: "Orbital Cataclysm",
    cost: 5,
    type: "spell",
    text: "Deal 3 to all enemies from orbit.",
    spell: { kind: "damage", amount: 3, target: "all_enemies" },
    art: "ember",
  },
  {
    id: "mend",
    name: "Nano Mend",
    cost: 2,
    type: "spell",
    text: "Restore 5 health (medical laser).",
    spell: { kind: "heal", amount: 5, target: "friendly_hero" },
    art: "nature",
  },
  {
    id: "temper",
    name: "Temper Field",
    cost: 2,
    type: "spell",
    text: "Give a friendly minion +2/+2 forge lasers.",
    spell: { kind: "buff", attack: 2, health: 2, target: "friendly_minion" },
    art: "steel",
  },
  {
    id: "insight",
    name: "Tactical Insight",
    cost: 1,
    type: "spell",
    text: "Draw 2 cards — HUD intel burst.",
    spell: { kind: "draw", count: 2 },
    art: "arcane",
  },
  {
    id: "scorch_study",
    name: "Scorch Analysis",
    cost: 3,
    type: "spell",
    text: "Deal 2 to an enemy. Draw a card.",
    spell: { kind: "damage_and_draw", damage: 2, draw: 1, target: "enemy" },
    art: "ember",
  },
  {
    id: "precise_cut",
    name: "Precision Laser",
    cost: 3,
    type: "spell",
    text: "Deal 5 damage to an enemy minion.",
    spell: { kind: "damage", amount: 5, target: "enemy_minion" },
    art: "shadow",
  },

  // Store exclusives
  {
    id: "dominus_reximus",
    name: "Dominus Reximus",
    cost: 10,
    type: "spell",
    storeExclusive: true,
    text:
      "Give a friendly Taunt minion +50/+50, Immune, and Reborn. Your other minions get +10/+10 and Immune this turn.",
    spell: {
      kind: "dominus_reximus",
      targetAttack: 50,
      targetHealth: 50,
      othersAttack: 10,
      othersHealth: 10,
    },
    art: "steel",
  },
  {
    id: "arc_catalyst",
    name: "Arc Catalyst",
    cost: 3,
    type: "spell",
    storeExclusive: true,
    text: "Gain +2 Spell Power (stacks with laser damage spells).",
    spell: { kind: "spell_power", amount: 2 },
    art: "arcane",
  },
  {
    id: "amplify_core",
    name: "Amplify Core",
    cost: 2,
    type: "spell",
    storeExclusive: true,
    text: "Gain +1 Spell Power (stacks). Draw a card.",
    spell: { kind: "spell_power", amount: 1, draw: 1 },
    art: "arcane",
  },
  {
    id: "overcharge",
    name: "Overcharge",
    cost: 4,
    type: "spell",
    storeExclusive: true,
    text: "Gain +3 Spell Power (stacks).",
    spell: { kind: "spell_power", amount: 3 },
    art: "ember",
  },
  {
    id: "titan_wrath",
    name: "Titan Wrath",
    cost: 6,
    type: "spell",
    storeExclusive: true,
    text: "Deal 6 (+Spell Power) — titan laser.",
    spell: { kind: "damage", amount: 6, target: "any" },
    art: "ember",
  },
  {
    id: "nova_hex",
    name: "Nova Hex",
    cost: 4,
    type: "spell",
    storeExclusive: true,
    text: "Deal 2 (+Spell Power) to all enemies.",
    spell: { kind: "damage", amount: 2, target: "all_enemies" },
    art: "shadow",
  },
  {
    id: "blood_pact",
    name: "Blood Pact",
    cost: 3,
    type: "spell",
    storeExclusive: true,
    text: "Deal 4 (+Spell Power). Restore 4 to your hero.",
    spell: { kind: "damage_heal", damage: 4, heal: 4, target: "enemy" },
    art: "shadow",
  },
  {
    id: "legion_horn",
    name: "Legion Signal",
    cost: 4,
    type: "spell",
    storeExclusive: true,
    text: "Give all friendly minions +2/+2 broadcast.",
    spell: { kind: "buff_all_friendly", attack: 2, health: 2 },
    art: "steel",
  },
  {
    id: "mirror_aegis",
    name: "Mirror Aegis",
    cost: 2,
    type: "spell",
    storeExclusive: true,
    text: "Give a friendly minion Immune this turn and Shield.",
    spell: { kind: "aegis", shield: true },
    art: "frost",
  },
  {
    id: "void_sovereign",
    name: "Void Sovereign",
    cost: 8,
    type: "minion",
    storeExclusive: true,
    attack: 6,
    health: 8,
    text: "Taunt. Immune. Reborn. Apex void armor.",
    keywords: ["taunt", "immune", "reborn"],
    art: "shadow",
  },
  {
    id: "siege_titan",
    name: "Siege Titan",
    cost: 7,
    type: "minion",
    storeExclusive: true,
    attack: 8,
    health: 10,
    text: "Taunt. 8/10 siege laser wall.",
    keywords: ["taunt"],
    art: "steel",
  },
  {
    id: "reaper_wraith",
    name: "Reaper Wraith",
    cost: 5,
    type: "minion",
    storeExclusive: true,
    attack: 6,
    health: 4,
    text: "Lifesteal. Reborn. Phase lasers.",
    keywords: ["lifesteal", "reborn"],
    art: "shadow",
  },
  {
    id: "grav_anchor",
    name: "Grav Anchor",
    cost: 4,
    type: "minion",
    storeExclusive: true,
    attack: 3,
    health: 7,
    text: "Taunt. Shield. Gravity projectors.",
    keywords: ["taunt", "shield"],
    art: "frost",
  },
  {
    id: "spellblade",
    name: "Spellblade",
    cost: 5,
    type: "minion",
    storeExclusive: true,
    attack: 5,
    health: 4,
    text: "Charge. Lifesteal. Arc-laser edge.",
    keywords: ["charge", "lifesteal"],
    art: "arcane",
  },
];

export const CARD_MAP: Record<string, CardDef> = Object.fromEntries(
  CARD_POOL.map((c) => [c.id, c]),
);

export function getCard(id: string): CardDef {
  const c = CARD_MAP[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

export function cardArtSrc(id: string): string {
  return `/cards/${id}.jpg`;
}

export function classLabel(art: CardDef["art"]): string {
  switch (art) {
    case "steel":
      return "Ironclad";
    case "ember":
      return "Plasma";
    case "frost":
      return "Cryo";
    case "shadow":
      return "Voidops";
    case "nature":
      return "Bioforge";
    case "arcane":
      return "Arctech";
  }
}

export function typeLabel(type: CardDef["type"]): string {
  return type === "minion" ? "Unit" : "Protocol";
}

export function buildStarterDeck(): string[] {
  return [
    "squire",
    "squire",
    "spark_imp",
    "spark_imp",
    "warden",
    "warden",
    "arc_blade",
    "arc_blade",
    "frost_hound",
    "frost_hound",
    "shieldbearer",
    "blood_leech",
    "grove_keeper",
    "grove_keeper",
    "iron_colossus",
    "storm_rider",
    "math_golem",
    "math_golem",
    "void_knight",
    "ember_giant",
    "night_stalker",
    "prism_titan",
    "bolt",
    "bolt",
    "firelance",
    "firelance",
    "sweep",
    "mend",
    "insight",
    "temper",
    "scorch_study",
    "precise_cut",
    "reckoning",
    "cataclysm",
  ];
}

export function isStoreExclusive(id: string): boolean {
  return !!CARD_MAP[id]?.storeExclusive;
}

export function minionValueScore(attack: number, health: number, cost: number): number {
  if (cost <= 0) return attack + health;
  return Math.round(((attack + health) / cost) * 100) / 100;
}

export function keywordLabel(k: string): string {
  switch (k) {
    case "taunt":
      return "Taunt";
    case "charge":
      return "Charge";
    case "shield":
      return "Shield";
    case "lifesteal":
      return "Lifesteal";
    case "rush":
      return "Rush";
    case "immune":
      return "Immune";
    case "reborn":
      return "Reborn";
    default:
      return k;
  }
}
