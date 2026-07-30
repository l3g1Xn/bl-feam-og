export type Keyword =
  | "taunt"
  | "charge"
  | "shield"
  | "lifesteal"
  | "rush"
  | "immune"
  | "reborn";

export type CardType = "minion" | "spell";

export type SpellEffect =
  | {
      kind: "damage";
      amount: number;
      target: "any" | "enemy" | "enemy_minion" | "all_enemies" | "all_enemy_minions";
    }
  | { kind: "heal"; amount: number; target: "friendly_hero" | "any_friendly" }
  | { kind: "buff"; attack: number; health: number; target: "friendly_minion" }
  | { kind: "draw"; count: number }
  | { kind: "damage_and_draw"; damage: number; draw: number; target: "enemy" }
  | { kind: "damage_heal"; damage: number; heal: number; target: "enemy" }
  | { kind: "spell_power"; amount: number; draw?: number }
  | { kind: "buff_all_friendly"; attack: number; health: number }
  | { kind: "aegis"; shield?: boolean }
  | {
      kind: "dominus_reximus";
      targetAttack: number;
      targetHealth: number;
      othersAttack: number;
      othersHealth: number;
    };

export interface CardDef {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  text: string;
  attack?: number;
  health?: number;
  keywords?: Keyword[];
  spell?: SpellEffect;
  art: "steel" | "ember" | "frost" | "shadow" | "nature" | "arcane";
  storeExclusive?: boolean;
}

export interface MinionInstance {
  uid: string;
  defId: string;
  attack: number;
  health: number;
  maxHealth: number;
  keywords: Keyword[];
  canAttack: boolean;
  canHitFace: boolean;
  attacksThisTurn: number;
  shield: boolean;
  immuneThisTurn: boolean;
}

export interface PlayerState {
  heroHp: number;
  heroMaxHp: number;
  mana: number;
  maxMana: number;
  hand: string[];
  deck: string[];
  board: MinionInstance[];
  fatigue: number;
  spellPower: number;
}

export type Phase =
  | "menu"
  | "mulligan"
  | "player_turn"
  | "enemy_turn"
  | "victory"
  | "defeat";

export type Selection =
  | { kind: "none" }
  | { kind: "minion"; uid: string }
  | {
      kind: "spell_target";
      handIndex: number;
      spell: SpellEffect;
      defId?: string;
    };

export type TargetRef =
  | { kind: "hero"; side: "player" | "enemy" }
  | { kind: "minion"; side: "player" | "enemy"; uid: string };

export interface CombatPreview {
  attackerName: string;
  defenderName: string;
  damageToDefender: number;
  damageToAttacker: number;
  defenderDies: boolean;
  attackerDies: boolean;
  overkill: number;
  shieldAbsorbed: boolean;
  lifestealHeal: number;
  formula: string;
}

export interface MathSnapshot {
  playerBoardAttack: number;
  enemyBoardAttack: number;
  playerBoardHealth: number;
  enemyBoardHealth: number;
  lethalOnEnemy: boolean;
  lethalGap: number;
  enemyLethalOnPlayer: boolean;
  enemyLethalGap: number;
  manaLeft: number;
  handValue: number;
  bestTradeHint: string | null;
  spellPower: number;
}

export interface LogEntry {
  id: number;
  text: string;
  tone: "neutral" | "player" | "enemy" | "math" | "system";
}

export interface GameState {
  phase: Phase;
  turn: number;
  player: PlayerState;
  enemy: PlayerState;
  /** 1337 callsign for the enemy hero this match. */
  enemyName: string;
  selection: Selection;
  log: LogEntry[];
  logSeq: number;
  lastPreview: CombatPreview | null;
  hoverPreview: CombatPreview | null;
  animating: boolean;
  message: string | null;
  difficulty: "normal" | "hard";
}
