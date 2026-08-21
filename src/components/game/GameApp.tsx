import { useGameStore } from "@/game/store";
import { cardArtSrc, getCard, keywordLabel } from "@/game/cards";
import { describeSpellMath, hasTaunt, spellNeedsTarget } from "@/game/math";
import { CardView } from "./CardView";
import { MinionToken } from "./MinionToken";
import { HeroPortrait } from "./HeroPortrait";
import { MathPanel } from "./MathPanel";
import { BattleLog } from "./BattleLog";
import { CombatFxLayer } from "./CombatFxLayer";
import { BattleHand } from "./BattleHand";
import { Launcher } from "./Launcher";
import { AmbientStage } from "./AmbientStage";
import { GameMenu } from "./GameMenu";
import { BiometricGate } from "./BiometricGate";
import { PermissionsGate } from "./PermissionsGate";
import { CanvasChrome } from "./CanvasChrome";
import { installAppLifecycleHooks } from "@/game/appLifecycle";
import { useMetaStore, type MatchRewardResult } from "@/game/meta";
import { GAME_TITLE_SHORT } from "@/game/brand";
import { playSfx, unlockAudio } from "@/game/audio";
import { ensureMusicUnlocked, setBattleMusicDuck } from "@/game/music";
import { cn } from "@/lib/utils";
import { Menu, RotateCcw, SkipForward, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SpellEffect } from "@/game/types";

export function GameApp() {
  return (
    <PermissionsGate>
      <BiometricGate>
        <GameAppInner />
      </BiometricGate>
    </PermissionsGate>
  );
}

function GameAppInner() {
  const phase = useGameStore((s) => s.phase);
  const cancelSelection = useGameStore((s) => s.cancelSelection);
  const selection = useGameStore((s) => s.selection);
  const returnToMenu = useGameStore((s) => s.returnToMenu);
  const [menuOpen, setMenuOpen] = useState(false);
  const [backHint, setBackHint] = useState<string | null>(null);
  const lastBack = useRef(0);

  useEffect(() => {
    return installAppLifecycleHooks();
  }, []);

  useEffect(() => {
    if (phase === "menu" || phase === "victory" || phase === "defeat") {
      setBattleMusicDuck(false);
      setMenuOpen(false);
    } else {
      setBattleMusicDuck(true);
    }
  }, [phase]);

  /** Double system Back → Exit menu (game lock). Single back cancels / arms timer. */
  const handleHardwareBack = useCallback(() => {
    const now = Date.now();
    const inMatch =
      phase === "mulligan" ||
      phase === "player_turn" ||
      phase === "enemy_turn";

    if (!inMatch) {
      if (phase === "victory" || phase === "defeat") {
        lastBack.current = 0;
        setBackHint(null);
        unlockAudio();
        playSfx("ui");
        returnToMenu({ keepSave: false });
        return true;
      }
      if (now - lastBack.current < 1600) {
        lastBack.current = 0;
        setBackHint(null);
        tryExitApp();
        return true;
      }
      lastBack.current = now;
      setBackHint("Tap Back again to exit app");
      window.setTimeout(() => setBackHint(null), 1600);
      return true;
    }

    if (menuOpen) {
      setMenuOpen(false);
      lastBack.current = 0;
      setBackHint(null);
      return true;
    }

    if (selection.kind !== "none") {
      cancelSelection();
      return true;
    }

    if (now - lastBack.current < 1600) {
      lastBack.current = 0;
      setBackHint(null);
      unlockAudio();
      playSfx("ui");
      setMenuOpen(true);
      return true;
    }

    lastBack.current = now;
    setBackHint("Tap Back again for Exit menu");
    window.setTimeout(() => setBackHint(null), 1600);
    return true;
  }, [phase, menuOpen, selection.kind, cancelSelection, returnToMenu]);

  useEffect(() => {
    const push = () => {
      try {
        window.history.pushState({ blGuard: 1 }, "");
      } catch {
        /* ignore */
      }
    };
    push();
    const onPop = () => {
      const handled = handleHardwareBack();
      if (handled) push();
    };
    window.addEventListener("popstate", onPop);

    type CapApp = {
      addListener: (
        e: string,
        cb: (data: { canGoBack: boolean }) => void,
      ) => Promise<{ remove: () => void }>;
      exitApp?: () => void;
    };
    let removeCap: (() => void) | undefined;
    const w = window as unknown as {
      Capacitor?: { Plugins?: { App?: CapApp }; isNativePlatform?: () => boolean };
    };
    const app = w.Capacitor?.Plugins?.App;
    if (app?.addListener) {
      void app.addListener("backButton", () => {
        handleHardwareBack();
      }).then((h) => {
        removeCap = () => h.remove();
      });
    }

    return () => {
      window.removeEventListener("popstate", onPop);
      removeCap?.();
    };
  }, [handleHardwareBack]);

  return (
    <>
      {phase === "menu" && <Launcher />}
      {phase === "mulligan" && (
        <MulliganScreen menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      )}
      {(phase === "victory" || phase === "defeat") && <EndScreen />}
      {(phase === "player_turn" || phase === "enemy_turn") && (
        <BattleScreen menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      )}
      {backHint && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-white/15 bg-black/80 px-4 py-2 text-xs text-fg shadow-lg backdrop-blur">
          {backHint}
        </div>
      )}
    </>
  );
}

