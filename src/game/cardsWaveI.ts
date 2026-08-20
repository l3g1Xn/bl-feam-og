import type { CardDef } from "./types";
import { CARD_ART_ALIAS, CARD_MAP, CARD_POOL } from "./cards";

/** Wave I exclusives — 1.0.7 Cooked By Many (version held). */
export const WAVE_I_CARDS: CardDef[] = [
  {
    id: "cobalt_lance",
    name: "Cobalt Lance",
    cost: 4,
    type: "spell",
    storeExclusive: true,
    text: "Deal 5 (+Spell Power) — cryo-cobalt kill-spike.",
    spell: { kind: "damage", amount: 5, target: "enemy" },
    art: "frost",
  },
  {
    id: "graphene_sentinel",
    name: "Graphene Sentinel",
    cost: 4,
    type: "minion",
    storeExclusive: true,
    attack: 2,
    health: 6,
    text: "Taunt. Shield. Carbon-lattice perimeter turret.",
    keywords: ["taunt", "shield"],
    art: "steel",
  },
  {
    id: "sonic_ram",
    name: "Sonic Ram",
    cost: 5,
    type: "minion",
    storeExclusive: true,
    attack: 5,
    health: 4,
    text: "Charge. Harmonic-shock breach chassis.",
    keywords: ["charge"],
    art: "arcane",
  },
  {
    id: "helion_burst",
    name: "Helion Burst",
    cost: 5,
    type: "spell",
    storeExclusive: true,
    text: "Deal 3 (+Spell Power) to all enemies. Solar-core flare.",
    spell: { kind: "damage", amount: 3, target: "all_enemies" },
    art: "ember",
  },
  {
    id: "riftglass_drone",
    name: "Riftglass Drone",
    cost: 3,
    type: "minion",
    storeExclusive: true,
    attack: 2,
    health: 3,
    text: "Rush. Reborn. Fractured-glass escort that never stays down.",
    keywords: ["rush", "reborn"],
    art: "shadow",
  },
  {
    id: "sonic_coil",
    name: "Sonic Coil",
    cost: 4,
    type: "minion",
    storeExclusive: true,
    attack: 3,
    health: 5,
    text: "Taunt. Resonant-frequency tower.",
    keywords: ["taunt"],
    art: "arcane",
  },
  {
    id: "cobalt_key",
    name: "Cobalt Key",
    cost: 3,
    type: "spell",
    storeExclusive: true,
    text: "Gain +2 Spell Power. Draw 1 — frost cipher unlock.",
    spell: { kind: "spell_power", amount: 2, draw: 1 },
    art: "frost",
  },
  {
    id: "helion_crown",
    name: "Helion Crown",
    cost: 5,
    type: "spell",
    storeExclusive: true,
    text: "Give all friendly minions +2/+2 solar command.",
    spell: { kind: "buff_all_friendly", attack: 2, health: 2 },
    art: "ember",
  },
  {
    id: "graphene_runner",
    name: "Graphene Runner",
    cost: 3,
    type: "minion",
    storeExclusive: true,
    attack: 4,
    health: 2,
    text: "Charge. Ultra-light carbon infantry.",
    keywords: ["charge"],
    art: "steel",
  },
  {
    id: "riftglass_throne",
    name: "Riftglass Throne",
    cost: 8,
    type: "minion",
    storeExclusive: true,
    attack: 8,
    health: 9,
    text: "Taunt. Shield. Reborn. Capital fracture-glass siege seat.",
    keywords: ["taunt", "shield", "reborn"],
    art: "shadow",
  },
];

/** Dedicated Wave I portraits live at public/cards/<id>.jpg — do not alias them away. */
export const WAVE_I_ART_ALIAS: Record<string, string> = {};

export const STORE_STOCK_WAVE_I_IDS = [
  "cobalt_lance",
  "graphene_sentinel",
  "sonic_ram",
  "helion_burst",
  "riftglass_drone",
  "sonic_coil",
  "cobalt_key",
  "helion_crown",
  "graphene_runner",
  "riftglass_throne",
] as const;

let installed = false;

/** Idempotent — mutates the live pool so Wave I is collectible without rewriting cards.ts. */
export function installWaveI(): void {
  if (installed) return;
  installed = true;
  for (const c of WAVE_I_CARDS) {
    if (!CARD_MAP[c.id]) {
      CARD_POOL.push(c);
      CARD_MAP[c.id] = c;
    }
    const alias = WAVE_I_ART_ALIAS[c.id];
    if (alias) CARD_ART_ALIAS[c.id] = alias;
  }
}

installWaveI();
