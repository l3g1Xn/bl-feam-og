import { create } from "zustand";
import {
  afterEnemyTurn,
  clearSelection,
  confirmMulligan,
  createNewGame,
  endPlayerTurn,
  performAttack,
  playSpell,
  resolveSpellTarget,
  selectHandCard,
  setHoverPreview,
} from "./engine";
import { runEnemyTurn } from "./ai";
import { cardArtSrc, getCard } from "./cards";
import {
  entityKeyHero,
  entityKeyMinion,
  meleeFx,
  spellFx,
  waitFrames,
  type FxEvent,
} from "./fx";
import { computeCombatPreview, computeMathSnapshot, hasTaunt } from "./math";
import type { CombatPreview, GameState, MathSnapshot, SpellEffect, TargetRef } from "./types";
import { useMetaStore } from "./meta";

export type { MathSnapshot };

interface GameStore extends GameState {
  math: MathSnapshot;
  activeFx: FxEvent | null;
  mulliganSelected: number[];
  startGame: (difficulty?: "normal" | "hard") => void;
  returnToMenu: () => void;
  toggleMulligan: (index: number) => void;
  confirmMulligan: () => void;
  clickHand: (index: number) => void;
  clickPlayerMinion: (uid: string) => void;
  clickEnemyMinion: (uid: string) => void;
  clickEnemyHero: () => void;
  clickPlayerHero: () => void;
  endTurn: () => void;
  cancelSelection: () => void;
  hoverEnemyMinion: (uid: string | null) => void;
  hoverEnemyHero: (on: boolean) => void;
  completeFx: (id: number) => void;
  playFx: (fx: FxEvent) => Promise<void>;
}

function withMath(partial: GameState): Pick<GameStore, keyof GameState | "math"> {
  return { ...partial, math: computeMathSnapshot(partial) };
}

function spellDamage(spell: SpellEffect | undefined, spellPower = 0): number | undefined {
  if (!spell) return undefined;
  const sp = Math.max(0, spellPower);
  if (spell.kind === "damage") return spell.amount + sp;
  if (spell.kind === "damage_and_draw") return spell.damage + sp;
  if (spell.kind === "damage_heal") return spell.damage + sp;
  return undefined;
}

function isInstantSpell(spell: SpellEffect): boolean {
  if (spell.kind === "draw") return true;
  if (spell.kind === "spell_power") return true;
  if (spell.kind === "buff_all_friendly") return true;
  if (spell.kind === "heal" && spell.target === "friendly_hero") return true;
  if (spell.kind === "damage") {
    return spell.target === "all_enemy_minions" || spell.target === "all_enemies";
  }
  return false;
}

function unlocked(s: GameState): GameState {
  return { ...s, animating: false };
}

let fxWaiters: Array<{ id: number; resolve: () => void }> = [];
let actionLock = false;

