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
  sanitizeGameState,
  selectHandCard,
  setHoverPreview,
} from "./engine";
import { runEnemyTurn } from "./ai";
import { cardArtSrc, getCard } from "./cards";
import {
  entityKeyHero,
  entityKeyMinion,
  waitFrames,
  type FxEvent,
} from "./fx";
import { meleeFx, spellFx, summonFx } from "./fxPlay";
import { computeCombatPreview, computeMathSnapshot, hasTaunt } from "./math";
import {
  clearMatchSave,
  readMatchSave,
  writeMatchSave,
} from "./matchSave";
import type {
  CombatPreview,
  GameState,
  MathSnapshot,
  SpellEffect,
  TargetRef,
} from "./types";
import { useMetaStore } from "./meta";

export type { MathSnapshot };

interface GameStore extends GameState {
  math: MathSnapshot;
  activeFx: FxEvent | null;
  mulliganSelected: number[];
  saveNotice: string | null;
  startGame: (difficulty?: "normal" | "hard") => void;
  continueSavedGame: () => boolean;
  saveGameLocal: () => { ok: true } | { ok: false; error: string };
  clearSavedGame: () => void;
  returnToMenu: (opts?: { keepSave?: boolean }) => void;
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

function spellHeal(spell: SpellEffect | undefined): number | undefined {
  if (!spell) return undefined;
  if (spell.kind === "heal") return spell.amount;
  if (spell.kind === "damage_heal") return spell.heal;
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

function spellFxFromCard(
  def: ReturnType<typeof getCard>,
  fromKey: string,
  toKey: string,
  spellPower: number,
  spell?: SpellEffect,
): FxEvent {
  const sp = spell ?? def.spell;
  const aoe =
    sp?.kind === "damage" &&
    (sp.target === "all_enemies" || sp.target === "all_enemy_minions");
  return spellFx({
    fromKey,
    toKey,
    school: def.art,
    artSrc: cardArtSrc(def.id),
    cardId: def.id,
    cardName: def.name,
    cardText: def.text,
    keywords: def.keywords,
    spell: sp,
    damage: spellDamage(sp, spellPower),
    heal: spellHeal(sp),
    aoe: !!aoe || sp?.kind === "buff_all_friendly" || sp?.kind === "dominus_reximus",
  });
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
      const extra = (fx.hitStopMs ?? 0) + 220;
      void waitFrames(fx.durationMs + extra).then(() => {
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
    saveNotice: null,

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
      clearMatchSave();
      const deck = useMetaStore.getState().buildActiveDeck();
      const g = createNewGame(difficulty, deck);
      set({
        ...withMath(g),
        activeFx: null,
        mulliganSelected: [],
        saveNotice: null,
      });
    },

    continueSavedGame: () => {
      const saved = readMatchSave();
      if (!saved) return false;
      actionLock = false;
      fxWaiters = [];
      const g = sanitizeGameState({
        ...saved.state,
        animating: false,
        selection: { kind: "none" },
        hoverPreview: null,
        message: "Match resumed from local save.",
      });
      set({
        ...withMath(g),
        activeFx: null,
        mulliganSelected: [],
        saveNotice: null,
      });
      return true;
    },

    saveGameLocal: () => {
      const s = get();
      const result = writeMatchSave({
        phase: s.phase,
        turn: s.turn,
        player: s.player,
        enemy: s.enemy,
        enemyName: s.enemyName,
        matchId: s.matchId,
        selection: { kind: "none" },
        log: s.log,
        logSeq: s.logSeq,
        lastPreview: s.lastPreview,
        hoverPreview: null,
        animating: false,
        message: s.message,
        difficulty: s.difficulty,
      });
      if (result.ok) {
        set({ saveNotice: "Match saved on this device." });
      }
      return result;
    },

    clearSavedGame: () => {
      clearMatchSave();
      set({ saveNotice: null });
    },

    returnToMenu: (opts) => {
      actionLock = false;
      fxWaiters = [];
      const keep = opts?.keepSave !== false;
      const cur = get();
      if (
        keep &&
        (cur.phase === "mulligan" ||
          cur.phase === "player_turn" ||
          cur.phase === "enemy_turn")
      ) {
        writeMatchSave({
          phase: cur.phase,
          turn: cur.turn,
          player: cur.player,
          enemy: cur.enemy,
          enemyName: cur.enemyName,
          matchId: cur.matchId,
          selection: { kind: "none" },
          log: cur.log,
          logSeq: cur.logSeq,
          lastPreview: cur.lastPreview,
          hoverPreview: null,
          animating: false,
          message: cur.message,
          difficulty: cur.difficulty,
        });
      } else if (!keep) {
        clearMatchSave();
      }
      const g = { ...createNewGame("normal"), phase: "menu" as const, message: null };
      set({
        ...withMath(g),
        activeFx: null,
        mulliganSelected: [],
        saveNotice: keep ? "Progress kept — use Load game on main menu." : null,
      });
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
      writeMatchSave(next);
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
            spellFxFromCard(
              def,
              entityKeyHero("player"),
              entityKeyHero("enemy"),
              s.player.spellPower,
            ),
          );
          const next = playSpell(unlocked(get()), index, null);
          set(withMath(next));
          writeMatchSave(next);
        } finally {
          actionLock = false;
        }
        return;
      }

      if (def.type === "minion") {
        if (def.cost > s.player.mana) {
          set({ message: `Need ${def.cost} mana (have ${s.player.mana}).` });
          return;
        }
        if (s.player.board.length >= 7) {
          set({ message: "Board is full (7)." });
          return;
        }
        actionLock = true;
        try {
          const next = selectHandCard(s, index);
          const summoned = next.player.board[next.player.board.length - 1];
          set(withMath({ ...next, animating: true }));
          if (summoned && next.player.board.length > s.player.board.length) {
            await playFx(
              summonFx({
                toKey: entityKeyMinion(summoned.uid),
                artSrc: cardArtSrc(def.id),
                cardId: def.id,
                cardName: def.name,
                cardText: def.text,
                school: def.art,
                keywords: def.keywords,
              }),
            );
          }
          set(withMath({ ...unlocked(get()) }));
          writeMatchSave(get());
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
        const def = cardId ? getCard(cardId) : getCard("mend");
        actionLock = true;
        try {
          await playFx(
            spellFxFromCard(
              def,
              entityKeyHero("player"),
              entityKeyMinion(uid),
              s.player.spellPower,
              s.selection.spell,
            ),
          );
          const next = resolveSpellTarget(unlocked(get()), target);
          set(withMath(next));
          writeMatchSave(next);
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
      const def = getCard(minion.defId);
      set({
        selection: { kind: "minion", uid },
        message: `${def.name} ready — ${def.text}`,
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
        const def = cardId ? getCard(cardId) : getCard("bolt");
        actionLock = true;
        try {
          await playFx(
            spellFxFromCard(
              def,
              entityKeyHero("player"),
              entityKeyMinion(uid),
              s.player.spellPower,
              s.selection.spell,
            ),
          );
          const next = resolveSpellTarget(unlocked(get()), target);
          set(withMath(next));
          writeMatchSave(next);
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

      const atkDef = getCard(attacker.defId);
      actionLock = true;
      try {
        await playFx(
          meleeFx({
            fromKey: entityKeyMinion(attacker.uid),
            toKey: entityKeyMinion(uid),
            damage: attacker.attack,
            returnDamage: defender.attack,
            artSrc: cardArtSrc(attacker.defId),
            cardId: atkDef.id,
            cardName: atkDef.name,
            cardText: atkDef.text,
            keywords: attacker.keywords,
            school: atkDef.art,
          }),
        );
        const next = performAttack(unlocked(get()), attacker.uid, {
          kind: "minion",
          uid,
          side: "enemy",
        });
        set(withMath(next));
        writeMatchSave(next);
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
        const def = cardId ? getCard(cardId) : getCard("bolt");
        actionLock = true;
        try {
          await playFx(
            spellFxFromCard(
              def,
              entityKeyHero("player"),
              entityKeyHero("enemy"),
              s.player.spellPower,
              s.selection.spell,
            ),
          );
          const next = resolveSpellTarget(unlocked(get()), target);
          set(withMath(next));
          writeMatchSave(next);
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

      const atkDef = getCard(attacker.defId);
      actionLock = true;
      try {
        await playFx(
          meleeFx({
            fromKey: entityKeyMinion(attacker.uid),
            toKey: entityKeyHero("enemy"),
            damage: attacker.attack,
            returnDamage: 0,
            artSrc: cardArtSrc(attacker.defId),
            cardId: atkDef.id,
            cardName: atkDef.name,
            cardText: atkDef.text,
            keywords: attacker.keywords,
            school: atkDef.art,
          }),
        );
        const next = performAttack(unlocked(get()), attacker.uid, {
          kind: "hero",
          side: "enemy",
        });
        set(withMath(next));
        writeMatchSave(next);
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
      const def = cardId ? getCard(cardId) : getCard("mend");
      actionLock = true;
      try {
        await playFx(
          spellFxFromCard(
            def,
            entityKeyHero("player"),
            entityKeyHero("player"),
            s.player.spellPower,
            s.selection.spell,
          ),
        );
        const next = resolveSpellTarget(unlocked(get()), target);
        set(withMath(next));
        writeMatchSave(next);
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
        if (next.phase === "victory" || next.phase === "defeat") {
          clearMatchSave();
          return;
        }

        await runEnemyTurn(
          () => get(),
          (st) => set(withMath(st)),
          (ms) => waitFrames(ms),
          playFx,
        );

        const after = get();
        if (after.phase === "victory" || after.phase === "defeat") {
          clearMatchSave();
          return;
        }
        next = afterEnemyTurn(after);
        set(withMath(next));
        if (next.phase === "victory" || next.phase === "defeat") clearMatchSave();
        else writeMatchSave(next);
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
