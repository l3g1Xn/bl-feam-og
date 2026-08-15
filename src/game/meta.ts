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
  buildRotatedOffers,
  liveRotatedPrice,
  storeWeekKey,
  ticketPrice as baseTicketPrice,
  type RotatedOffer,
} from "./storeRotation";

export type LauncherTab = "home" | "play" | "store" | "collection" | "settings";

export type MatchRewardResult = {
  tickets: number;
  xp: number;
  leveledUp: boolean;
  newLevel: number;
  bonusNote: string | null;
  /** True when this matchId was already paid (save-scum blocked). */
  alreadyClaimed?: boolean;
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

/** Level-scaled ticket price for store purchases (before weekly deal). */
export function ticketPrice(cardId: string, level: number): number {
  return baseTicketPrice(cardId, level);
}

type StoreOffer = {
  id: string;
  cardId: string;
  price: number;
  minLevel: number;
  featured?: boolean;
  exclusive?: boolean;
};

function buildOffers(): StoreOffer[] {
  const offers: StoreOffer[] = [];
  for (const c of CARD_POOL) {
    const exclusive = isStoreExclusive(c.id);
    const starter = STARTER_OWNED.includes(c.id);
    if (!exclusive && starter) continue;
    offers.push({
      id: `offer_${c.id}`,
      cardId: c.id,
      price: ticketPrice(c.id, 1),
      minLevel: exclusive ? (c.id === "dominus_reximus" ? 5 : 2) : 1,
      featured: exclusive || c.cost >= 5,
      exclusive,
    });
  }
  return offers.sort((a, b) => {
    if (!!a.exclusive !== !!b.exclusive) return a.exclusive ? -1 : 1;
    return a.price - b.price || a.minLevel - b.minLevel;
  });
}

/** Static catalog (fallback). Prefer getLiveOffers() for rotation. */
export const STORE_OFFERS = buildOffers();

export function getLiveOffers(level?: number): RotatedOffer[] {
  const lv = level ?? levelFromTotalXp(useMetaStore.getState().totalXp);
  return buildRotatedOffers(lv, storeWeekKey());
}

function rollInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Cap the once-paid matchId ledger so localStorage stays bounded. */
const REWARDED_MATCH_CAP = 64;

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
  /** MatchIds that have already paid tickets/XP (blocks save-scum loops). */
  rewardedMatchIds: string[];
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
  /**
   * Pay match rewards once per matchId.
   * Pass the stable GameState.matchId so a near-end save reload cannot re-farm.
   */
  rewardMatch: (won: boolean, matchId?: string) => MatchRewardResult;
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
      rewardedMatchIds: [],
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

      livePrice: (cardId: string) =>
        liveRotatedPrice(cardId, levelFromTotalXp(get().totalXp), storeWeekKey()),

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

      rewardMatch: (won, matchId) => {
        const id =
          typeof matchId === "string" && matchId.trim().length > 0
            ? matchId.trim()
            : null;

        // Once-only payout: same matchId cannot be farmed via save reload.
        if (id) {
          const paid = get().rewardedMatchIds;
          if (paid.includes(id)) {
            const zero: MatchRewardResult = {
              tickets: 0,
              xp: 0,
              leveledUp: false,
              newLevel: levelFromTotalXp(get().totalXp),
              bonusNote: "Rewards already claimed for this match.",
              alreadyClaimed: true,
            };
            set({ lastReward: zero });
            return zero;
          }
        }

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

        set((s) => {
          let rewardedMatchIds = s.rewardedMatchIds;
          if (id) {
            rewardedMatchIds = [...rewardedMatchIds, id].slice(-REWARDED_MATCH_CAP);
          }
          return {
            totalXp: safeInt(s.totalXp + xp, 0, 50_000_000, s.totalXp),
            tickets: safeInt(s.tickets + totalTickets, 0, 9_999_999, s.tickets),
            rewardedMatchIds,
            lastReward: {
              tickets: totalTickets,
              xp,
              leveledUp,
              newLevel: after,
              bonusNote,
              alreadyClaimed: false,
            },
          };
        });
        flushVaultSoon();
        return {
          tickets: totalTickets,
          xp,
          leveledUp,
          newLevel: after,
          bonusNote,
          alreadyClaimed: false,
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
        const offers = buildRotatedOffers(level, storeWeekKey());
        const offer = offers.find((o) => o.cardId === cardId);
        if (!offer) {
          set({ lastMessage: "Not in store." });
          return false;
        }
        if (level < offer.minLevel) {
          set({ lastMessage: `Requires Legion Lv ${offer.minLevel}.` });
          return false;
        }
        const price = liveRotatedPrice(cardId, level, storeWeekKey());
        if (s.tickets < price) {
          set({ lastMessage: "Not enough tickets." });
          return false;
        }
        const dealNote = offer.rotationDeal ? ` (−${offer.dealPct}% rotation)` : "";
        set({
          tickets: s.tickets - price,
          owned: [...s.owned, cardId],
          lastMessage: `Acquired ${getCard(cardId).name}${dealNote}.`,
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
        rewardedMatchIds: Array.isArray(s.rewardedMatchIds)
          ? s.rewardedMatchIds.slice(-REWARDED_MATCH_CAP)
          : [],
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MetaState>;
        const ids = Array.isArray(p.rewardedMatchIds)
          ? p.rewardedMatchIds.filter((x) => typeof x === "string" && x.length > 0)
          : current.rewardedMatchIds;
        return {
          ...current,
          ...p,
          tickets: safeInt(Number(p.tickets ?? current.tickets), 0, 9_999_999, 220),
          totalXp: safeInt(Number(p.totalXp ?? 0), 0, 50_000_000, 0),
          owned: Array.isArray(p.owned) ? p.owned : current.owned,
          deck: Array.isArray(p.deck) ? p.deck : current.deck,
          sfxVolume:
            typeof p.sfxVolume === "number" && Number.isFinite(p.sfxVolume)
              ? Math.max(0, Math.min(1, p.sfxVolume))
              : current.sfxVolume,
          sfxMuted: typeof p.sfxMuted === "boolean" ? p.sfxMuted : current.sfxMuted,
          rewardedMatchIds: ids.slice(-REWARDED_MATCH_CAP),
        };
      },
    },
  ),
);
