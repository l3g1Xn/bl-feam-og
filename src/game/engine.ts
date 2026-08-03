/**
 * Battle Legions combat engine — pure, typed, deterministic rules.
 * Presentation (FX/SFX) never lives here; callers animate, then apply.
 */
import { getCard, buildStarterDeck } from "./cards";
import { randomEnemyLeetName } from "./leetNames";
import {
  computeCombatPreview,
  isValidSpellTarget,
  spellNeedsTarget,
} from "./math";
import type {
  CombatPreview,
  GameState,
  LogEntry,
  MinionInstance,
  PlayerState,
  SpellEffect,
  TargetRef,
} from "./types";
import type { CardDef } from "./types";

/* ─── numeric safety ─────────────────────────────────────────────── */

export function safeInt(n: unknown, fallback = 0): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.trunc(v);
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/* ─── ids ────────────────────────────────────────────────────────── */

let uidCounter = 0;
let actionSeq = 0;

export function nextUid(): string {
  uidCounter += 1;
  return `m${uidCounter}`;
}

/** Monotonic action id for lock / race diagnostics (not serialized). */
export function nextActionSeq(): number {
  actionSeq += 1;
  return actionSeq;
}

export function resetEngineIds(): void {
  uidCounter = 0;
  actionSeq = 0;
}

/* ─── RNG ────────────────────────────────────────────────────────── */

export function fisherYates<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

/* ─── factory ────────────────────────────────────────────────────── */

function emptyPlayer(deck: string[]): PlayerState {
  return {
    heroHp: 30,
    heroMaxHp: 30,
    mana: 0,
    maxMana: 0,
    hand: [],
    deck: fisherYates(deck),
    board: [],
    fatigue: 0,
    spellPower: 0,
  };
}

function pushLog(
  state: GameState,
  text: string,
  tone: LogEntry["tone"] = "neutral",
): GameState {
  const id = safeInt(state.logSeq) + 1;
  const entry: LogEntry = { id, text, tone };
  return {
    ...state,
    logSeq: id,
    log: [entry, ...state.log].slice(0, 48),
  };
}

function drawCards(
  p: PlayerState,
  n: number,
): { player: PlayerState; drawn: string[]; fatigueDmg: number } {
  let deck = [...p.deck];
  let hand = [...p.hand];
  let fatigue = safeInt(p.fatigue);
  let fatigueDmg = 0;
  const drawn: string[] = [];
  let heroHp = safeInt(p.heroHp);

  for (let i = 0; i < n; i++) {
    if (deck.length === 0) {
      fatigue += 1;
      fatigueDmg += fatigue;
      heroHp -= fatigue;
    } else if (hand.length >= 10) {
      deck.shift();
      drawn.push("~burn");
    } else {
      const c = deck.shift()!;
      hand.push(c);
      drawn.push(c);
    }
  }

  return {
    player: {
      ...p,
      deck,
      hand,
      fatigue,
      heroHp: clamp(safeInt(heroHp), 0, 999),
    },
    drawn,
    fatigueDmg,
  };
}

function createMinion(def: CardDef): MinionInstance {
  const keywords = [...(def.keywords ?? [])];
  const hasCharge = keywords.includes("charge");
  const hasRush = keywords.includes("rush");
  const atk = Math.max(0, safeInt(def.attack, 0));
  const hp = Math.max(1, safeInt(def.health, 1));
  return {
    uid: nextUid(),
    defId: def.id,
    attack: atk,
    health: hp,
    maxHealth: hp,
    keywords,
    canAttack: hasCharge || hasRush,
    canHitFace: hasCharge,
    attacksThisTurn: 0,
    shield: keywords.includes("shield"),
    immuneThisTurn: false,
  };
}

function sanitizePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    heroHp: clamp(safeInt(p.heroHp, 0), 0, safeInt(p.heroMaxHp, 30) || 30),
    heroMaxHp: Math.max(1, safeInt(p.heroMaxHp, 30)),
    mana: clamp(safeInt(p.mana, 0), 0, 10),
    maxMana: clamp(safeInt(p.maxMana, 0), 0, 10),
    fatigue: Math.max(0, safeInt(p.fatigue, 0)),
    spellPower: clamp(safeInt(p.spellPower, 0), 0, 99),
    board: (p.board ?? []).map((m) => ({
      ...m,
      attack: Math.max(0, safeInt(m.attack, 0)),
      health: safeInt(m.health, 0),
      maxHealth: Math.max(1, safeInt(m.maxHealth, 1)),
      attacksThisTurn: Math.max(0, safeInt(m.attacksThisTurn, 0)),
      keywords: Array.isArray(m.keywords) ? m.keywords : [],
      shield: !!m.shield,
      immuneThisTurn: !!m.immuneThisTurn,
      canAttack: !!m.canAttack,
      canHitFace: !!m.canHitFace,
    })),
    hand: Array.isArray(p.hand) ? p.hand.filter(Boolean) : [],
    deck: Array.isArray(p.deck) ? p.deck.filter(Boolean) : [],
  };
}

