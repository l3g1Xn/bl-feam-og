/**
 * Weekly store stock rotation — deterministic by UTC week.
 * Featured deals rotate without bumping package version.
 */
import {
  ALL_STOCK_WAVE_IDS,
  CARD_POOL,
  STORE_STOCK_WAVE_B_IDS,
  STORE_STOCK_WAVE_C_IDS,
  STORE_STOCK_WAVE_D_IDS,
  STORE_STOCK_WAVE_E_IDS,
  STORE_STOCK_WAVE_F_IDS,
  STORE_STOCK_WAVE_G_IDS,
  STORE_STOCK_WAVE_H_IDS,
  STORE_STOCK_WAVE_IDS,
  buildStarterDeck,
  getCard,
  isStoreExclusive,
} from "./cards";
import { STORE_STOCK_WAVE_I_IDS } from "./cardsWaveI";

export type RotatedOffer = {
  id: string;
  cardId: string;
  price: number;
  minLevel: number;
  featured: boolean;
  exclusive: boolean;
  /** Weekly spotlight deal (discount applied in livePrice path). */
  rotationDeal: boolean;
  dealPct: number;
  stockWave: boolean;
};

const STARTER_OWNED = new Set(buildStarterDeck());
const WAVE_SET = new Set<string>([
  ...(ALL_STOCK_WAVE_IDS as readonly string[]),
  ...(STORE_STOCK_WAVE_I_IDS as readonly string[]),
]);

function safeInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/** Level-scaled ticket price (before weekly deal). Shared with meta economy. */
export function ticketPrice(cardId: string, level: number): number {
  const c = getCard(cardId);
  const lv = safeInt(level, 1, 100, 1);
  const exclusive = isStoreExclusive(cardId);
  let base = 30 + c.cost * 18;
  if (exclusive) base = 90 + c.cost * 35;
  if (cardId === "dominus_reximus") base = 420;
  if (
    cardId === "dominion_core" ||
    cardId === "overlord_frame" ||
    cardId === "tungsten_throne" ||
    cardId === "riftglass_throne"
  )
    base = 380;
  base *= 2;
  if (
    cardId === "titan_edge" ||
    cardId === "omega_drone" ||
    cardId === "nano_swarm" ||
    cardId === "aegis_phalanx" ||
    cardId === "photon_barrage" ||
    cardId === "nova_core" ||
    cardId === "bastion_prime" ||
    cardId === "void_harvester" ||
    cardId === "singularity_bolt" ||
    cardId === "apex_colossus" ||
    cardId === "chrono_blade" ||
    cardId === "legion_beacon" ||
    cardId === "plasma_mortar" ||
    cardId === "prism_lance" ||
    cardId === "corona_burst" ||
    cardId === "obsidian_rex" ||
    cardId === "storm_lancer" ||
    cardId === "ferro_lance" ||
    cardId === "pulse_cascade" ||
    cardId === "laser_hydra" ||
    cardId === "dominion_core" ||
    cardId === "null_spear" ||
    cardId === "mag_rail_array" ||
    cardId === "kinetic_breaker" ||
    cardId === "overlord_frame" ||
    cardId === "volt_lance" ||
    cardId === "halo_burst" ||
    cardId === "tungsten_ram" ||
    cardId === "halo_crown" ||
    cardId === "tungsten_throne" ||
    cardId === "cobalt_lance" ||
    cardId === "helion_burst" ||
    cardId === "sonic_ram" ||
    cardId === "graphene_sentinel" ||
    cardId === "riftglass_throne"
  ) {
    base = Math.round(base * 1.08);
  }
  const discount = Math.min(0.35, (lv - 1) * 0.012);
  return safeInt(Math.round(base * (1 - discount)), 20, 9999, base);
}

