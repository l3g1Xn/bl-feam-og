import { useGameStore } from "@/game/store";
import { getCard } from "@/game/cards";
import { describeSpellMath, hasTaunt, spellNeedsTarget } from "@/game/math";
import { CardView } from "./CardView";
import { MinionToken } from "./MinionToken";
import { HeroPortrait } from "./HeroPortrait";
import { MathPanel } from "./MathPanel";
import { BattleLog } from "./BattleLog";
import { CombatFxLayer } from "./CombatFxLayer";
import { Launcher } from "./Launcher";
import { AmbientStage } from "./AmbientStage";
import { GameMenu } from "./GameMenu";
import { BiometricGate } from "./BiometricGate";
import { useMetaStore, type MatchRewardResult } from "@/game/meta";
import { GAME_TITLE_SHORT } from "@/game/brand";
import { playSfx, unlockAudio } from "@/game/audio";
import { setBattleMusicDuck, ensureMusicUnlocked } from "@/game/music";
import { cn } from "@/lib/utils";
import { Menu, RotateCcw, SkipForward, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SpellEffect } from "@/game/types";

export function GameApp() {
  return (
    <BiometricGate>
      <GameAppInner />
    </BiometricGate>
  );
}

function GameAppInner() {
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    if (phase === "menu" || phase === "victory" || phase === "defeat") {
      setBattleMusicDuck(false);
    } else {
      setBattleMusicDuck(true);
    }
  }, [phase]);

  if (phase === "menu") return <Launcher />;
  if (phase === "mulligan") return <MulliganScreen />;
  if (phase === "victory" || phase === "defeat") return <EndScreen />;
  return <BattleScreen />;
}

function MulliganScreen() {
  const hand = useGameStore((s) => s.player.hand);
  const selected = useGameStore((s) => s.mulliganSelected);
  const toggle = useGameStore((s) => s.toggleMulligan);
  const confirm = useGameStore((s) => s.confirmMulligan);
  const enemyName = useGameStore((s) => s.enemyName);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative flex h-dvh flex-col items-center justify-center overflow-y-auto bg-bg px-3 py-6 sm:px-4">
      <AmbientStage variant="launcher" />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: "url(/ui/bg_command_hd.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <button
        type="button"
        onClick={() => {
          unlockAudio();
          setMenuOpen(true);
        }}
        className="absolute right-3 top-3 z-20 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-bg-elevated/90 px-3 text-xs font-medium backdrop-blur"
      >
        <Menu className="h-4 w-4" />
        Menu
      </button>
      <GameMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="relative z-10 flex flex-col items-center">
        <h2 className="text-2xl font-semibold text-fg">Opening hand</h2>
        <p className="mt-1 font-mono text-xs text-enemy">vs {enemyName || "???"}</p>
        <p className="mt-2 max-w-md text-center text-sm text-fg-muted">
          Tap cards to redraw. High-tech units and laser protocols — keep a curve you
          can afford.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8 sm:gap-4">
          {hand.map((id, i) => (
            <CardView
              key={`${id}-${i}`}
              defId={id}
              size="lg"
              selected={selected.includes(i)}
              showValue
              onClick={() => toggle(i)}
              badge={selected.includes(i) ? "Redraw" : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            unlockAudio();
            playSfx("ui");
            confirm();
          }}
          className="mt-6 min-h-11 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-fg hover:opacity-90 sm:mt-8"
        >
          Ready — keep {hand.length - selected.length}, redraw {selected.length}
        </button>
      </div>
    </div>
  );
}

function EndScreen() {
  const phase = useGameStore((s) => s.phase);
  const startGame = useGameStore((s) => s.startGame);
  const returnToMenu = useGameStore((s) => s.returnToMenu);
  const math = useGameStore((s) => s.math);
  const enemyName = useGameStore((s) => s.enemyName);
  const rewardMatch = useMetaStore((s) => s.rewardMatch);
  const victory = phase === "victory";
  const [reward, setReward] = useState<MatchRewardResult | null>(null);
  const paid = useRef(false);

  useEffect(() => {
    if (paid.current) return;
    paid.current = true;
    unlockAudio();
    playSfx(victory ? "glory" : "defeat");
    setReward(rewardMatch(victory));
  }, [victory, rewardMatch]);

  return (
    <div className="relative flex h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-4">
      <AmbientStage variant="launcher" />
      <div className="relative z-10 flex flex-col items-center">
        <h2
          className={cn(
            "text-3xl font-semibold",
            victory ? "text-success" : "text-danger",
          )}
        >
          {victory ? "Victory" : "Defeat"}
        </h2>
        <p className="mt-1 font-mono text-xs text-enemy">
          {victory ? "Crushed" : "Fell to"} {enemyName || "enemy"}
        </p>
        <p className="mt-2 max-w-sm text-center text-fg-muted">
          {victory
            ? "Enemy core offline. The math checked out."
            : "Your core hit 0. Review the log and re-tune your curve."}
        </p>
        {reward && (
          <div className="mt-4 flex max-w-sm flex-col items-center gap-1.5 text-center">
            <div className="rounded-full border border-attack/40 bg-attack/15 px-4 py-1.5 text-sm font-semibold text-attack">
              +{reward.tickets} tickets · +{reward.xp} XP
            </div>
            {reward.leveledUp && (
              <div className="text-sm font-semibold text-primary">
                Legion level {reward.newLevel}!
              </div>
            )}
            {reward.bonusNote && (
              <div className="text-xs text-fg-muted">{reward.bonusNote}</div>
            )}
          </div>
        )}
        <div className="mt-6 rounded-xl border border-border bg-bg-panel/90 px-5 py-3 text-sm text-fg-muted backdrop-blur">
          Final board power: you {math.playerBoardAttack} ATK · enemy{" "}
          {math.enemyBoardAttack} ATK
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              ensureMusicUnlocked();
              startGame("normal");
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-fg"
          >
            <RotateCcw className="h-4 w-4" />
            Play again
          </button>
          <button
            type="button"
            onClick={() => returnToMenu()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-bg-elevated px-6 py-3 text-sm font-medium text-fg"
          >
            Launcher
          </button>
        </div>
      </div>
    </div>
  );
}

function useIsNarrow(max = 640) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${max}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [max]);
  return narrow;
}

