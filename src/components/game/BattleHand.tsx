/**
 * Poker-table fan hand + pointer drag-and-drop into the field.
 * GPU-friendly: transform/opacity only; Adreno compositor paths.
 */
import { cardArtSrc, getCard } from "@/game/cards";
import { spellNeedsTarget } from "@/game/math";
import { useGameStore } from "@/game/store";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DragPayload = {
  handIndex: number;
  defId: string;
  kind: "minion" | "spell" | "spell_target";
  clientX: number;
  clientY: number;
};

type TrailPt = { x: number; y: number; t: number };

interface BattleHandProps {
  handSize: "xxs" | "xs" | "md";
  short: boolean;
  onDragState?: (active: boolean, payload: DragPayload | null, trail: TrailPt[]) => void;
}

const SIZE = {
  xxs: { w: 54, h: 76 },
  xs: { w: 66, h: 92 },
  md: { w: 92, h: 128 },
} as const;

export function BattleHand({ handSize, short, onDragState }: BattleHandProps) {
  const hand = useGameStore((s) => s.player.hand);
  const mana = useGameStore((s) => s.player.mana);
  const boardLen = useGameStore((s) => s.player.board.length);
  const phase = useGameStore((s) => s.phase);
  const animating = useGameStore((s) => s.animating);
  const selection = useGameStore((s) => s.selection);
  const clickHand = useGameStore((s) => s.clickHand);

  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [trail, setTrail] = useState<TrailPt[]>([]);
  const dragRef = useRef<DragPayload | null>(null);
  const trailRef = useRef<TrailPt[]>([]);
  const pointerId = useRef<number | null>(null);

  const dim = SIZE[handSize];
  const n = hand.length;
  const fan = useMemo(() => {
    if (n <= 0) return [];
    const spread = Math.min(42, 10 + n * 4);
    const start = -spread / 2;
    const step = n === 1 ? 0 : spread / (n - 1);
    return hand.map((id, i) => {
      const angle = start + step * i;
      const lift = Math.cos((angle * Math.PI) / 180) * (short ? 6 : 10);
      return { id, i, angle, lift, y: -lift };
    });
  }, [hand, n, short]);

  const emit = useCallback(
    (active: boolean, p: DragPayload | null, t: TrailPt[]) => {
      onDragState?.(active, p, t);
    },
    [onDragState],
  );

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const p = dragRef.current;
      pointerId.current = null;
      dragRef.current = null;
      setDrag(null);
      const t = trailRef.current;
      trailRef.current = [];
      setTrail([]);
      emit(false, null, []);

      if (!p) return;
      const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      const drop = el?.closest?.("[data-drop]") as HTMLElement | null;
      if (!drop) {
        // short drag = tap select
        if (t.length < 4) clickHand(p.handIndex);
        return;
      }
      const zone = drop.dataset.drop;
      const uid = drop.dataset.uid;
      const side = drop.dataset.side as "player" | "enemy" | undefined;

      // Play minion onto friendly board
      if (p.kind === "minion" && (zone === "player-board" || zone === "field")) {
        clickHand(p.handIndex);
        return;
      }
      // Spell: drop on specific targets
      if (p.kind === "spell" || p.kind === "spell_target") {
        clickHand(p.handIndex);
        // After selection, resolve target if drop was on entity
        window.setTimeout(() => {
          const st = useGameStore.getState();
          if (st.selection.kind !== "spell_target") return;
          if (zone === "enemy-hero" || (zone === "hero" && side === "enemy")) {
            st.clickEnemyHero();
          } else if (zone === "player-hero" || (zone === "hero" && side === "player")) {
            st.clickPlayerHero();
          } else if (zone === "enemy-minion" && uid) {
            st.clickEnemyMinion(uid);
          } else if (zone === "player-minion" && uid) {
            st.clickPlayerMinion(uid);
          } else if (zone === "enemy-board" || zone === "field") {
            // AOE / face preference: try face if possible else first enemy
            st.clickEnemyHero();
          }
        }, 0);
      }
    },
    [clickHand, emit],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (pointerId.current == null || pointerId.current !== e.pointerId) return;
      const p = dragRef.current;
      if (!p) return;
      const next = { ...p, clientX: e.clientX, clientY: e.clientY };
      dragRef.current = next;
      setDrag(next);
      const pt = { x: e.clientX, y: e.clientY, t: performance.now() };
      const arr = [...trailRef.current, pt].filter((q) => pt.t - q.t < 280).slice(-28);
      trailRef.current = arr;
      setTrail(arr);
      emit(true, next, arr);
      e.preventDefault();
    };
    const onUp = (e: PointerEvent) => {
      if (pointerId.current == null || pointerId.current !== e.pointerId) return;
      endDrag(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [endDrag, emit]);

  const startDrag = (handIndex: number, e: React.PointerEvent) => {
    if (phase !== "player_turn" || animating) return;
    const defId = hand[handIndex];
    if (!defId) return;
    const def = getCard(defId);
    const playable =
      def.cost <= mana && (def.type === "spell" || boardLen < 7);
    if (!playable && def.type === "minion") return;

    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerId.current = e.pointerId;
    let kind: DragPayload["kind"] = def.type === "minion" ? "minion" : "spell";
    if (def.type === "spell" && def.spell && spellNeedsTarget(def.spell)) {
      kind = "spell_target";
    }
    const p: DragPayload = {
      handIndex,
      defId,
      kind,
      clientX: e.clientX,
      clientY: e.clientY,
    };
    dragRef.current = p;
    trailRef.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    setDrag(p);
    setTrail(trailRef.current);
    emit(true, p, trailRef.current);
  };

  return (
    <>
      <div
        className={cn(
          "battle-hand relative z-20 flex shrink-0 items-end justify-center overflow-visible border-t border-white/10 bg-black/55 backdrop-blur-md",
          short ? "h-[5.2rem] py-1" : "h-[7.5rem] py-1.5 sm:h-[8.5rem] sm:py-2",
        )}
        style={{
          paddingBottom: "max(0.35rem, env(safe-area-inset-bottom, 0px))",
          perspective: "900px",
          transform: "translateZ(0)",
        }}
        data-drop="hand"
      >
        {/* invisible hands / table feel */}
        <div
          className="pointer-events-none absolute inset-x-[8%] bottom-0 h-8 rounded-[100%] bg-gradient-to-t from-black/50 to-transparent opacity-70"
          aria-hidden
        />
        <div
          className="relative mx-auto flex h-full w-full max-w-3xl items-end justify-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          {fan.map(({ id, i, angle, y }) => {
            const def = getCard(id);
            const playable =
              phase === "player_turn" &&
              !animating &&
              def.cost <= mana &&
              (def.type === "spell" || boardLen < 7);
            const selected =
              selection.kind === "spell_target" && selection.handIndex === i;
            const isDragging = drag?.handIndex === i;
            return (
              <button
                key={`${id}-${i}`}
                type="button"
                data-hand-index={i}
                onPointerDown={(e) => {
                  e.preventDefault();
                  startDrag(i, e);
                }}
                className={cn(
                  "absolute bottom-1 touch-none select-none rounded-lg will-change-transform",
                  "origin-bottom shadow-lg transition-[filter,box-shadow] duration-150",
                  playable && "ring-1 ring-success/40",
                  selected && "ring-2 ring-primary",
                  !playable && "opacity-55",
                  isDragging && "opacity-0",
                )}
                style={{
                  width: dim.w,
                  height: dim.h,
                  left: "50%",
                  marginLeft: -dim.w / 2,
                  transform: `translate3d(${Math.sin((angle * Math.PI) / 180) * (short ? 38 : 52) * (n > 1 ? 1 : 0)}px, ${y}px, 0) rotate(${angle}deg)`,
                  zIndex: isDragging ? 0 : 10 + i,
                  backgroundImage: `url(${cardArtSrc(id)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center top",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow:
                    "0 8px 20px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)",
                }}
                aria-label={def.name}
              >
                <span
                  className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-mana text-[0.6rem] font-bold text-primary-fg shadow"
                >
                  {def.cost}
                </span>
                {def.type === "minion" && (
                  <span className="absolute bottom-0.5 left-0.5 right-0.5 flex justify-between px-0.5 text-[0.55rem] font-bold tabular text-white drop-shadow">
                    <span className="rounded bg-black/55 px-0.5">{def.attack}</span>
                    <span className="rounded bg-black/55 px-0.5">{def.health}</span>
                  </span>
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-0.5 pb-0.5 pt-3 text-center text-[0.45rem] font-semibold leading-tight text-white">
                  {def.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ghost card under finger */}
      {drag && (
        <div
          className="pointer-events-none fixed z-[70] will-change-transform"
          style={{
            left: drag.clientX,
            top: drag.clientY,
            width: dim.w,
            height: dim.h,
            marginLeft: -dim.w / 2,
            marginTop: -dim.h * 0.85,
            transform: "translateZ(0) scale(1.08) rotate(-6deg)",
            borderRadius: 10,
            backgroundImage: `url(${cardArtSrc(drag.defId)})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            boxShadow: "0 12px 32px rgba(0,0,0,0.55), 0 0 24px rgba(120,180,255,0.35)",
            border: "1px solid rgba(200,220,255,0.45)",
          }}
        />
      )}

      {/* Attack / cast direction trail */}
      {trail.length > 1 && (
        <svg
          className="pointer-events-none fixed inset-0 z-[65]"
          width="100%"
          height="100%"
          aria-hidden
        >
          <defs>
            <linearGradient id="bl-trail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(120,180,255,0)" />
              <stop offset="50%" stopColor="rgba(160,210,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.85)" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke="url(#bl-trail)"
            strokeWidth={drag?.kind === "spell_target" || drag?.kind === "spell" ? 3.5 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
            style={{ filter: "drop-shadow(0 0 6px rgba(120,180,255,0.8))" }}
          />
          {drag && trail.length >= 2 && (
            <polygon
              points={arrowHead(
                trail[trail.length - 2]!,
                trail[trail.length - 1]!,
              )}
              fill="rgba(220,235,255,0.9)"
            />
          )}
        </svg>
      )}
    </>
  );
}

function arrowHead(a: TrailPt, b: TrailPt): string {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const s = 10;
  const x1 = b.x - s * Math.cos(ang - 0.4);
  const y1 = b.y - s * Math.sin(ang - 0.4);
  const x2 = b.x - s * Math.cos(ang + 0.4);
  const y2 = b.y - s * Math.sin(ang + 0.4);
  return `${b.x},${b.y} ${x1},${y1} ${x2},${y2}`;
}
