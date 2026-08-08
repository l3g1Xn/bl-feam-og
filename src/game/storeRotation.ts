/**
 * Weekly Legion armory rotation — featured stock without version bumps.
 * Deterministic from ISO week so all commanders see the same shelf.
 */

import { CARD_POOL, isStoreExclusive } from "./cards";

/** ISO week key e.g. "2026-W32" */
export function getStoreWeekKey(date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function hashWeek(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Exclusive card ids in stable catalog order. */
export function exclusiveCardIds(): string[] {
  return CARD_POOL.filter((c) => c.storeExclusive).map((c) => c.id);
}

/**
 * Featured rotation for the ticket store (3 exclusives + 2 deep cuts).
 * Dominus always stays listed; rotation only re-orders / highlights.
 */
export function getWeeklyFeaturedIds(date = new Date()): string[] {
  const key = getStoreWeekKey(date);
  const seed = hashWeek(key);
  const exclusives = exclusiveCardIds().filter((id) => id !== "dominus_reximus");
  if (exclusives.length === 0) return ["dominus_reximus"];

  // Fisher-Yates with seeded LCG
  const arr = [...exclusives];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }

  const featured = arr.slice(0, Math.min(4, arr.length));
  // Always surface apex unit
  return ["dominus_reximus", ...featured];
}

/** Discount percentage (0–0.2) for weekly spotlight stock. */
export function weeklySpotlightDiscount(cardId: string, date = new Date()): number {
  const featured = getWeeklyFeaturedIds(date);
  // First non-dominus spotlight gets 15% off; next two get 8%
  const idx = featured.indexOf(cardId);
  if (idx === 1) return 0.15;
  if (idx === 2 || idx === 3) return 0.08;
  return 0;
}

export function isWeeklyFeatured(cardId: string, date = new Date()): boolean {
  return getWeeklyFeaturedIds(date).includes(cardId);
}

/** Human label for the current rotation window. */
export function storeRotationLabel(date = new Date()): string {
  return `Rotation ${getStoreWeekKey(date)}`;
}

/** Non-exclusive deep cuts that cycle into "all" featured strip. */
export function getWeeklyDeepCuts(date = new Date()): string[] {
  const key = getStoreWeekKey(date);
  const seed = hashWeek(key + ":cuts");
  const pool = CARD_POOL.filter(
    (c) => !isStoreExclusive(c.id) && c.cost >= 3,
  ).map((c) => c.id);
  if (pool.length === 0) return [];
  const arr = [...pool];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr.slice(0, 3);
}
