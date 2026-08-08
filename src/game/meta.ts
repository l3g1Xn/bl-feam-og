import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CARD_POOL,
  buildStarterDeck,
  getCard,
  isStoreExclusive,
} from "./cards";
import type { GraphicsQuality } from "./graphics";
import {
  isVaultReady,
  persistUnlockedSnapshot,
  type MetaSnapshot,
} from "./deviceVault";
import {
  getWeeklyFeaturedIds,
  isWeeklyFeatured,
  storeRotationLabel,
  weeklySpotlightDiscount,
} from "./storeRotation";

export type LauncherTab = "home" | "play" | "store" | "collection" | "settings";

export type MatchRewardResult = {
  tickets: number;
  xp: number;
  leveledUp: boolean;
  newLevel: number;
  bonusNote: string | null;
};

function safeInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function levelFromTotalXp(totalXp: number): number {
  let xp = safeInt(totalXp, 0, 50_000_000, 0);
  let level = 1;
  let need = 100;
  while (xp >= need && level < 100) {
    xp -= need;
    level += 1;
    need = Math.floor(100 * Math.pow(1.15, level - 1));
  }
  return level;
}

export function xpProgressInLevel(totalXp: number): {
  level: number;
  into: number;
  need: number;
} {
  let xp = safeInt(totalXp, 0, 50_000_000, 0);
  let level = 1;
  let need = 100;
  while (xp >= need && level < 100) {
    xp -= need;
    level += 1;
    need = Math.floor(100 * Math.pow(1.15, level - 1));
  }
  return { level, into: xp, need };
}

const STARTER_OWNED = [...new Set(buildStarterDeck())];

/** Level-scaled ticket price for store purchases (weekly spotlight discounts apply). */
export function ticketPrice(cardId: string, level: number): number {
  const c = getCard(cardId);
  const lv = safeInt(level, 1, 100, 1);
  const exclusive = isStoreExclusive(cardId);
  let base = 30 + c.cost * 18;
  if (exclusive) base = 90 + c.cost * 35;
  if (cardId === "dominus_reximus") base = 420;
  // Store costs doubled for economy rebalance
  base *= 2;
  const discount = Math.min(0.35, (lv - 1) * 0.012);
  const weekly = weeklySpotlightDiscount(cardId);
  const mult = (1 - discount) * (1 - weekly);
  return safeInt(Math.round(base * mult), 20, 9999, base);
}

export type StoreOffer = {
  id: string;
  cardId: string;
  price: number;
  minLevel: number;
  featured?: boolean;
  exclusive?: boolean;
  weekly?: boolean;
  spotlight?: boolean;
};

function buildOffers(): StoreOffer[] {
  const weekly = new Set(getWeeklyFeaturedIds());
  const offers: StoreOffer[] = [];
  for (const c of CARD_POOL) {
    const exclusive = isStoreExclusive(c.id);
    const starter = STARTER_OWNED.includes(c.id);
    if (!exclusive && starter) continue;
    const isWeekly = weekly.has(c.id);
    offers.push({
      id: `offer_${c.id}`,
      cardId: c.id,
      price: ticketPrice(c.id, 1),
      minLevel: exclusive
        ? c.id === "dominus_reximus"
          ? 5
          : c.id === "aegis_phalanx" || c.id === "void_sovereign"
            ? 4
            : 2
        : 1,
      featured: exclusive || isWeekly || c.cost >= 5,
      exclusive,
      weekly: isWeekly,
      spotlight: isWeekly && c.id !== "dominus_reximus",
    });
  }
  return offers.sort((a, b) => {
    // Weekly rotation first, then exclusives, then price
    if (!!a.weekly !== !!b.weekly) return a.weekly ? -1 : 1;
    if (!!a.exclusive !== !!b.exclusive) return a.exclusive ? -1 : 1;
    return a.price - b.price || a.minLevel - b.minLevel;
  });
}

export const STORE_OFFERS = buildOffers();
export const STORE_ROTATION_LABEL = storeRotationLabel();
export { isWeeklyFeatured, getWeeklyFeaturedIds, storeRotationLabel };

function rollInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

interface MetaState {
  tickets: number;
  totalXp: number;
  owned: string[];
  deck: string[];
  quality: GraphicsQuality;
  targetHz: 30 | 60 | 90 | 120 | 144;
  aspectMode: "auto" | "16:9";
  reducedShake: boolean;
  sfxVolume: number;
  sfxMuted: boolean;
  launcherTab: LauncherTab;
  lastMessage: string | null;
  lastReward: MatchRewardResult | null;
  vaultProfileLabel: string | null;
  setTab: (t: LauncherTab) => void;
  setQuality: (q: GraphicsQuality) => void;
  setTargetHz: (hz: MetaState["targetHz"]) => void;
  setAspectMode: (m: "auto" | "16:9") => void;
  setReducedShake: (v: boolean) => void;
  setSfxVolume: (v: number) => void;
  setSfxMuted: (v: boolean) => void;
  buyCard: (cardId: string) => boolean;
  claimDailyTickets: () => number;
  addTickets: (n: number) => void;
  rewardMatch: (won: boolean) => MatchRewardResult;
  buildActiveDeck: () => string[];
  addToDeck: (cardId: string) => void;
  removeFromDeck: (cardId: string) => void;
  clearMessage: () => void;
  getLevel: () => number;
  livePrice: (cardId: string) => number;
  getSnapshot: () => MetaSnapshot;
  applySnapshot: (snap: MetaSnapshot, profileLabel?: string | null) => void;
  setVaultProfileLabel: (label: string | null) => void;
}

