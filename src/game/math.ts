import { getCard, minionValueScore } from "./cards";
import type {
  CombatPreview,
  GameState,
  MathSnapshot,
  MinionInstance,
  PlayerState,
  SpellEffect,
  TargetRef,
} from "./types";

export function boardAttack(board: MinionInstance[]): number {
  return board.reduce((s, m) => s + m.attack, 0);
}

export function boardHealth(board: MinionInstance[]): number {
  return board.reduce((s, m) => s + m.health, 0);
}

export function readyAttack(board: MinionInstance[]): number {
  return board
    .filter((m) => m.canAttack && m.attack > 0)
    .reduce((s, m) => s + m.attack, 0);
}

export function readyFaceAttack(board: MinionInstance[]): number {
  return board
    .filter((m) => m.canAttack && m.canHitFace && m.attack > 0)
    .reduce((s, m) => s + m.attack, 0);
}

export function hasTaunt(board: MinionInstance[]): boolean {
  return board.some((m) => m.keywords.includes("taunt") && m.health > 0);
}

export function tauntUids(board: MinionInstance[]): string[] {
  return board
    .filter((m) => m.keywords.includes("taunt") && m.health > 0)
    .map((m) => m.uid);
}

export function isMinionImmune(m: MinionInstance): boolean {
  return m.immuneThisTurn || m.keywords.includes("immune");
}

export function computeCombatPreview(
  attacker: MinionInstance,
  defender: MinionInstance | "hero",
  defenderName: string,
  defenderHp: number,
  defenderHasShield: boolean,
): CombatPreview {
  const atkName = getCard(attacker.defId).name;
  const dmgOut = attacker.attack;
  let shieldAbsorbed = false;
  let damageToDefender = dmgOut;
  let overkill = 0;
  let defenderDies = false;

  const defImmune =
    defender !== "hero" && isMinionImmune(defender);
  const atkImmune = isMinionImmune(attacker);

  if (defender === "hero") {
    damageToDefender = dmgOut;
    defenderDies = defenderHp - dmgOut <= 0;
    overkill = Math.max(0, dmgOut - defenderHp);
  } else if (defImmune) {
    damageToDefender = 0;
    defenderDies = false;
  } else if (defenderHasShield) {
    shieldAbsorbed = true;
    damageToDefender = 0;
    defenderDies = false;
  } else {
    damageToDefender = dmgOut;
    defenderDies = defenderHp - dmgOut <= 0;
    overkill = Math.max(0, dmgOut - defenderHp);
  }

  let damageToAttacker = 0;
  let attackerDies = false;
  if (defender !== "hero") {
    damageToAttacker = atkImmune ? 0 : defender.attack;
    if (!atkImmune && attacker.shield) {
      damageToAttacker = 0;
    } else if (!atkImmune) {
      attackerDies = attacker.health - damageToAttacker <= 0;
    }
  }

  const lifestealHeal = attacker.keywords.includes("lifesteal")
    ? damageToDefender
    : 0;

  let formula: string;
  if (defender === "hero") {
    formula = `${dmgOut} ATK → face (${defenderHp} HP) → ${Math.max(0, defenderHp - dmgOut)} left`;
    if (overkill > 0) formula += ` · overkill ${overkill}`;
    if (lifestealHeal > 0) formula += ` · heal ${lifestealHeal}`;
  } else if (defImmune) {
    formula = `${dmgOut} ATK vs Immune → 0 damage · return blocked`;
  } else if (shieldAbsorbed) {
    formula = `${dmgOut} ATK vs Shield → shield breaks · return ${defender.attack} ATK`;
    if (attacker.shield) formula += ` (your Shield absorbs)`;
    else formula += ` → you take ${damageToAttacker}`;
  } else {
    formula = `${dmgOut} vs ${defenderHp} HP → ${Math.max(0, defenderHp - dmgOut)} left · return ${defender.attack}`;
    if (attacker.shield) formula += ` (Shield)`;
    else
      formula += ` → you ${
        attacker.health - damageToAttacker <= 0
          ? "die"
          : `at ${attacker.health - damageToAttacker}`
      }`;
    if (overkill > 0) formula += ` · overkill ${overkill}`;
    if (lifestealHeal > 0) formula += ` · heal ${lifestealHeal}`;
  }

  return {
    attackerName: atkName,
    defenderName,
    damageToDefender,
    damageToAttacker,
    defenderDies,
    attackerDies,
    overkill,
    shieldAbsorbed,
    lifestealHeal,
    formula,
  };
}