export const useGameStore = create<GameStore>((set, get) => {
  const initial = createNewGame("normal");
  const menuState: GameState = { ...initial, phase: "menu", message: null };

  const playFx = (fx: FxEvent) =>
    new Promise<void>((resolve) => {
      set({ activeFx: fx, animating: true });
      fxWaiters.push({ id: fx.id, resolve });
      void waitFrames(fx.durationMs + 200).then(() => {
        const s = get();
        if (s.activeFx?.id === fx.id) {
          set({ activeFx: null });
          const w = fxWaiters.filter((x) => x.id === fx.id);
          fxWaiters = fxWaiters.filter((x) => x.id !== fx.id);
          w.forEach((x) => x.resolve());
        }
      });
    });

  return {
    ...menuState,
    math: computeMathSnapshot(menuState),
    activeFx: null,
    mulliganSelected: [],

    playFx,

    completeFx: (id) => {
      const w = fxWaiters.filter((x) => x.id === id);
      fxWaiters = fxWaiters.filter((x) => x.id !== id);
      set({ activeFx: null });
      w.forEach((x) => x.resolve());
    },

    startGame: (difficulty = "normal") => {
      actionLock = false;
      fxWaiters = [];
      const deck = useMetaStore.getState().buildActiveDeck();
      const g = createNewGame(difficulty, deck);
      set({
        ...withMath(g),
        activeFx: null,
        mulliganSelected: [],
      });
    },

    returnToMenu: () => {
      actionLock = false;
      fxWaiters = [];
      const g = { ...createNewGame("normal"), phase: "menu" as const, message: null };
      set({ ...withMath(g), activeFx: null, mulliganSelected: [] });
    },

    toggleMulligan: (index) => {
      const s = get();
      if (s.phase !== "mulligan") return;
      const setIdx = new Set(s.mulliganSelected);
      if (setIdx.has(index)) setIdx.delete(index);
      else setIdx.add(index);
      set({ mulliganSelected: [...setIdx].sort((a, b) => a - b) });
    },

    confirmMulligan: () => {
      const s = get();
      if (s.phase !== "mulligan") return;
      const next = confirmMulligan(s, s.mulliganSelected);
      set({ ...withMath(next), mulliganSelected: [] });
    },

    clickHand: async (index) => {
      if (actionLock) return;
      const s = get();
      if (s.phase !== "player_turn" || s.animating) return;
      const cardId = s.player.hand[index];
      if (!cardId) return;
      const def = getCard(cardId);

      if (def.type === "spell" && def.spell && isInstantSpell(def.spell)) {
        actionLock = true;
        try {
          await playFx(
            spellFx({
              fromKey: entityKeyHero("player"),
              toKey: entityKeyHero("enemy"),
              school: def.art,
              artSrc: cardArtSrc(def.id),
              damage: spellDamage(def.spell, s.player.spellPower),
            }),
          );
          const next = playSpell(unlocked(get()), index, null);
          set(withMath(next));
        } finally {
          actionLock = false;
        }
        return;
      }

      const next = selectHandCard(s, index);
      set(withMath(next));
    },

    clickPlayerMinion: async (uid) => {
      if (actionLock) return;
      const s = get();
      if (s.phase !== "player_turn" || s.animating) return;

      if (s.selection.kind === "spell_target") {
        const target: TargetRef = { kind: "minion", uid, side: "player" };
        const cardId = s.player.hand[s.selection.handIndex];
        const def = cardId ? getCard(cardId) : null;
        actionLock = true;
        try {
          await playFx(
            spellFx({
              fromKey: entityKeyHero("player"),
              toKey: entityKeyMinion(uid),
              school: def?.art ?? "arcane",
              artSrc: def ? cardArtSrc(def.id) : undefined,
              damage: spellDamage(s.selection.spell, s.player.spellPower),
            }),
          );
          const next = resolveSpellTarget(unlocked(get()), target);
          set(withMath(next));
        } finally {
          actionLock = false;
        }
        return;
      }

      const minion = s.player.board.find((m) => m.uid === uid);
      if (!minion) return;
      if (s.selection.kind === "minion" && s.selection.uid === uid) {
        set(withMath(clearSelection(s)));
        return;
      }
      if (!minion.canAttack) {
        set({ message: "That minion cannot attack yet." });
        return;
      }
      set({
        selection: { kind: "minion", uid },
        message: "Choose a target — Taunt blocks face if present.",
      });
    },

    clickEnemyMinion: async (uid) => {
      if (actionLock) return;
      const s = get();
      if (s.phase !== "player_turn" || s.animating) return;
      const defender = s.enemy.board.find((m) => m.uid === uid);
      if (!defender) return;

      if (s.selection.kind === "spell_target") {
        const target: TargetRef = { kind: "minion", uid, side: "enemy" };
        const cardId = s.player.hand[s.selection.handIndex];
        const def = cardId ? getCard(cardId) : null;
        actionLock = true;
        try {
          await playFx(
            spellFx({
              fromKey: entityKeyHero("player"),
              toKey: entityKeyMinion(uid),
              school: def?.art ?? "arcane",
              artSrc: def ? cardArtSrc(def.id) : undefined,
              damage: spellDamage(s.selection.spell, s.player.spellPower),
            }),
          );
          const next = resolveSpellTarget(unlocked(get()), target);
          set(withMath(next));
        } finally {
          actionLock = false;
        }
        return;
      }

      if (s.selection.kind !== "minion") return;
      const atkUid = s.selection.uid;
      const attacker = s.player.board.find((m) => m.uid === atkUid);
      if (!attacker) return;
      if (hasTaunt(s.enemy.board) && !defender.keywords.includes("taunt")) {
        set({ message: "A Taunt minion is blocking." });
        return;
      }

      actionLock = true;
      try {
        await playFx(
          meleeFx({
            fromKey: entityKeyMinion(attacker.uid),
            toKey: entityKeyMinion(uid),
            damage: attacker.attack,
            returnDamage: defender.attack,
            artSrc: cardArtSrc(attacker.defId),
          }),
        );
        const next = performAttack(unlocked(get()), attacker.uid, {
          kind: "minion",
          uid,
          side: "enemy",
        });
        set(withMath(next));
      } finally {
        actionLock = false;
      }
    },

    clickEnemyHero: async () => {
      if (actionLock) return;
      const s = get();
      if (s.phase !== "player_turn" || s.animating) return;

      if (s.selection.kind === "spell_target") {
        const target: TargetRef = { kind: "hero", side: "enemy" };
        const cardId = s.player.hand[s.selection.handIndex];
        const def = cardId ? getCard(cardId) : null;
        actionLock = true;
        try {
          await playFx(
            spellFx({
              fromKey: entityKeyHero("player"),
              toKey: entityKeyHero("enemy"),
              school: def?.art ?? "arcane",
              artSrc: def ? cardArtSrc(def.id) : undefined,
              damage: spellDamage(s.selection.spell, s.player.spellPower),
            }),
          );
          const next = resolveSpellTarget(unlocked(get()), target);
          set(withMath(next));
        } finally {
          actionLock = false;
        }
        return;
      }

      if (s.selection.kind !== "minion") return;
      const atkUid = s.selection.uid;
      const attacker = s.player.board.find((m) => m.uid === atkUid);
      if (!attacker) return;
      if (!attacker.canHitFace) {
        set({ message: "Rush cannot hit face this turn." });
        return;
      }
      if (hasTaunt(s.enemy.board)) {
        set({ message: "Taunt blocks the hero." });
        return;
      }

      actionLock = true;
      try {
        await playFx(
          meleeFx({
            fromKey: entityKeyMinion(attacker.uid),
            toKey: entityKeyHero("enemy"),
            damage: attacker.attack,
            returnDamage: 0,
            artSrc: cardArtSrc(attacker.defId),
          }),
        );
        const next = performAttack(unlocked(get()), attacker.uid, {
          kind: "hero",
          side: "enemy",
        });
        set(withMath(next));
      } finally {
        actionLock = false;
      }
    },

    clickPlayerHero: async () => {
      if (actionLock) return;
      const s = get();
      if (s.phase !== "player_turn" || s.animating) return;
      if (s.selection.kind !== "spell_target") return;
      const target: TargetRef = { kind: "hero", side: "player" };
      const cardId = s.player.hand[s.selection.handIndex];
      const def = cardId ? getCard(cardId) : null;
      actionLock = true;
      try {
        await playFx(
          spellFx({
            fromKey: entityKeyHero("player"),
            toKey: entityKeyHero("player"),
            school: def?.art ?? "nature",
            artSrc: def ? cardArtSrc(def.id) : undefined,
            heal: def?.spell?.kind === "heal" ? def.spell.amount : undefined,
          }),
        );
        const next = resolveSpellTarget(unlocked(get()), target);
        set(withMath(next));
      } finally {
        actionLock = false;
      }
    },

    endTurn: async () => {
      if (actionLock) return;
      const s = get();
      if (s.phase !== "player_turn" || s.animating) return;
      actionLock = true;
      try {
        let next = endPlayerTurn(s);
        set(withMath(next));
        if (next.phase === "victory" || next.phase === "defeat") return;

        await runEnemyTurn(
          () => get(),
          (st) => set(withMath(st)),
          (ms) => waitFrames(ms),
          playFx,
        );

        const after = get();
        if (after.phase === "victory" || after.phase === "defeat") return;
        next = afterEnemyTurn(after);
        set(withMath(next));
      } finally {
        actionLock = false;
      }
    },

    cancelSelection: () => {
      set(withMath(clearSelection(get())));
    },

    hoverEnemyMinion: (uid) => {
      const s = get();
      if (s.selection.kind !== "minion" || !uid) {
        set(withMath(setHoverPreview(s, null)));
        return;
      }
      const atkUid = s.selection.uid;
      const attacker = s.player.board.find((m) => m.uid === atkUid);
      const defender = s.enemy.board.find((m) => m.uid === uid);
      if (!attacker || !defender) {
        set(withMath(setHoverPreview(s, null)));
        return;
      }
      const preview: CombatPreview = computeCombatPreview(
        attacker,
        defender,
        getCard(defender.defId).name,
        defender.health,
        defender.shield,
      );
      set(withMath(setHoverPreview(s, preview)));
    },

    hoverEnemyHero: (on) => {
      const s = get();
      if (!on || s.selection.kind !== "minion") {
        set(withMath(setHoverPreview(s, null)));
        return;
      }
      const atkUid = s.selection.uid;
      const attacker = s.player.board.find((m) => m.uid === atkUid);
      if (!attacker || !attacker.canHitFace || hasTaunt(s.enemy.board)) {
        set(withMath(setHoverPreview(s, null)));
        return;
      }
      const preview = computeCombatPreview(
        attacker,
        "hero",
        "Enemy",
        s.enemy.heroHp,
        false,
      );
      set(withMath(setHoverPreview(s, preview)));
    },
  };
});