/** Sanitize a full state (load / resume safety). */
export function sanitizeGameState(state: GameState): GameState {
  return {
    ...state,
    turn: Math.max(0, safeInt(state.turn, 0)),
    player: sanitizePlayer(state.player),
    enemy: sanitizePlayer(state.enemy),
    enemyName: state.enemyName || "ENEMY",
    log: Array.isArray(state.log) ? state.log.slice(0, 48) : [],
    logSeq: Math.max(0, safeInt(state.logSeq, 0)),
    animating: !!state.animating,
    selection: state.selection ?? { kind: "none" },
  };
}

export function createNewGame(
  difficulty: "normal" | "hard" = "normal",
  playerDeck?: string[],
): GameState {
  resetEngineIds();
  const deck =
    playerDeck && playerDeck.length >= 20 ? playerDeck : buildStarterDeck();
  const enemyDeck = buildStarterDeck();
  let player = emptyPlayer(deck);
  let enemy = emptyPlayer(enemyDeck);
  player = drawCards(player, 3).player;
  enemy = drawCards(enemy, 4).player;
  const enemyName = randomEnemyLeetName();
  return sanitizeGameState({
    phase: "mulligan",
    turn: 0,
    player,
    enemy,
    enemyName,
    selection: { kind: "none" },
    log: [
      { id: 1, text: `Opponent linked: ${enemyName}`, tone: "system" },
      {
        id: 2,
        text: "Opening hand — keep a curve you can afford.",
        tone: "system",
      },
    ],
    logSeq: 2,
    lastPreview: null,
    hoverPreview: null,
    animating: false,
    message: null,
    difficulty,
  });
}

export function confirmMulligan(
  state: GameState,
  redrawIndices: number[],
): GameState {
  if (state.phase !== "mulligan") return state;
  let player = state.player;
  const keep: string[] = [];
  const redraw: string[] = [];
  const redrawSet = new Set(redrawIndices.map((i) => safeInt(i)));
  player.hand.forEach((id, i) => {
    if (redrawSet.has(i)) redraw.push(id);
    else keep.push(id);
  });
  let deck = fisherYates([...player.deck, ...redraw]);
  const drawn: string[] = [];
  for (let i = 0; i < redraw.length; i++) {
    if (deck.length === 0) break;
    drawn.push(deck.shift()!);
  }
  player = {
    ...player,
    hand: [...keep, ...drawn],
    deck,
    maxMana: 1,
    mana: 1,
  };
  player = drawCards(player, 1).player;
  let next: GameState = {
    ...state,
    phase: "player_turn",
    turn: 1,
    player,
    selection: { kind: "none" },
    message: null,
    animating: false,
  };
  next = pushLog(next, "Turn 1 — 1 mana. Every point matters.", "system");
  return sanitizeGameState(next);
}

function inputBlocked(state: GameState): boolean {
  return !!state.animating;
}

export function selectHandCard(state: GameState, index: number): GameState {
  if (state.phase !== "player_turn" || inputBlocked(state)) return state;
  const cardId = state.player.hand[index];
  if (!cardId) return state;
  const def = getCard(cardId);
  if (def.cost > state.player.mana) {
    return {
      ...state,
      message: `Need ${def.cost} mana (have ${state.player.mana}).`,
    };
  }
  if (def.type === "spell" && def.spell) {
    if (!spellNeedsTarget(def.spell)) return playSpell(state, index, null);
    return {
      ...state,
      selection: {
        kind: "spell_target",
        handIndex: index,
        spell: def.spell,
        defId: def.id,
      },
      message: `Choose a target for ${def.name}.`,
      hoverPreview: null,
    };
  }
  if (state.player.board.length >= 7) {
    return { ...state, message: "Board is full (7)." };
  }
  return playMinion(state, index);
}