/** ISO-ish UTC week key: YYYY-Www */
export function storeWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const WAVE_POOLS = [
  STORE_STOCK_WAVE_IDS,
  STORE_STOCK_WAVE_B_IDS,
  STORE_STOCK_WAVE_C_IDS,
  STORE_STOCK_WAVE_D_IDS,
  STORE_STOCK_WAVE_E_IDS,
  STORE_STOCK_WAVE_F_IDS,
  STORE_STOCK_WAVE_G_IDS,
  STORE_STOCK_WAVE_H_IDS,
  STORE_STOCK_WAVE_I_IDS,
] as const;

/** Cycle A → B → C → D → E → F → G → H → I by week hash so stock never stagnates. */
export function activeWavePool(week = storeWeekKey()): readonly string[] {
  const n = hashStr(week) % 9;
  return WAVE_POOLS[n]!;
}

/** Stable shuffle of exclusive card ids for this week. */
export function rotationOrder(week = storeWeekKey()): string[] {
  const exclusives = CARD_POOL.filter((c) => c.storeExclusive).map((c) => c.id);
  const scored = exclusives.map((id, i) => ({
    id,
    s: hashStr(`${week}:${id}:${i}`),
  }));
  scored.sort((a, b) => a.s - b.s || a.id.localeCompare(b.id));
  return scored.map((x) => x.id);
}

/** 3 spotlight deals each week — prefer active stock wave, inject one alt wave. */
export function weeklyDealIds(week = storeWeekKey()): string[] {
  const order = rotationOrder(week).filter((id) => id !== "dominus_reximus");
  const wave = activeWavePool(week);
  const waveFirst = [
    ...wave.filter((id) => order.includes(id)),
    ...order.filter((id) => !(wave as readonly string[]).includes(id)),
  ];
  const deals = waveFirst.slice(0, 3);
  const altPool = WAVE_POOLS.find((p) => p !== wave) ?? STORE_STOCK_WAVE_B_IDS;
  const alt = altPool.find((id) => !deals.includes(id));
  if (alt && deals.length >= 2) {
    deals[2] = alt;
  }
  return deals;
}

export function dealDiscountPct(cardId: string, week = storeWeekKey()): number {
  if (!weeklyDealIds(week).includes(cardId)) return 0;
  const n = hashStr(`${week}:deal:${cardId}`) % 11;
  return 12 + n;
}

export function minLevelFor(cardId: string): number {
  if (cardId === "dominus_reximus") return 5;
  if (
    cardId === "dominion_core" ||
    cardId === "overlord_frame" ||
    cardId === "tungsten_throne" ||
    cardId === "riftglass_throne"
  )
    return 5;
  if (
    cardId === "void_sovereign" ||
    cardId === "titan_edge" ||
    cardId === "omega_drone" ||
    cardId === "aegis_phalanx" ||
    cardId === "photon_barrage" ||
    cardId === "nova_core" ||
    cardId === "bastion_prime" ||
    cardId === "singularity_bolt" ||
    cardId === "apex_colossus" ||
    cardId === "legion_beacon" ||
    cardId === "obsidian_rex" ||
    cardId === "corona_burst" ||
    cardId === "prism_lance" ||
    cardId === "laser_hydra" ||
    cardId === "ferro_lance" ||
    cardId === "pulse_cascade" ||
    cardId === "null_spear" ||
    cardId === "mag_rail_array" ||
    cardId === "kinetic_breaker" ||
    cardId === "volt_lance" ||
    cardId === "halo_burst" ||
    cardId === "tungsten_ram" ||
    cardId === "cobalt_lance" ||
    cardId === "helion_burst" ||
    cardId === "sonic_ram" ||
    cardId === "graphene_sentinel"
  )
    return 4;
  if (
    cardId === "nano_swarm" ||
    cardId === "siege_titan" ||
    cardId === "ion_grid" ||
    cardId === "quantum_mend" ||
    cardId === "void_harvester" ||
    cardId === "shield_matrix" ||
    cardId === "grav_well" ||
    cardId === "chrono_blade" ||
    cardId === "iron_warden" ||
    cardId === "plasma_mortar" ||
    cardId === "void_pike" ||
    cardId === "storm_lancer" ||
    cardId === "helix_guard" ||
    cardId === "rift_cutter" ||
    cardId === "titan_clamp" ||
    cardId === "mirror_guard" ||
    cardId === "void_stitch" ||
    cardId === "frost_matrix" ||
    cardId === "aether_ward" ||
    cardId === "spectral_rider" ||
    cardId === "biosteel_golem" ||
    cardId === "shatter_node" ||
    cardId === "glyph_sentinel" ||
    cardId === "tesla_coil" ||
    cardId === "halo_crown" ||
    cardId === "orbit_drone" ||
    cardId === "sonic_coil" ||
    cardId === "cobalt_key" ||
    cardId === "helion_crown" ||
    cardId === "graphene_runner" ||
    cardId === "riftglass_drone"
  )
    return 3;
  if (isStoreExclusive(cardId)) return 2;
  return 1;
}