function tryExitApp() {
  const w = window as unknown as {
    Capacitor?: { Plugins?: { App?: { exitApp?: () => void } } };
  };
  try {
    w.Capacitor?.Plugins?.App?.exitApp?.();
  } catch {
    /* web: ignore */
  }
}

function MulliganScreen({
  menuOpen,
  setMenuOpen,
}: {
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
}) {
  const hand = useGameStore((s) => s.player.hand);
  const selected = useGameStore((s) => s.mulliganSelected);
  const toggle = useGameStore((s) => s.toggleMulligan);
  const confirm = useGameStore((s) => s.confirmMulligan);
  const enemyName = useGameStore((s) => s.enemyName);

  return (
    <div className="launcher-shell relative flex h-dvh flex-col items-center justify-center overflow-y-auto bg-bg px-3 py-6 sm:px-4">
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
        className="absolute z-20 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-bg-elevated/90 px-3 text-xs font-medium backdrop-blur right-[max(0.75rem,env(safe-area-inset-right,0px))] top-[max(0.75rem,env(safe-area-inset-top,0px))]"
      >
        <Menu className="h-4 w-4" />
        Menu
      </button>
      <GameMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="relative z-10 mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-8">
        <CanvasChrome variant="panel" />
        <div className="relative z-[1] flex flex-col items-center">
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
    </div>
  );
}

/** Session cache: EndScreen remount (fold / PIN / StrictMode) must not re-call rewardMatch. */
const endScreenClaimed = new Map<string, MatchRewardResult>();