function useIsShort(maxH = 480) {
  const [short, setShort] = useState(false);
  useEffect(() => {
    const apply = () => setShort(window.innerHeight <= maxH);
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, [maxH]);
  return short;
}

function BattleScreen() {
  const narrow = useIsNarrow(1100);
  const short = useIsShort(560);
  const player = useGameStore((s) => s.player);
  const enemy = useGameStore((s) => s.enemy);
  const enemyName = useGameStore((s) => s.enemyName);
  const phase = useGameStore((s) => s.phase);
  const selection = useGameStore((s) => s.selection);
  const message = useGameStore((s) => s.message);
  const math = useGameStore((s) => s.math);
  const log = useGameStore((s) => s.log);
  const turn = useGameStore((s) => s.turn);
  const hoverPreview = useGameStore((s) => s.hoverPreview);
  const lastPreview = useGameStore((s) => s.lastPreview);
  const animating = useGameStore((s) => s.animating);
  const activeFx = useGameStore((s) => s.activeFx);
  const completeFx = useGameStore((s) => s.completeFx);

  const clickHand = useGameStore((s) => s.clickHand);
  const clickPlayerMinion = useGameStore((s) => s.clickPlayerMinion);
  const clickEnemyMinion = useGameStore((s) => s.clickEnemyMinion);
  const clickEnemyHero = useGameStore((s) => s.clickEnemyHero);
  const clickPlayerHero = useGameStore((s) => s.clickPlayerHero);
  const endTurn = useGameStore((s) => s.endTurn);
  const cancelSelection = useGameStore((s) => s.cancelSelection);
  const hoverEnemyMinion = useGameStore((s) => s.hoverEnemyMinion);
  const hoverEnemyHero = useGameStore((s) => s.hoverEnemyHero);
  const [menuOpen, setMenuOpen] = useState(false);

  const targeting =
    selection.kind === "minion" || selection.kind === "spell_target";
  const spellTargeting = selection.kind === "spell_target";
  const preview = hoverPreview ?? lastPreview;

  const selectedMinion =
    selection.kind === "minion"
      ? player.board.find((m) => m.uid === selection.uid)
      : null;

  const enemyHeroTargetable =
    (selection.kind === "minion" &&
      !!selectedMinion?.canHitFace &&
      !hasTaunt(enemy.board)) ||
    (spellTargeting && isSpellHeroTargetable(selection.spell, "enemy"));

  // Landscape phones always use compact hand so cards are fully on-screen
  const handSize: "xxs" | "xs" | "md" = short ? "xxs" : narrow ? "xs" : "md";
  const foeLabel = enemyName || "Enemy";
  const showSidePanel = !narrow && !short;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menuOpen) setMenuOpen(false);
        else cancelSelection();
      }
      if ((e.key === "e" || e.key === "E") && phase === "player_turn" && !animating) {
        endTurn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelSelection, endTurn, phase, animating, menuOpen]);

  return (
    <div
      id="battle-stage"
      className="battle-stage relative grid h-[100dvh] max-h-[100dvh] grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] overflow-hidden bg-bg text-fg will-change-transform"
    >
      <AmbientStage variant="battle" />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        style={{
          backgroundImage: "url(/ui/bg_battlefield_hd.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          mixBlendMode: "screen",
        }}
      />
      <CombatFxLayer fx={activeFx} onDone={completeFx} />
      <GameMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Row 1 — header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/5 bg-black/30 px-2 py-0.5 backdrop-blur-sm sm:px-3 sm:py-1">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="truncate text-xs font-semibold tracking-wide sm:text-sm">
            {GAME_TITLE_SHORT}
          </span>
          <span className="text-[0.65rem] text-fg-subtle sm:text-xs">T{turn}</span>
          <span
            className="max-w-[9rem] truncate font-mono text-[0.55rem] text-enemy sm:max-w-[12rem] sm:text-[0.6rem]"
            title={foeLabel}
          >
            vs {foeLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {targeting && (
            <button
              type="button"
              onClick={cancelSelection}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border bg-bg-elevated px-2 text-xs font-medium"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={animating || phase !== "player_turn"}
            onClick={() => {
              unlockAudio();
              endTurn();
            }}
            className={cn(
              "inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-opacity sm:px-3",
              phase === "player_turn" && !animating
                ? "bg-primary text-primary-fg"
                : "bg-bg-subtle text-fg-subtle",
            )}
          >
            <SkipForward className="h-3.5 w-3.5" />
            End
          </button>
          <button
            type="button"
            title="Menu"
            onClick={() => {
              unlockAudio();
              playSfx("ui");
              setMenuOpen(true);
            }}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-border bg-bg-elevated px-2.5 text-xs font-medium"
          >
            <Menu className="h-3.5 w-3.5" />
            Menu
          </button>
        </div>
      </header>

      {/* Row 2 — message (collapses when empty) */}
      <div
        className={cn(
          "relative z-10 shrink-0 border-b border-border/50 bg-bg-panel/80 px-3 text-center text-[0.65rem] text-fg-muted backdrop-blur-sm sm:text-xs",
          message ? "py-0.5" : "h-0 overflow-hidden border-0 p-0",
        )}
      >
        {message}
      </div>

      {/* Row 3 — playfield (boards + heroes) grows/shrinks; never eats the hand */}
      <div className="relative z-10 flex min-h-0 min-w-0 overflow-hidden">
        <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] overflow-hidden">
          <div className="flex shrink-0 items-center justify-center px-2 py-0.5">
            <HeroPortrait
              name={foeLabel}
              hp={enemy.heroHp}
              maxHp={enemy.heroMaxHp}
              side="enemy"
              mana={enemy.mana}
              maxMana={enemy.maxMana}
              targetable={enemyHeroTargetable}
              onClick={clickEnemyHero}
              onHover={hoverEnemyHero}
              compact={short}
            />
          </div>

          <div className="flex min-h-0 items-center justify-center gap-1 overflow-x-auto overflow-y-hidden px-2 sm:gap-2">
            {enemy.board.length === 0 && (
              <span className="text-[0.65rem] text-fg-subtle sm:text-xs">Empty board</span>
            )}
            {enemy.board.map((m) => (
              <MinionToken
                key={m.uid}
                minion={m}
                side="enemy"
                compact={short}
                targetable={
                  selection.kind === "minion" ||
                  (spellTargeting && isSpellMinionTargetable(selection.spell, "enemy"))
                }
                onClick={() => clickEnemyMinion(m.uid)}
                onHover={(on) => hoverEnemyMinion(on ? m.uid : null)}
              />
            ))}
          </div>

          <div className="mx-auto h-px w-3/4 shrink-0 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          <div className="flex min-h-0 items-center justify-center gap-1 overflow-x-auto overflow-y-hidden px-2 sm:gap-2">
            {player.board.length === 0 && (
              <span className="text-[0.65rem] text-fg-subtle sm:text-xs">Your board</span>
            )}
            {player.board.map((m) => (
              <MinionToken
                key={m.uid}
                minion={m}
                side="player"
                compact={short}
                selected={selection.kind === "minion" && selection.uid === m.uid}
                targetable={
                  spellTargeting && isSpellMinionTargetable(selection.spell, "player")
                }
                onClick={() => clickPlayerMinion(m.uid)}
              />
            ))}
          </div>

          <div className="flex shrink-0 items-center justify-center px-2 py-0.5">
            <HeroPortrait
              name="You"
              hp={player.heroHp}
              maxHp={player.heroMaxHp}
              side="player"
              mana={player.mana}
              maxMana={player.maxMana}
              targetable={
                spellTargeting && isSpellHeroTargetable(selection.spell, "player")
              }
              onClick={clickPlayerHero}
              compact={short}
            />
          </div>
        </div>

        {showSidePanel && (
          <aside className="hidden w-56 shrink-0 flex-col gap-2 overflow-hidden border-l border-white/5 bg-black/25 p-2 xl:flex xl:w-64">
            <MathPanel math={math} preview={preview} />
            <BattleLog log={log} />
          </aside>
        )}
      </div>

      {/* Row 4 — HAND always fully visible (reserved auto row, never clipped) */}
      <div
        className={cn(
          "battle-hand relative z-20 flex shrink-0 items-end justify-center gap-0.5 overflow-x-auto overflow-y-visible border-t border-white/10 bg-black/55 px-1.5 backdrop-blur-md sm:gap-1.5 sm:px-2",
          short ? "py-1" : "py-1.5 sm:py-2",
        )}
        style={{
          paddingBottom: "max(0.35rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {player.hand.map((id, i) => {
          const def = getCard(id);
          const playable =
            phase === "player_turn" &&
            !animating &&
            def.cost <= player.mana &&
            (def.type === "spell" || player.board.length < 7);
          return (
            <CardView
              key={`${id}-${i}`}
              defId={id}
              size={handSize}
              playable={playable}
              dimmed={!playable}
              selected={
                selection.kind === "spell_target" && selection.handIndex === i
              }
              onClick={() => clickHand(i)}
            />
          );
        })}
      </div>

      {/* Row 5 — compact math strip on phone/landscape */}
      {(narrow || short) && (
        <div className="relative z-10 max-h-10 shrink-0 overflow-y-auto border-t border-white/5 bg-black/60 px-2 py-0.5 text-[0.58rem] leading-tight text-fg-muted backdrop-blur sm:max-h-14 sm:text-[0.65rem]">
          {preview && (
            <div className="truncate font-mono text-primary">{preview.formula}</div>
          )}
          {spellTargeting && selection.kind === "spell_target" && (
            <div className="truncate text-fg">{describeSpellMath(selection.spell)}</div>
          )}
          <div className="tabular truncate">
            vs {foeLabel} · lethal {math.lethalGap} · mana {math.manaLeft} · ATK{" "}
            {math.playerBoardAttack}/{math.enemyBoardAttack}
          </div>
        </div>
      )}
    </div>
  );
}