function playMinion(state: GameState, handIndex: number): GameState {
  const cardId = state.player.hand[handIndex];
  if (!cardId) return state;
  const def = getCard(cardId);
  if (def.type !== "minion") return state;
  if (def.cost > state.player.mana) return state;
  if (state.player.board.length >= 7) return state;
  const hand = [...state.player.hand];
  hand.splice(handIndex, 1);
  const minion = createMinion(def);
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      hand,
      mana: Math.max(0, state.player.mana - def.cost),
      board: [...state.player.board, minion],
    },
    selection: { kind: "none" },
    message: null,
  };
  const stats = `${minion.attack}/${minion.health}`;
  const kw = minion.keywords.length ? ` [${minion.keywords.join(", ")}]` : "";
  next = pushLog(
    next,
    `Play ${def.name} ${stats}${kw} (−${def.cost} mana → ${next.player.mana} left)`,
    "player",
  );
  const value = (minion.attack + minion.health) / Math.max(1, def.cost);
  next = pushLog(
    next,
    `Value: (${minion.attack}+${minion.health})/${def.cost} = ${value.toFixed(2)} stats/mana`,
    "math",
  );
  return next;
}

export function resolveSpellTarget(
  state: GameState,
  target: TargetRef,
): GameState {
  if (state.selection.kind !== "spell_target") return state;
  const { handIndex } = state.selection;
  const cardId = state.player.hand[handIndex];
  if (!cardId) {
    return {
      ...state,
      selection: { kind: "none" },
      message: "Spell is no longer in hand.",
      animating: false,
    };
  }
  const def = getCard(cardId);
  if (def.type !== "spell" || !def.spell) {
    return {
      ...state,
      selection: { kind: "none" },
      message: "Invalid spell selection.",
      animating: false,
    };
  }
  if (!isValidSpellTarget(def.spell, target, state)) {
    return { ...state, message: "Invalid target for this spell." };
  }
  return playSpell(state, handIndex, target);
}

export function playSpell(
  state: GameState,
  handIndex: number,
  target: TargetRef | null,
): GameState {
  const cardId = state.player.hand[handIndex];
  if (!cardId) return state;
  const def = getCard(cardId);
  if (def.type !== "spell" || !def.spell) return state;
  if (def.cost > state.player.mana) return state;
  if (spellNeedsTarget(def.spell)) {
    if (!target || !isValidSpellTarget(def.spell, target, state)) {
      return { ...state, message: "Invalid target for this spell." };
    }
  }
  const hand = [...state.player.hand];
  hand.splice(handIndex, 1);
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      hand,
      mana: Math.max(0, state.player.mana - def.cost),
    },
    selection: { kind: "none" },
    message: null,
    animating: false,
  };
  next = pushLog(
    next,
    `Cast ${def.name} (−${def.cost} mana → ${next.player.mana} left)`,
    "player",
  );
  next = applySpell(next, "player", def.spell, target);
  return checkWinner(next);
}