function EndScreen() {
  const phase = useGameStore((s) => s.phase);
  const startGame = useGameStore((s) => s.startGame);
  const returnToMenu = useGameStore((s) => s.returnToMenu);
  const math = useGameStore((s) => s.math);
  const enemyName = useGameStore((s) => s.enemyName);
  const matchId = useGameStore((s) => s.matchId);
  const difficulty = useGameStore((s) => s.difficulty);
  const rewardMatch = useMetaStore((s) => s.rewardMatch);
  const victory = phase === "victory";
  const hard = difficulty === "hard";
  const rematchDifficulty: "normal" | "hard" = hard ? "hard" : "normal";
  const [reward, setReward] = useState<MatchRewardResult | null>(null);
  const paid = useRef(false);

  useEffect(() => {
    const key =
      typeof matchId === "string" && matchId.trim().length > 0 ? matchId.trim() : "";
    if (key && endScreenClaimed.has(key)) {
      setReward(endScreenClaimed.get(key)!);
      paid.current = true;
      return;
    }
    if (paid.current) return;
    paid.current = true;
    unlockAudio();
    playSfx(victory ? "glory" : "defeat");
    const result = rewardMatch(victory, matchId);
    if (key) {
      endScreenClaimed.set(key, result);
      if (endScreenClaimed.size > 64) {
        const oldest = endScreenClaimed.keys().next().value;
        if (oldest) endScreenClaimed.delete(oldest);
      }
    }
    setReward(result);
  }, [victory, rewardMatch, matchId]);

  return (
    <div className="launcher-shell relative flex h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-4">
      <AmbientStage variant="launcher" />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/12 p-6 sm:p-8">
        <CanvasChrome variant="hero" />
        <div className="relative z-[1] flex flex-col items-center">
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
            {hard ? " · Hard AI" : " · Ranked practice"}
          </p>
          <p className="mt-2 max-w-sm text-center text-fg-muted">
            {victory
              ? "Enemy core offline. The math checked out."
              : "Your core hit 0. Review the log and re-tune your curve."}
          </p>
          {reward && (
            <div className="mt-4 flex max-w-sm flex-col items-center gap-1.5 text-center">
              {reward.alreadyClaimed ? (
                <div className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-fg-muted">
                  {typeof reward.bonusNote === "string" &&
                  /withheld/i.test(reward.bonusNote)
                    ? "Reward withheld — match was not bound"
                    : "Rewards already claimed for this match"}
                </div>
              ) : (
                <div className="rounded-full border border-attack/40 bg-attack/15 px-4 py-1.5 text-sm font-semibold text-attack">
                  +{reward.tickets} tickets · +{reward.xp} XP
                </div>
              )}
              {reward.leveledUp && !reward.alreadyClaimed && (
                <div className="text-sm font-semibold text-primary">
                  Legion level {reward.newLevel}!
                </div>
              )}
              {reward.bonusNote && !reward.alreadyClaimed && (
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
                startGame(rematchDifficulty);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-fg"
            >
              <RotateCcw className="h-4 w-4" />
              {hard ? "Play again — Hard" : "Play again"}
            </button>
            <button
              type="button"
              onClick={() => returnToMenu({ keepSave: false })}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-bg-elevated px-6 py-3 text-sm font-medium text-fg"
            >
              Launcher
            </button>
          </div>
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

function useIsShort(max = 560) {
  const [short, setShort] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-height: ${max}px)`);
    const apply = () => setShort(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [max]);
  return short;
}

function BattleInspect() {
  const selection = useGameStore((s) => s.selection);
  const player = useGameStore((s) => s.player);
  const activeFx = useGameStore((s) => s.activeFx);
  const preview = useGameStore((s) => s.hoverPreview ?? s.lastPreview);

  if (activeFx?.cardName) {
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        {activeFx.artSrc && (
          <img
            src={activeFx.artSrc}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md object-cover"
          />
        )}
        <div className="min-w-0">
          <div className="truncate text-[0.7rem] font-semibold text-primary">
            {activeFx.banner ?? activeFx.cardName}
          </div>
          {activeFx.detail && (
            <div className="line-clamp-1 text-[0.58rem] text-fg-muted">
              {activeFx.detail}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selection.kind === "minion") {
    const m = player.board.find((x) => x.uid === selection.uid);
    if (!m) return null;
    const def = getCard(m.defId);
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        <img
          src={cardArtSrc(def.id)}
          alt=""
          className="h-9 w-9 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-[0.7rem] font-semibold text-fg">
            {def.name} · {m.attack}/{m.health}
            {m.shield ? " · Shield" : ""}
            {m.immuneThisTurn ? " · Immune" : ""}
          </div>
          <div className="line-clamp-1 text-[0.58rem] text-fg-muted">{def.text}</div>
          {(m.keywords.length > 0 || preview) && (
            <div className="truncate text-[0.55rem] text-fg-subtle">
              {m.keywords.map(keywordLabel).join(" · ")}
              {preview ? ` · ${preview.formula}` : ""}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selection.kind === "spell_target") {
    const id = player.hand[selection.handIndex];
    const def = id ? getCard(id) : null;
    if (!def) return null;
    return (
      <div className="flex items-center gap-2 overflow-hidden">
        <img
          src={cardArtSrc(def.id)}
          alt=""
          className="h-9 w-9 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-[0.7rem] font-semibold text-fg">
            {def.name} · {def.cost} mana
          </div>
          <div className="line-clamp-1 text-[0.58rem] text-fg-muted">{def.text}</div>
          <div className="truncate font-mono text-[0.55rem] text-primary">
            {describeSpellMath(selection.spell)}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function BattleScreen({
  menuOpen,
  setMenuOpen,
}: {
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
}) {
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

  // silence unused — hand clicks go through BattleHand
  void clickHand;

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

  const handSize: "xxs" | "xs" | "md" = short ? "xxs" : narrow ? "xs" : "md";
  const foeLabel = enemyName || "Enemy";
  const showSidePanel = !narrow && !short;
  const showInspect =
    !!activeFx?.cardName ||
    selection.kind === "minion" ||
    selection.kind === "spell_target";

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
  }, [cancelSelection, endTurn, phase, animating, menuOpen, setMenuOpen]);

  return (
    <div
      id="battle-stage"
      className="battle-stage safe-pad relative grid h-[100dvh] max-h-[100dvh] grid-rows-[auto_auto_auto_minmax(0,1fr)_auto_auto] overflow-hidden bg-bg text-fg will-change-transform"
    >
      <AmbientStage variant="battle" />
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-36"
        style={{
          backgroundImage: "url(/ui/bg_battlefield_hd.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          mixBlendMode: "screen",
        }}
      />
      <CombatFxLayer fx={activeFx} onDone={completeFx} />
      <GameMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/5 bg-black/35 px-2 py-0.5 backdrop-blur-sm sm:px-3 sm:py-1">
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

      <div
        className={cn(
          "relative z-10 shrink-0 border-b border-white/5 bg-black/45 px-2 backdrop-blur-sm",
          showInspect ? "py-1" : "h-0 overflow-hidden border-0 p-0",
        )}
      >
        <BattleInspect />
      </div>

      <div
        className={cn(
          "relative z-10 shrink-0 border-b border-border/50 bg-bg-panel/80 px-3 text-center text-[0.65rem] text-fg-muted backdrop-blur-sm sm:text-xs",
          message ? "py-0.5" : "h-0 overflow-hidden border-0 p-0",
        )}
      >
        {message}
      </div>

      <div className="relative z-10 flex min-h-0 min-w-0 overflow-hidden">
        <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(8rem,1fr)_auto_minmax(8rem,1fr)_auto] overflow-hidden">
          <div
            className="flex shrink-0 items-center justify-center px-2 py-0.5"
            data-drop="enemy-hero"
            data-side="enemy"
          >
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

          <div
            className="board-row relative flex min-h-[8rem] items-center justify-center gap-2 overflow-x-auto overflow-y-visible px-3 py-2 sm:min-h-[8.75rem] sm:gap-3"
            data-drop="enemy-board"
          >
            <div className="pointer-events-none absolute inset-x-4 inset-y-1 rounded-2xl border border-enemy/15 bg-enemy/[0.04]" />
            {enemy.board.length === 0 && (
              <span className="relative text-[0.65rem] text-fg-subtle sm:text-xs">
                Empty board
              </span>
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

          <div
            className="mx-auto h-px w-3/4 shrink-0 bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent"
            data-drop="field"
          />

          <div
            className="board-row relative flex min-h-[8rem] items-center justify-center gap-2 overflow-x-auto overflow-y-visible px-3 py-2 sm:min-h-[8.75rem] sm:gap-3"
            data-drop="player-board"
          >
            <div className="pointer-events-none absolute inset-x-4 inset-y-1 rounded-2xl border border-primary/15 bg-primary/[0.04]" />
            {player.board.length === 0 && (
              <span className="relative text-[0.65rem] text-fg-subtle sm:text-xs">
                Drop minions here
              </span>
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

          <div
            className="flex shrink-0 items-center justify-center px-2 py-0.5"
            data-drop="player-hero"
            data-side="player"
          >
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

      <BattleHand handSize={handSize} short={short} />

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