function isSpellHeroTargetable(spell: SpellEffect, side: "player" | "enemy"): boolean {
  if (!spellNeedsTarget(spell)) return false;
  if (spell.kind === "damage") {
    if (spell.target === "enemy_minion") return false;
    if (spell.target === "enemy") return side === "enemy";
    if (spell.target === "any") return true;
  }
  if (spell.kind === "damage_and_draw" || spell.kind === "damage_heal") {
    return side === "enemy";
  }
  if (spell.kind === "heal") {
    return side === "player";
  }
  return false;
}

function isSpellMinionTargetable(
  spell: SpellEffect,
  side: "player" | "enemy",
): boolean {
  if (!spellNeedsTarget(spell)) return false;
  if (
    spell.kind === "buff" ||
    spell.kind === "aegis" ||
    spell.kind === "dominus_reximus"
  ) {
    return side === "player";
  }
  if (spell.kind === "heal") {
    return spell.target !== "friendly_hero" && side === "player";
  }
  if (spell.kind === "damage") {
    if (spell.target === "enemy_minion" || spell.target === "enemy") {
      return side === "enemy";
    }
    if (spell.target === "any") return true;
  }
  if (spell.kind === "damage_and_draw" || spell.kind === "damage_heal") {
    return side === "enemy";
  }
  return false;
}