function applySpell(
  state: GameState,
  caster: "player" | "enemy",
  spell: SpellEffect,
  target: TargetRef | null,
): GameState {
  let next = state;
  const ally = caster;
  const foe = caster === "player" ? "enemy" : "player";
  const sp = Math.max(0, safeInt(next[ally].spellPower));

  switch (spell.kind) {
    case "draw": {
      const d = drawCards(next[ally], spell.count);
      next = { ...next, [ally]: d.player };
      next = pushLog(
        next,
        `Draw ${spell.count} · hand ${d.player.hand.length}`,
        "math",
      );
      break;
    }
    case "spell_power": {
      const p = next[ally];
      const spellPower = Math.min(99, (p.spellPower || 0) + spell.amount);
      next = { ...next, [ally]: { ...p, spellPower } };
      next = pushLog(
        next,
        `Spell Power +${spell.amount} → ${spellPower}`,
        "math",
      );
      if (spell.draw && spell.draw > 0) {
        const d = drawCards(next[ally], spell.draw);
        next = { ...next, [ally]: d.player };
        next = pushLog(next, `Draw ${spell.draw}`, "math");
      }
      break;
    }
    case "buff_all_friendly": {
      const board = next[ally].board.map((m) => ({
        ...m,
        attack: Math.max(0, m.attack + spell.attack),
        health: m.health + spell.health,
        maxHealth: m.maxHealth + spell.health,
      }));
      next = { ...next, [ally]: { ...next[ally], board } };
      next = pushLog(
        next,
        `All friendlies +${spell.attack}/+${spell.health}`,
        "math",
      );
      break;
    }
    case "aegis":
      if (target?.kind === "minion" && target.side === ally) {
        const board = next[ally].board.map((m) => {
          if (m.uid !== target.uid) return m;
          return {
            ...m,
            immuneThisTurn: true,
            shield: spell.shield ? true : m.shield,
          };
        });
        next = { ...next, [ally]: { ...next[ally], board } };
        next = pushLog(
          next,
          `Aegis — Immune this turn` + (spell.shield ? " + Shield" : ""),
          "math",
        );
      }
      break;
    case "dominus_reximus":
      if (target?.kind === "minion" && target.side === ally) {
        const board = next[ally].board.map((m) => {
          if (m.uid === target.uid) {
            const keywords = Array.from(
              new Set([...m.keywords, "immune", "reborn", "taunt"]),
            ) as MinionInstance["keywords"];
            return {
              ...m,
              attack: m.attack + spell.targetAttack,
              health: m.health + spell.targetHealth,
              maxHealth: m.maxHealth + spell.targetHealth,
              keywords,
            };
          }
          return {
            ...m,
            attack: Math.max(0, m.attack + spell.othersAttack),
            health: m.health + spell.othersHealth,
            maxHealth: m.maxHealth + spell.othersHealth,
            immuneThisTurn: true,
          };
        });
        const name = getCard(
          board.find((m) => m.uid === target.uid)?.defId ?? "squire",
        ).name;
        next = { ...next, [ally]: { ...next[ally], board } };
        next = pushLog(
          next,
          `Dominus Reximus on ${name}: +${spell.targetAttack}/+${spell.targetHealth} Immune Reborn · others +${spell.othersAttack}/+${spell.othersHealth} Immune this turn`,
          "math",
        );
      }
      break;
    case "heal":
      if (
        spell.target === "friendly_hero" ||
        (target?.kind === "hero" && target.side === ally)
      ) {
        const p = next[ally];
        const before = p.heroHp;
        const heroHp = Math.min(
          p.heroMaxHp,
          Math.max(0, p.heroHp + spell.amount),
        );
        next = { ...next, [ally]: { ...p, heroHp } };
        next = pushLog(
          next,
          `Heal ${before} → ${heroHp} (+${heroHp - before})`,
          "math",
        );
      } else if (target?.kind === "minion" && target.side === ally) {
        next = damageMinion(next, ally, target.uid, -spell.amount);
        next = pushLog(next, `Heal +${spell.amount} on minion`, "math");
      }
      break;
    case "buff":
      if (target?.kind === "minion" && target.side === ally) {
        const board = next[ally].board.map((m) => {
          if (m.uid !== target.uid) return m;
          return {
            ...m,
            attack: Math.max(0, m.attack + spell.attack),
            health: m.health + spell.health,
            maxHealth: m.maxHealth + spell.health,
          };
        });
        const name = getCard(
          board.find((m) => m.uid === target.uid)?.defId ?? "squire",
        ).name;
        next = { ...next, [ally]: { ...next[ally], board } };
        next = pushLog(
          next,
          `Buff +${spell.attack}/+${spell.health} on ${name}`,
          "math",
        );
      }
      break;
    case "damage": {
      const amt = spell.amount + sp;
      if (spell.target === "all_enemy_minions") {
        for (const m of [...next[foe].board]) {
          next = damageMinion(next, foe, m.uid, amt);
        }
        next = pushLog(
          next,
          `AoE ${amt} to all enemy minions (SP ${sp})`,
          "math",
        );
      } else if (spell.target === "all_enemies") {
        const p = next[foe];
        next = {
          ...next,
          [foe]: { ...p, heroHp: Math.max(0, p.heroHp - amt) },
        };
        for (const m of [...next[foe].board]) {
          next = damageMinion(next, foe, m.uid, amt);
        }
        next = pushLog(next, `AoE ${amt} to all enemies (SP ${sp})`, "math");
      } else if (target) {
        if (target.kind === "hero") {
          const side = target.side;
          const p = next[side];
          next = {
            ...next,
            [side]: { ...p, heroHp: Math.max(0, p.heroHp - amt) },
          };
          next = pushLog(
            next,
            `${amt} dmg to ${side === "player" ? "you" : "enemy"} → ${next[side].heroHp} HP (SP ${sp})`,
            "math",
          );
        } else {
          next = damageMinion(next, target.side, target.uid, amt);
          next = pushLog(next, `${amt} spell damage (SP ${sp})`, "math");
        }
      }
      break;
    }
    case "damage_and_draw": {
      const amt = spell.damage + sp;
      if (target) {
        if (target.kind === "hero") {
          const p = next[target.side];
          next = {
            ...next,
            [target.side]: { ...p, heroHp: Math.max(0, p.heroHp - amt) },
          };
        } else {
          next = damageMinion(next, target.side, target.uid, amt);
        }
      }
      if (spell.draw > 0) {
        const d = drawCards(next[ally], spell.draw);
        next = { ...next, [ally]: d.player };
      }
      next = pushLog(
        next,
        `${amt} dmg (SP ${sp})` +
          (spell.draw > 0 ? ` + draw ${spell.draw}` : ""),
        "math",
      );
      break;
    }
    case "damage_heal": {
      const amt = spell.damage + sp;
      if (target) {
        if (target.kind === "hero") {
          const p = next[target.side];
          next = {
            ...next,
            [target.side]: { ...p, heroHp: Math.max(0, p.heroHp - amt) },
          };
        } else {
          next = damageMinion(next, target.side, target.uid, amt);
        }
      }
      const me = next[ally];
      const heroHp = Math.min(me.heroMaxHp, me.heroHp + spell.heal);
      next = { ...next, [ally]: { ...me, heroHp } };
      next = pushLog(
        next,
        `${amt} dmg (SP ${sp}) · heal ${spell.heal} → ${heroHp} HP`,
        "math",
      );
      break;
    }
  }
  return resolveBoard(next);
}

