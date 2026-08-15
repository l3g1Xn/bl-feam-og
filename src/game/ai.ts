import { cardArtSrc, getCard } from "./cards";
import {
  enemyAttack,
  enemyPlayMinion,
  enemyPlaySpell,
} from "./engine";
import {
  entityKeyHero,
  entityKeyMinion,
  type FxEvent,
} from "./fx";
import { meleeFx, spellFx, summonFx } from "./fxPlay";
import { hasTaunt, spellNeedsTarget } from "./math";
import type { GameState, MinionInstance, SpellEffect, TargetRef } from "./types";

function playableEnemyCards(state: GameState) {
  return state.enemy.hand
    .map((id, index) => ({ id, index, def: getCard(id) }))
    .filter((c) => c.def.cost <= state.enemy.mana)
    .sort((a, b) => b.def.cost - a.def.cost);
}

function playOneCard(state: GameState): GameState {
  let s = state;
  const cards = playableEnemyCards(s);
  for (const card of cards) {
    if (card.def.type === "minion") {
      if (s.enemy.board.length >= 7) continue;
      s = enemyPlayMinion(s, card.index);
      return s;
    }

    if (card.def.type === "spell" && card.def.spell) {
      const target = pickSpellTarget(s, card.def.spell);
      if (spellNeedsTarget(card.def.spell) && !target) continue;
      if (card.def.spell.kind === "heal" && s.enemy.heroHp >= s.enemy.heroMaxHp - 1)
        continue;
      if (
        (card.def.spell.kind === "buff" ||
          card.def.spell.kind === "aegis" ||
          card.def.spell.kind === "dominus_reximus") &&
        s.enemy.board.length === 0
      )
        continue;
      s = enemyPlaySpell(s, card.index, target);
      return s;
    }
  }
  return s;
}

function pickSpellTarget(state: GameState, spell: SpellEffect): TargetRef | null {
  if (!spellNeedsTarget(spell)) return null;

  if (spell.kind === "buff" || spell.kind === "aegis") {
    const best = [...state.enemy.board].sort((a, b) => b.attack - a.attack)[0];
    return best ? { kind: "minion", uid: best.uid, side: "enemy" } : null;
  }

  if (spell.kind === "dominus_reximus") {
    const taunt = state.enemy.board
      .filter((m) => m.keywords.includes("taunt"))
      .sort((a, b) => b.health - a.health)[0];
    return taunt ? { kind: "minion", uid: taunt.uid, side: "enemy" } : null;
  }

  if (spell.kind === "heal") {
    if (spell.target === "friendly_hero") return { kind: "hero", side: "enemy" };
    const hurt = state.enemy.board
      .filter((m) => m.health < m.maxHealth)
      .sort((a, b) => a.health - b.health)[0];
    if (hurt) return { kind: "minion", uid: hurt.uid, side: "enemy" };
    return { kind: "hero", side: "enemy" };
  }

  if (
    spell.kind === "damage" ||
    spell.kind === "damage_and_draw" ||
    spell.kind === "damage_heal"
  ) {
    if (spell.kind === "damage" && spell.target === "enemy_minion") {
      const best = [...state.player.board].sort(
        (a, b) => b.attack + b.health - (a.attack + a.health),
      )[0];
      return best ? { kind: "minion", uid: best.uid, side: "player" } : null;
    }
    const amount =
      spell.kind === "damage"
        ? spell.amount
        : spell.kind === "damage_heal"
          ? spell.damage
          : spell.damage;
    if (!hasTaunt(state.player.board) && amount >= 3) {
      return { kind: "hero", side: "player" };
    }
    const best = [...state.player.board].sort(
      (a, b) => b.attack + b.health - (a.attack + a.health),
    )[0];
    if (best) return { kind: "minion", uid: best.uid, side: "player" };
    if (!hasTaunt(state.player.board)) return { kind: "hero", side: "player" };
  }

  return null;
}

function pickAttackTarget(state: GameState, attacker: MinionInstance): TargetRef | null {
  const taunts = state.player.board.filter(
    (m) => m.keywords.includes("taunt") && !m.keywords.includes("immune") && !m.immuneThisTurn,
  );
  const open = state.player.board.filter(
    (m) => !m.keywords.includes("immune") && !m.immuneThisTurn,
  );
  const candidates = taunts.length > 0 ? taunts : open;

  let best: { target: TargetRef; score: number } | null = null;
  for (const d of candidates) {
    const dmg = attacker.attack;
    const kills = !d.shield && d.health <= dmg;
    const weDie = attacker.shield || attacker.keywords.includes("immune") || attacker.immuneThisTurn
      ? false
      : attacker.health <= d.attack;
    let score = 0;
    if (kills) score += 20 + d.attack * 2 + d.health;
    else score += dmg;
    if (weDie) score -= attacker.attack + attacker.health;
    else score += 3;
    if (!best || score > best.score) {
      best = { target: { kind: "minion", uid: d.uid, side: "player" }, score };
    }
  }

  if (taunts.length === 0 && attacker.canHitFace) {
    const faceScore =
      attacker.attack * 3 + (attacker.keywords.includes("lifesteal") ? 5 : 0);
    if (!best || faceScore > best.score) {
      best = { target: { kind: "hero", side: "player" }, score: faceScore };
    }
  }

  return (
    best?.target ??
    (taunts.length === 0 && attacker.canHitFace
      ? { kind: "hero", side: "player" }
      : null)
  );
}