export function computeMathSnapshot(state: GameState): MathSnapshot {
  const { player, enemy } = state;
  const playerBoardAttack = boardAttack(player.board);
  const enemyBoardAttack = boardAttack(enemy.board);
  const playerBoardHealth = boardHealth(player.board);
  const enemyBoardHealth = boardHealth(enemy.board);
  const readyFace = readyFaceAttack(player.board);
  const lethalGap = enemy.heroHp - readyFace;
  const lethalOnEnemy = readyFace >= enemy.heroHp && !hasTaunt(enemy.board);

  const enemyReadyFace = readyFaceAttack(enemy.board);
  const enemyLethalGap = player.heroHp - enemyReadyFace;
  const enemyLethalOnPlayer =
    enemyReadyFace >= player.heroHp && !hasTaunt(player.board);

  let handValue = 0;
  for (const id of player.hand) {
    const c = getCard(id);
    if (c.type === "minion" && c.attack != null && c.health != null) {
      handValue += minionValueScore(c.attack, c.health, c.cost);
    } else {
      handValue += c.cost > 0 ? 1.5 : 1;
    }
  }

  const bestTradeHint = findBestTradeHint(player, enemy);

  return {
    playerBoardAttack,
    enemyBoardAttack,
    playerBoardHealth,
    enemyBoardHealth,
    lethalOnEnemy,
    lethalGap: Math.max(0, lethalGap),
    enemyLethalOnPlayer,
    enemyLethalGap: Math.max(0, enemyLethalGap),
    manaLeft: player.mana,
    handValue: Math.round(handValue * 10) / 10,
    bestTradeHint,
    spellPower: player.spellPower ?? 0,
  };
}

function findBestTradeHint(
  player: PlayerState,
  enemy: PlayerState,
): string | null {
  if (player.board.length === 0 || enemy.board.length === 0) return null;

  let best: { score: number; text: string } | null = null;

  for (const a of player.board) {
    if (!a.canAttack || a.attack <= 0) continue;
    for (const d of enemy.board) {
      if (hasTaunt(enemy.board) && !d.keywords.includes("taunt")) continue;
      const preview = computeCombatPreview(
        a,
        d,
        getCard(d.defId).name,
        d.health,
        d.shield,
      );
      let score = 0;
      if (preview.defenderDies) score += 10 + d.attack + d.health;
      else score += preview.damageToDefender;
      if (!preview.attackerDies) score += 5;
      else score -= a.attack;
      score -= preview.overkill * 0.5;
      const text = preview.defenderDies
        ? preview.attackerDies
          ? `${getCard(a.defId).name} trades into ${getCard(d.defId).name} (mutual)`
          : `${getCard(a.defId).name} cleanly kills ${getCard(d.defId).name}`
        : `${getCard(a.defId).name} chips ${getCard(d.defId).name} for ${preview.damageToDefender}`;
      if (!best || score > best.score) best = { score, text };
    }
  }

  return best?.text ?? null;
}

export function spellNeedsTarget(spell: SpellEffect): boolean {
  if (spell.kind === "draw") return false;
  if (spell.kind === "spell_power") return false;
  if (spell.kind === "buff_all_friendly") return false;
  if (spell.kind === "heal" && spell.target === "friendly_hero") return false;
  if (
    spell.kind === "damage" &&
    (spell.target === "all_enemies" || spell.target === "all_enemy_minions")
  )
    return false;
  return true;
}

export function isValidSpellTarget(
  spell: SpellEffect,
  target: TargetRef,
  state: GameState,
): boolean {
  switch (spell.kind) {
    case "draw":
    case "spell_power":
    case "buff_all_friendly":
      return false;
    case "heal":
      if (spell.target === "friendly_hero")
        return target.kind === "hero" && target.side === "player";
      return target.side === "player";
    case "buff":
    case "aegis":
      return target.kind === "minion" && target.side === "player";
    case "dominus_reximus": {
      if (target.kind !== "minion" || target.side !== "player") return false;
      const m = state.player.board.find((x) => x.uid === target.uid);
      return !!m && m.keywords.includes("taunt");
    }
    case "damage":
      if (spell.target === "any") return true;
      if (spell.target === "enemy") return target.side === "enemy";
      if (spell.target === "enemy_minion")
        return target.kind === "minion" && target.side === "enemy";
      return false;
    case "damage_and_draw":
    case "damage_heal":
      return target.side === "enemy";
    default:
      return false;
  }
}

export function describeSpellMath(spell: SpellEffect, spellPower = 0): string {
  const sp = Math.max(0, spellPower | 0);
  switch (spell.kind) {
    case "damage": {
      const amt = spell.amount + sp;
      if (spell.target === "all_enemies")
        return `Σ dmg = ${amt} (base ${spell.amount}+SP ${sp}) × all enemies`;
      if (spell.target === "all_enemy_minions")
        return `${amt} × each enemy minion (SP ${sp})`;
      return `${amt} dmg (base ${spell.amount} + SP ${sp})`;
    }
    case "heal":
      return `HP = min(max, current + ${spell.amount})`;
    case "buff":
      return `ATK+${spell.attack}, HP+${spell.health}`;
    case "draw":
      return `hand += ${spell.count}`;
    case "damage_and_draw":
      return `${spell.damage + sp} dmg (SP ${sp}) + draw ${spell.draw}`;
    case "damage_heal":
      return `${spell.damage + sp} dmg (SP ${sp}) · heal hero ${spell.heal}`;
    case "spell_power":
      return `spellPower += ${spell.amount}` + (spell.draw ? ` · draw ${spell.draw}` : "");
    case "buff_all_friendly":
      return `all friendlies +${spell.attack}/+${spell.health}`;
    case "aegis":
      return `Immune this turn` + (spell.shield ? " + Shield" : "");
    case "dominus_reximus":
      return `Taunt target +${spell.targetAttack}/+${spell.targetHealth} Immune Reborn · others +${spell.othersAttack}/+${spell.othersHealth} Immune this turn`;
  }
}