function isImmune(m: MinionInstance): boolean {
  return m.immuneThisTurn || m.keywords.includes("immune");
}

function damageMinion(
  state: GameState,
  side: "player" | "enemy",
  uid: string,
  amount: number,
): GameState {
  if (!Number.isFinite(amount)) return state;
  const board = state[side].board.map((m) => {
    if (m.uid !== uid) return m;
    if (amount < 0) {
      const health = Math.min(m.maxHealth, m.health - amount);
      return { ...m, health: Number.isFinite(health) ? health : m.health };
    }
    if (amount > 0 && isImmune(m)) return m;
    if (m.shield && amount > 0) return { ...m, shield: false };
    const health = m.health - amount;
    return { ...m, health: Number.isFinite(health) ? health : 0 };
  });
  return { ...state, [side]: { ...state[side], board } };
}

/** Apply Reborn then drop corpses. */
function resolveBoard(state: GameState): GameState {
  const revive = (board: MinionInstance[]): MinionInstance[] => {
    const out: MinionInstance[] = [];
    for (const m of board) {
      if (Number.isFinite(m.health) && m.health > 0) {
        out.push(m);
        continue;
      }
      if (m.keywords.includes("reborn")) {
        out.push({
          ...m,
          health: 1,
          maxHealth: Math.max(1, m.maxHealth),
          keywords: m.keywords.filter((k) => k !== "reborn"),
          canAttack: false,
          canHitFace: false,
          attacksThisTurn: 0,
          shield: false,
          immuneThisTurn: false,
        });
      }
    }
    return out;
  };
  return {
    ...state,
    player: {
      ...state.player,
      board: revive(state.player.board),
      heroHp: Number.isFinite(state.player.heroHp) ? state.player.heroHp : 0,
      spellPower: Number.isFinite(state.player.spellPower)
        ? state.player.spellPower
        : 0,
    },
    enemy: {
      ...state.enemy,
      board: revive(state.enemy.board),
      heroHp: Number.isFinite(state.enemy.heroHp) ? state.enemy.heroHp : 0,
      spellPower: Number.isFinite(state.enemy.spellPower)
        ? state.enemy.spellPower
        : 0,
    },
  };
}

/** Resolve incoming damage onto a minion (shield / immune). */
function takeDamage(
  m: MinionInstance,
  damage: number,
  shieldAbsorbed: boolean,
): MinionInstance {
  if (shieldAbsorbed) return { ...m, shield: false };
  if (damage <= 0) return m;
  if (isImmune(m)) return m;
  if (m.shield) return { ...m, shield: false };
  const health = m.health - damage;
  return { ...m, health: Number.isFinite(health) ? health : 0 };
}