export async function runEnemyTurn(
  getState: () => GameState,
  setState: (s: GameState) => void,
  wait: (ms: number) => Promise<void>,
  playFx?: (fx: FxEvent) => Promise<void>,
): Promise<void> {
  const initial = getState();
  if (initial.phase !== "enemy_turn") return;

  let s: GameState = {
    ...initial,
    animating: true,
    message: "Enemy is calculating…",
  };
  setState(s);
  await wait(320);

  let safety = 10;
  while (safety-- > 0) {
    const before = s;
    const trial = playOneCard(s);
    if (trial === before) break;

    const wasMinion = trial.enemy.board.length > s.enemy.board.length;
    const handDiff = s.enemy.hand.length - trial.enemy.hand.length;

    if (wasMinion && playFx) {
      s = trial;
      setState(s);
      const summoned = s.enemy.board[s.enemy.board.length - 1];
      if (summoned) {
        const def = getCard(summoned.defId);
        await playFx(
          summonFx({
            toKey: entityKeyMinion(summoned.uid),
            artSrc: cardArtSrc(summoned.defId),
            cardId: def.id,
            cardName: def.name,
            cardText: def.text,
            school: def.art,
            keywords: def.keywords,
          }),
        );
      }

    } else if (playFx && handDiff > 0) {
      const beforeHand = [...s.enemy.hand];
      const cardId = beforeHand.find((id) => {
        const bc = beforeHand.filter((x) => x === id).length;
        const ac = trial.enemy.hand.filter((x) => x === id).length;
        return ac < bc;
      });
      const def = getCard(cardId ?? "bolt");
      await playFx(
        spellFx({
          fromKey: entityKeyHero("enemy"),
          toKey: entityKeyHero("player"),
          school: def.art,
          artSrc: cardArtSrc(def.id),
          cardId: def.id,
          cardName: def.name,
          cardText: def.text,
          spell: def.spell,
          damage:
            def.spell && def.spell.kind === "damage"
              ? def.spell.amount + (s.enemy.spellPower || 0)
              : def.spell && def.spell.kind === "damage_and_draw"
                ? def.spell.damage + (s.enemy.spellPower || 0)
                : def.spell && def.spell.kind === "damage_heal"
                  ? def.spell.damage + (s.enemy.spellPower || 0)
                  : undefined,
          heal:
            def.spell && def.spell.kind === "heal" ? def.spell.amount : undefined,
          aoe:
            !!def.spell &&
            def.spell.kind === "damage" &&
            (def.spell.target === "all_enemies" ||
              def.spell.target === "all_enemy_minions"),
        }),
      );
      s = trial;
      setState(s);
    } else {
      s = trial;
      setState(s);
    }

    await wait(180);
    if (s.phase === "victory" || s.phase === "defeat") return;
  }

  safety = 14;
  while (safety-- > 0) {
    const attackers = s.enemy.board.filter((m) => m.canAttack && m.attack > 0);
    if (attackers.length === 0) break;
    const attacker = attackers.sort((a, b) => b.attack - a.attack)[0]!;
    const target = pickAttackTarget(s, attacker);
    if (!target) {
      s = {
        ...s,
        enemy: {
          ...s.enemy,
          board: s.enemy.board.map((m) =>
            m.uid === attacker.uid ? { ...m, canAttack: false } : m,
          ),
        },
      };
      setState(s);
      continue;
    }
    if (playFx) {
      const atkDef = getCard(attacker.defId);
      await playFx(
        meleeFx({
          fromKey: entityKeyMinion(attacker.uid),
          toKey:
            target.kind === "hero"
              ? entityKeyHero(target.side)
              : entityKeyMinion(target.uid),
          damage: attacker.attack,
          returnDamage:
            target.kind === "minion"
              ? s.player.board.find((m) => m.uid === target.uid)?.attack ?? 0
              : 0,
          artSrc: cardArtSrc(attacker.defId),
          cardId: atkDef.id,
          cardName: atkDef.name,
          cardText: atkDef.text,
          keywords: attacker.keywords,
          school: atkDef.art,
        }),
      );
    }
    s = enemyAttack(s, attacker.uid, target);
    setState(s);
    await wait(200);
    if (s.phase === "victory" || s.phase === "defeat") return;
  }

  s = {
    ...s,
    animating: false,
    message: null,
  };
  setState(s);
}