export function buildRotatedOffers(level = 1, week = storeWeekKey()): RotatedOffer[] {
  const deals = new Set(weeklyDealIds(week));
  const featuredSet = new Set([
    ...deals,
    ...rotationOrder(week).slice(0, 6),
    ...activeWavePool(week).slice(0, 4),
  ]);
  const offers: RotatedOffer[] = [];

  for (const c of CARD_POOL) {
    const exclusive = isStoreExclusive(c.id);
    const starter = STARTER_OWNED.has(c.id);
    if (!exclusive && starter) continue;

    const dealPct = exclusive ? dealDiscountPct(c.id, week) : 0;
    const base = ticketPrice(c.id, level);
    const price =
      dealPct > 0
        ? Math.max(20, Math.round(base * (1 - dealPct / 100)))
        : base;

    offers.push({
      id: `offer_${c.id}`,
      cardId: c.id,
      price,
      minLevel: minLevelFor(c.id),
      featured: featuredSet.has(c.id) || c.cost >= 5 || exclusive,
      exclusive,
      rotationDeal: dealPct > 0,
      dealPct,
      stockWave: WAVE_SET.has(c.id),
    });
  }

  return offers.sort((a, b) => {
    if (a.rotationDeal !== b.rotationDeal) return a.rotationDeal ? -1 : 1;
    if (a.stockWave !== b.stockWave) return a.stockWave ? -1 : 1;
    if (a.exclusive !== b.exclusive) return a.exclusive ? -1 : 1;
    return a.price - b.price || a.minLevel - b.minLevel;
  });
}

export function liveRotatedPrice(cardId: string, level: number, week = storeWeekKey()): number {
  const base = ticketPrice(cardId, level);
  const pct = dealDiscountPct(cardId, week);
  if (pct <= 0) return base;
  return Math.max(20, Math.round(base * (1 - pct / 100)));
}

export function rotationLabel(week = storeWeekKey()): string {
  const deals = weeklyDealIds(week)
    .map((id) => {
      try {
        return getCard(id).name;
      } catch {
        return id;
      }
    })
    .join(" · ");
  const wave = activeWavePool(week);
  const waveName =
    wave === STORE_STOCK_WAVE_IDS
      ? "Wave A"
      : wave === STORE_STOCK_WAVE_B_IDS
        ? "Wave B"
        : wave === STORE_STOCK_WAVE_C_IDS
          ? "Wave C"
          : wave === STORE_STOCK_WAVE_D_IDS
            ? "Wave D"
            : wave === STORE_STOCK_WAVE_E_IDS
              ? "Wave E"
              : wave === STORE_STOCK_WAVE_F_IDS
                ? "Wave F"
                : wave === STORE_STOCK_WAVE_G_IDS
                  ? "Wave G"
                  : wave === STORE_STOCK_WAVE_H_IDS
                    ? "Wave H"
                    : "Wave I";
  return `${waveName} · Week ${week} deals: ${deals}`;
}