export function performAttack(
  state: GameState,
  attackerUid: string,
  target: TargetRef,
): GameState {
  const atkSide: "player" | "enemy" = state.player.board.some(
    (m) => m.uid === attackerUid,
  )
    ? "player"
    : "enemy";
  const defSide = target.side;
  const attacker = state[atkSide].board.find((m) => m.uid === attackerUid);
  if (!attacker || !attacker.canAttack) return state;
  if (target.kind === "hero" && !attacker.canHitFace) return state;

  let next = state;

  if (target.kind === "hero") {
    const hero = next[defSide];
    const preview: CombatPreview = computeCombatPreview(
      attacker,
      "hero",
      defSide === "player" ? "You" : state.enemyName || "Enemy",
      hero.heroHp,
      false,
    );
    const heroHp = Math.max(0, hero.heroHp - preview.damageToDefender);
    const atkBoard = next[atkSide].board.map((m) => {
      if (m.uid !== attackerUid) return m;
      return {
        ...m,
        canAttack: false,
        attacksThisTurn: m.attacksThisTurn + 1,
      };
    });
    let atkPlayer: PlayerState = { ...next[atkSide], board: atkBoard };
    if (preview.lifestealHeal > 0) {
      atkPlayer = {
        ...atkPlayer,
        heroHp: Math.min(
          atkPlayer.heroMaxHp,
          atkPlayer.heroHp + preview.lifestealHeal,
        ),
      };
    }
    next = {
      ...next,
      [defSide]: { ...hero, heroHp },
      [atkSide]: atkPlayer,
      lastPreview: preview,
      selection: { kind: "none" },
      message: null,
      animating: false,
    };
    next = pushLog(next, preview.formula, "math");
    next = pushLog(
      next,
      `${preview.attackerName} hits ${preview.defenderName} for ${preview.damageToDefender}`,
      atkSide === "player" ? "player" : "enemy",
    );
  } else {
    const defender = next[defSide].board.find((m) => m.uid === target.uid);
    if (!defender) return state;
    const preview = computeCombatPreview(
      attacker,
      defender,
      getCard(defender.defId).name,
      defender.health,
      defender.shield,
    );

    const atkBoard = next[atkSide].board.map((m) => {
      if (m.uid !== attackerUid) return m;
      let updated: MinionInstance;
      if (preview.damageToAttacker > 0) {
        updated = takeDamage(m, preview.damageToAttacker, false);
      } else if (
        m.shield &&
        defender.attack > 0 &&
        !isImmune(m)
      ) {
        // Return damage absorbed by Divine Shield — break shield
        updated = { ...m, shield: false };
      } else {
        updated = m;
      }
      return {
        ...updated,
        canAttack: false,
        attacksThisTurn: m.attacksThisTurn + 1,
      };
    });

    const defBoard = next[defSide].board.map((m) => {
      if (m.uid !== target.uid) return m;
      return takeDamage(m, preview.damageToDefender, preview.shieldAbsorbed);
    });

    let atkPlayer: PlayerState = { ...next[atkSide], board: atkBoard };
    if (preview.lifestealHeal > 0) {
      atkPlayer = {
        ...atkPlayer,
        heroHp: Math.min(
          atkPlayer.heroMaxHp,
          atkPlayer.heroHp + preview.lifestealHeal,
        ),
      };
    }
    next = {
      ...next,
      [atkSide]: atkPlayer,
      [defSide]: { ...next[defSide], board: defBoard },
      lastPreview: preview,
      selection: { kind: "none" },
      message: null,
      animating: false,
    };
    next = pushLog(next, preview.formula, "math");
    next = pushLog(
      next,
      `${preview.attackerName} vs ${preview.defenderName}` +
        (preview.defenderDies ? " — destroyed" : "") +
        (preview.attackerDies ? " — attacker falls" : ""),
      atkSide === "player" ? "player" : "enemy",
    );
    next = resolveBoard(next);
  }
  return checkWinner(next);
}

function checkWinner(state: GameState): GameState {
  if (state.enemy.heroHp <= 0) {
    return {
      ...state,
      phase: "victory",
      message: `Victory — ${state.enemyName || "enemy"} core offline.`,
      selection: { kind: "none" },
      animating: false,
    };
  }
  if (state.player.heroHp <= 0) {
    return {
      ...state,
      phase: "defeat",
      message: "Defeat — your hero at 0.",
      selection: { kind: "none" },
      animating: false,
    };
  }
  return state;
}