const DAILY_KEY = "battle-legions-daily-claim";

function alreadyClaimedToday(): boolean {
  try {
    const v = localStorage.getItem(DAILY_KEY);
    if (!v) return false;
    const day = new Date().toISOString().slice(0, 10);
    return v === day;
  } catch {
    return false;
  }
}

function markClaimedToday() {
  try {
    localStorage.setItem(DAILY_KEY, new Date().toISOString().slice(0, 10));
  } catch {
    /* ignore */
  }
}

function flushVaultSoon() {
  // Debounced sealed write so tickets stay accurate after buys/rewards
  const run = () => {
    if (!isVaultReady()) return;
    const s = useMetaStore.getState();
    void persistUnlockedSnapshot(s.getSnapshot());
  };
  if (typeof window === "undefined") return;
  window.clearTimeout((flushVaultSoon as unknown as { t?: number }).t);
  (flushVaultSoon as unknown as { t?: number }).t = window.setTimeout(run, 120);
}

export const useMetaStore = create<MetaState>()(
  persist(
    (set, get) => ({
      tickets: 220,
      totalXp: 0,
      owned: [...STARTER_OWNED],
      deck: buildStarterDeck(),
      quality: "high",
      targetHz: 60,
      aspectMode: "auto",
      reducedShake: false,
      sfxVolume: 0.75,
      sfxMuted: false,
      launcherTab: "home",
      lastMessage: null,
      lastReward: null,
      vaultProfileLabel: null,

      setTab: (t) => set({ launcherTab: t, lastMessage: null }),
      setQuality: (q) => {
        set({ quality: q });
        flushVaultSoon();
      },
      setTargetHz: (hz) => {
        set({ targetHz: hz });
        flushVaultSoon();
      },
      setAspectMode: (m) => {
        set({ aspectMode: m });
        flushVaultSoon();
      },
      setReducedShake: (v) => {
        set({ reducedShake: v });
        flushVaultSoon();
      },
      setSfxVolume: (v) => {
        set({ sfxVolume: Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.75)) });
        flushVaultSoon();
      },
      setSfxMuted: (v) => {
        set({ sfxMuted: !!v });
        flushVaultSoon();
      },
      setVaultProfileLabel: (label) => set({ vaultProfileLabel: label }),
      clearMessage: () => set({ lastMessage: null }),

      getLevel: () => levelFromTotalXp(get().totalXp),

      livePrice: (cardId: string) => ticketPrice(cardId, levelFromTotalXp(get().totalXp)),

      getSnapshot: () => {
        const s = get();
        return {
          tickets: s.tickets,
          totalXp: s.totalXp,
          owned: [...s.owned],
          deck: [...s.deck],
          quality: s.quality,
          targetHz: s.targetHz,
          aspectMode: s.aspectMode,
          reducedShake: s.reducedShake,
          sfxVolume: s.sfxVolume,
          sfxMuted: s.sfxMuted,
        };
      },

      applySnapshot: (snap, profileLabel) => {
        set({
          tickets: safeInt(snap.tickets, 0, 9_999_999, 220),
          totalXp: safeInt(snap.totalXp, 0, 50_000_000, 0),
          owned: Array.isArray(snap.owned) ? snap.owned : [...STARTER_OWNED],
          deck: Array.isArray(snap.deck) ? snap.deck : buildStarterDeck(),
          quality: snap.quality,
          targetHz: snap.targetHz,
          aspectMode: snap.aspectMode,
          reducedShake: !!snap.reducedShake,
          sfxVolume: Math.max(0, Math.min(1, snap.sfxVolume)),
          sfxMuted: !!snap.sfxMuted,
          vaultProfileLabel: profileLabel ?? get().vaultProfileLabel,
          lastMessage: profileLabel ? `Vault unlocked — ${profileLabel}` : get().lastMessage,
        });
      },

      addTickets: (n) => {
        if (!Number.isFinite(n) || n === 0) return;
        set((s) => ({ tickets: safeInt(s.tickets + n, 0, 9_999_999, 0) }));
        flushVaultSoon();
      },

      claimDailyTickets: () => {
        if (alreadyClaimedToday()) {
          set({ lastMessage: "Daily rewards already claimed." });
          return 0;
        }
        const level = levelFromTotalXp(get().totalXp);
        const base = 40 + level * 8;
        const bonus = rollInt(0, 20 + level * 2);
        const total = safeInt(base + bonus, 10, 5000, 50);
        markClaimedToday();
        set((s) => ({
          tickets: safeInt(s.tickets + total, 0, 9_999_999, total),
          lastMessage: `Daily haul: +${total} tickets (Lv ${level}).`,
        }));
        flushVaultSoon();
        return total;
      },

      rewardMatch: (won) => {
        const level = levelFromTotalXp(get().totalXp);
        const baseXp = won ? 45 + level * 3 : 18 + level;
        const xpBonus = rollInt(0, 15);
        const xp = safeInt(baseXp + xpBonus, 5, 5000, 20);
        const baseTickets = won
          ? 28 + Math.floor(level * 1.5)
          : 8 + Math.floor(level * 0.5);
        const ticketRoll = rollInt(0, 12 + level);
        const tickets = safeInt(baseTickets + ticketRoll, 1, 5000, 10);
        const before = level;
        const afterXp = get().totalXp + xp;
        const after = levelFromTotalXp(afterXp);
        const leveledUp = after > before;
        let bonusNote: string | null = null;
        let extraTickets = 0;
        if (leveledUp) {
          extraTickets = 25 + after * 5;
          bonusNote = `Level-up bonus +${extraTickets} tickets`;
        } else if (won && Math.random() < 0.2) {
          extraTickets = rollInt(5, 20);
          bonusNote = `Battlefield loot +${extraTickets} tickets`;
        }
        const totalTickets = tickets + extraTickets;
        set((s) => ({
          totalXp: safeInt(s.totalXp + xp, 0, 50_000_000, s.totalXp),
          tickets: safeInt(s.tickets + totalTickets, 0, 9_999_999, s.tickets),
          lastReward: {
            tickets: totalTickets,
            xp,
            leveledUp,
            newLevel: after,
            bonusNote,
          },
        }));
        flushVaultSoon();
        return {
          tickets: totalTickets,
          xp,
          leveledUp,
          newLevel: after,
          bonusNote,
        };
      },

      buildActiveDeck: () => {
        const d = get().deck;
        if (d.length >= 20) return [...d];
        return buildStarterDeck();
      },

      buyCard: (cardId) => {
        const s = get();
        if (s.owned.includes(cardId)) {
          set({ lastMessage: "Already owned." });
          return false;
        }
        const level = levelFromTotalXp(s.totalXp);
        const offer = STORE_OFFERS.find((o) => o.cardId === cardId);
        if (!offer) {
          set({ lastMessage: "Not in store." });
          return false;
        }
        if (level < offer.minLevel) {
          set({ lastMessage: `Requires Legion Lv ${offer.minLevel}.` });
          return false;
        }
        const price = ticketPrice(cardId, level);
        if (s.tickets < price) {
          set({ lastMessage: "Not enough tickets." });
          return false;
        }
        const weeklyNote = offer.spotlight
          ? " (weekly spotlight)"
          : offer.weekly
            ? " (rotation)"
            : "";
        set({
          tickets: s.tickets - price,
          owned: [...s.owned, cardId],
          lastMessage: `Acquired ${getCard(cardId).name}${weeklyNote}.`,
        });
        flushVaultSoon();
        return true;
      },

      addToDeck: (cardId) => {
        const s = get();
        if (!s.owned.includes(cardId)) return;
        const copies = s.deck.filter((x) => x === cardId).length;
        if (copies >= 2) {
          set({ lastMessage: "Max 2 copies." });
          return;
        }
        if (s.deck.length >= 34) {
          set({ lastMessage: "Deck full (34)." });
          return;
        }
        set({ deck: [...s.deck, cardId], lastMessage: `Added ${getCard(cardId).name}.` });
        flushVaultSoon();
      },

      removeFromDeck: (cardId) => {
        const s = get();
        const idx = s.deck.lastIndexOf(cardId);
        if (idx < 0) return;
        const deck = [...s.deck];
        deck.splice(idx, 1);
        set({ deck, lastMessage: `Removed ${getCard(cardId).name}.` });
        flushVaultSoon();
      },
    }),
    {
      name: "battle-legions-meta-v3",
      partialize: (s) => ({
        tickets: s.tickets,
        totalXp: s.totalXp,
        owned: s.owned,
        deck: s.deck,
        quality: s.quality,
        targetHz: s.targetHz,
        aspectMode: s.aspectMode,
        reducedShake: s.reducedShake,
        sfxVolume: s.sfxVolume,
        sfxMuted: s.sfxMuted,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MetaState>;
        // Merge new starter cards into owned without wiping progression
        const baseOwned = Array.isArray(p.owned) ? p.owned : current.owned;
        const mergedOwned = [...new Set([...baseOwned, ...STARTER_OWNED])];
        return {
          ...current,
          ...p,
          tickets: safeInt(Number(p.tickets ?? current.tickets), 0, 9_999_999, 220),
          totalXp: safeInt(Number(p.totalXp ?? 0), 0, 50_000_000, 0),
          owned: mergedOwned,
          deck: Array.isArray(p.deck) ? p.deck : current.deck,
          sfxVolume:
            typeof p.sfxVolume === "number" && Number.isFinite(p.sfxVolume)
              ? Math.max(0, Math.min(1, p.sfxVolume))
              : current.sfxVolume,
          sfxMuted: typeof p.sfxMuted === "boolean" ? p.sfxMuted : current.sfxMuted,
        };
      },
    },
  ),
);
