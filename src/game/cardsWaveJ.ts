import type { CardDef } from "./types";
import { CARD_ART_ALIAS, CARD_MAP, CARD_POOL } from "./cards";

/** Wave J exclusives — 2026.08.15 maint (version held at 1.06.666). */
export const WAVE_J_CARDS: CardDef[] = [
  {
    id: "iridium_lance",
    name: "Iridium Lance",
    cost: 4,
    type: "spell",
    storeExclusive: true,
    text: "Deal 5 (+Spell Power) — platinum-dense kill-spike.",
    spell: { kind: "damage", amount: 5, target: "enemy" },
    art: "steel",
  },
  {
    id: "quartz_sentinel",
    name: "Quartz Sentinel",
    cost: 4,
    type: "minion",
    storeExclusive: true,
    attack: 2,
    health: 6,
    text: "Taunt. Shield. Crystal-lattice perimeter turret.",
    keywords: ["taunt", "shield"],
    art: "arcane",
  },
  {
    id: "magma_ram",
    name: "Magma Ram",
    cost: 5,
    type: "minion",
    storeExclusive: true,
    attack: 5,
    health: 4,
    text: "Charge. Core-forged breach chassis.",
    keywords: ["charge"],
    art: "ember",
  },
  {
    id: "nimbus_burst",
    name: "Nimbus Burst",
    cost: 5,
    type: "spell",
    storeExclusive: true,
    text: "Deal 3 (+Spell Power) to all enemies. Storm-cell flare.",
    spell: { kind: "damage", amount: 3, target: "all_enemies" },
    art: "frost",
  },
  {
    id: "axiom_drone",
    name: "Axiom Drone",
    cost: 3,
    type: "minion",
    storeExclusive: true,
    attack: 2,
    health: 3,
    text: "Rush. Reborn. Logic-proof escort that never stays down.",
    keywords: ["rush", "reborn"],
    art: "arcane",
  },
  {
    id: "quartz_coil",
    name: "Quartz Coil",
    cost: 4,
    type: "minion",
    storeExclusive: true,
    attack: 3,
    health: 5,
    text: "Taunt. Piezo-resonant crystal tower.",
    keywords: ["taunt"],
    art: "arcane",
  },
  {
    id: "iridium_key",
    name: "Iridium Key",
    cost: 3,
    type: "spell",
    storeExclusive: true,
    text: "Gain +2 Spell Power. Draw 1 — dense-metal cipher unlock.",
    spell: { kind: "spell_power", amount: 2, draw: 1 },
    art: "steel",
  },
  {
    id: "magma_crown",
    name: "Magma Crown",
    cost: 5,
    type: "spell",
    storeExclusive: true,
    text: "Give all friendly minions +2/+2 furnace command.",
    spell: { kind: "buff_all_friendly", attack: 2, health: 2 },
    art: "ember",
  },
  {
    id: "nimbus_runner",
    name: "Nimbus Runner",
    cost: 3,
    type: "minion",
    storeExclusive: true,
    attack: 4,
    health: 2,
    text: "Charge. Storm-sprint infantry.",
    keywords: ["charge"],
    art: "frost",
  },
  {
    id: "axiom_throne",
    name: "Axiom Throne",
    cost: 8,
    type: "minion",
    storeExclusive: true,
    attack: 8,
    health: 9,
    text: "Taunt. Shield. Reborn. Capital proof-engine siege seat.",
    keywords: ["taunt", "shield", "reborn"],
    art: "arcane",
  },
];

/** Reuse existing portraits — no duplicate JPGs (APK budget). */
export const WAVE_J_ART_ALIAS: Record<string, string> = {
  iridium_lance: "ferro_lance",
  quartz_sentinel: "pulse_sentinel",
  magma_ram: "kinetic_breaker",
  nimbus_burst: "corona_burst",
  axiom_drone: "echo_drone",
  quartz_coil: "hex_lattice",
  iridium_key: "orbital_scan",
  magma_crown: "legion_beacon",
  nimbus_runner: "flicker_blade",
  axiom_throne: "dominion_core",
};

export const STORE_STOCK_WAVE_J_IDS = [
  "iridium_lance",
  "quartz_sentinel",
  "magma_ram",
  "nimbus_burst",
  "axiom_drone",
  "quartz_coil",
  "iridium_key",
  "magma_crown",
  "nimbus_runner",
  "axiom_throne",
] as const;

let installed = false;

/** Idempotent — mutates the live pool so Wave J is collectible without rewriting cards.ts. */
export function installWaveJ(): void {
  if (installed) return;
  installed = true;
  for (const c of WAVE_J_CARDS) {
    if (!CARD_MAP[c.id]) {
      CARD_POOL.push(c);
      CARD_MAP[c.id] = c;
    }
    const alias = WAVE_J_ART_ALIAS[c.id];
    if (alias) CARD_ART_ALIAS[c.id] = alias;
  }
}

installWaveJ();