function readyBoard(board: MinionInstance[]): MinionInstance[] {
  return board.map((m) => ({
    ...m,
    canAttack: m.attack > 0,
    canHitFace: true,
    attacksThisTurn: 0,
    immuneThisTurn: false,
  }));
}

export function endPlayerTurn(state: GameState): GameState {
  if (state.phase !== "player_turn" || state.animating) return state;
  const maxMana = Math.min(10, state.turn);
  let enemy: PlayerState = {
    ...state.enemy,
    maxMana,
    mana: maxMana,
    board: readyBoard(state.enemy.board),
  };
  const d = drawCards(enemy, 1);
  enemy = d.player;
  const playerBoard = state.player.board.map((m) => ({
    ...m,
    immuneThisTurn: false,
  }));
  let next: GameState = {
    ...state,
    player: { ...state.player, board: playerBoard },
    enemy,
    selection: { kind: "none" },
    phase: "enemy_turn",
    message: "Enemy turn…",
    hoverPreview: null,
    animating: false,
  };
  if (d.fatigueDmg > 0) {
    next = pushLog(next, `Enemy fatigue ${d.fatigueDmg}`, "system");
  }
  return checkWinner(next);
}

export function afterEnemyTurn(state: GameState): GameState {
  const turn = state.turn + 1;
  let player = state.player;
  const maxMana = Math.min(10, turn);
  player = {
    ...player,
    maxMana,
    mana: maxMana,
    board: readyBoard(player.board),
  };
  const enemyBoard = state.enemy.board.map((m) => ({
    ...m,
    immuneThisTurn: false,
  }));
  const d = drawCards(player, 1);
  player = d.player;
  let next: GameState = {
    ...state,
    enemy: { ...state.enemy, board: enemyBoard },
    phase: "player_turn",
    turn,
    player,
    selection: { kind: "none" },
    message: null,
    animating: false,
  };
  if (d.fatigueDmg > 0) {
    next = pushLog(next, `Fatigue ${d.fatigueDmg}`, "system");
  }
  next = pushLog(next, `Turn ${turn} — ${maxMana} mana`, "system");
  return checkWinner(next);
}

export function clearSelection(state: GameState): GameState {
  return {
    ...state,
    selection: { kind: "none" },
    message: state.selection.kind === "spell_target" ? null : state.message,
    hoverPreview: null,
  };
}

export function setHoverPreview(
  state: GameState,
  preview: CombatPreview | null,
): GameState {
  return { ...state, hoverPreview: preview };
}

export function enemyPlayMinion(
  state: GameState,
  handIndex: number,
): GameState {
  const cardId = state.enemy.hand[handIndex];
  if (!cardId) return state;
  const def = getCard(cardId);
  if (def.type !== "minion" || def.cost > state.enemy.mana) return state;
  if (state.enemy.board.length >= 7) return state;
  const hand = [...state.enemy.hand];
  hand.splice(handIndex, 1);
  const minion = createMinion(def);
  let next: GameState = {
    ...state,
    enemy: {
      ...state.enemy,
      hand,
      mana: state.enemy.mana - def.cost,
      board: [...state.enemy.board, minion],
    },
  };
  next = pushLog(
    next,
    `Enemy plays ${def.name} ${minion.attack}/${minion.health} (−${def.cost})`,
    "enemy",
  );
  return next;
}

export function enemyPlaySpell(
  state: GameState,
  handIndex: number,
  target: TargetRef | null,
): GameState {
  const cardId = state.enemy.hand[handIndex];
  if (!cardId) return state;
  const def = getCard(cardId);
  if (def.type !== "spell" || !def.spell || def.cost > state.enemy.mana) {
    return state;
  }
  const hand = [...state.enemy.hand];
  hand.splice(handIndex, 1);
  let next: GameState = {
    ...state,
    enemy: {
      ...state.enemy,
      hand,
      mana: state.enemy.mana - def.cost,
    },
  };
  next = pushLog(next, `Enemy casts ${def.name}`, "enemy");
  next = applySpell(next, "enemy", def.spell, target);
  return checkWinner(next);
}

export function enemyAttack(
  state: GameState,
  attackerUid: string,
  target: TargetRef,
): GameState {
  return performAttack(state, attackerUid, target);
}
