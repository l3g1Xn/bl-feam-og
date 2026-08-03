import { cardArtSrc, classLabel, getCard, keywordLabel } from "@/game/cards";
import { entityKeyMinion, schoolColor } from "@/game/fx";
import { cn } from "@/lib/utils";
import type { MinionInstance } from "@/game/types";

interface MinionTokenProps {
  minion: MinionInstance;
  side: "player" | "enemy";
  selected?: boolean;
  targetable?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onHover?: (active: boolean) => void;
}

/**
 * Board unit token — fixed pixel footprint so flex board rows never collapse art.
 * Portrait fills the plate; ATK/HP sit as absolute gems (Hearthstone-style).
 */
export function MinionToken({
  minion,
  side,
  selected,
  targetable,
  compact,
  onClick,
  onHover,
}: MinionTokenProps) {
  const def = getCard(minion.defId);
  const damaged = minion.health < minion.maxHealth;
  const art = cardArtSrc(minion.defId);
  const school = def.art;
  const rim = schoolColor(school);
  const faction = classLabel(school);

  return (
    <button
      type="button"
      data-entity={entityKeyMinion(minion.uid)}
      data-drop={side === "enemy" ? "enemy-minion" : "player-minion"}
      data-uid={minion.uid}
      data-side={side}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      title={`${def.name} · ${minion.attack}/${minion.health} · ${faction}`}
      className={cn(
        "minion-token relative isolate shrink-0 overflow-visible rounded-[1.15rem] border-2 transition-transform duration-150",
        "bg-card-face shadow-lg transform-gpu",
        // Fixed box — never flex-shrink or height:auto collapse
        compact
          ? "h-[5.6rem] w-[4.15rem] min-h-[5.6rem] min-w-[4.15rem] max-h-[5.6rem] max-w-[4.15rem]"
          : "h-[7rem] w-[5.15rem] min-h-[6.4rem] min-w-[4.75rem] max-h-[7.4rem] max-w-[5.5rem] sm:h-[7.4rem] sm:w-[5.5rem]",
        minion.canAttack && side === "player" && "can-strike",
        minion.keywords.includes("taunt")
          ? "border-taunt shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-taunt)_45%,transparent)]"
          : "border-card-border",
        selected &&
          "-translate-y-1.5 border-primary ring-2 ring-primary/60 shadow-[0_10px_28px_rgba(0,0,0,0.5)]",
        targetable && "cursor-crosshair border-danger ring-2 ring-danger/50",
        minion.canAttack &&
          side === "player" &&
          !selected &&
          "ring-1 ring-success/60",
        minion.shield &&
          "outline outline-2 outline-offset-1 outline-shield/85 sm:outline-offset-2",
        (minion.keywords.includes("immune") || minion.immuneThisTurn) &&
          "ring-2 ring-primary/75 shadow-[0_0_18px_rgba(200,208,220,0.45)]",
        onClick && "active:scale-[0.97]",
      )}
      style={{
        flex: "0 0 auto",
        boxShadow: selected
          ? `0 0 0 1px ${rim}aa, 0 12px 32px rgba(0,0,0,0.55), 0 0 24px ${rim}44`
          : `0 0 0 1px ${rim}44, 0 8px 20px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)`,
      }}
    >
      {/* Full-bleed portrait plate */}
      <div className="absolute inset-0 overflow-hidden rounded-[1.05rem]">
        <img
          src={art}
          alt=""
          draggable={false}
          className="h-full w-full object-cover object-[center_20%]"
          crossOrigin="anonymous"
          loading="eager"
        />
        {/* Depth vignette + school tint wash */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              linear-gradient(to top, rgba(6,8,12,0.97) 0%, rgba(6,8,12,0.55) 28%, transparent 52%),
              radial-gradient(ellipse at 50% 18%, ${rim}33, transparent 58%),
              linear-gradient(135deg, ${rim}18 0%, transparent 40%)
            `,
          }}
        />
        {/* Inner steel rim */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[1.05rem]"
          style={{
            boxShadow: `inset 0 0 0 1px ${rim}55, inset 0 -18px 28px rgba(0,0,0,0.35)`,
          }}
        />
      </div>

      {/* School color top rail */}
      <div
        className="pointer-events-none absolute inset-x-1 top-0 z-[2] h-[3px] rounded-b-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${rim}, transparent)`,
          boxShadow: `0 0 10px ${rim}88`,
        }}
      />

      {/* Faction chip */}
      <div
        className="pointer-events-none absolute left-1 top-1 z-[3] rounded px-1 py-px text-[0.42rem] font-bold uppercase tracking-wide text-white sm:text-[0.48rem]"
        style={{
          background: `linear-gradient(135deg, ${rim}cc, ${rim}88)`,
          textShadow: "0 1px 2px #000",
          boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {faction.slice(0, 4)}
      </div>

      {/* Keyword chips (top-right) */}
      <div className="pointer-events-none absolute right-0.5 top-1 z-[3] flex max-w-[55%] flex-col items-end gap-0.5">
        {minion.keywords.includes("taunt") && (
          <span className="rounded bg-taunt/90 px-0.5 text-[0.4rem] font-bold uppercase text-black">
            TNT
          </span>
        )}
        {minion.shield && (
          <span className="rounded bg-shield/90 px-0.5 text-[0.4rem] font-bold text-black">
            SHD
          </span>
        )}
        {(minion.keywords.includes("immune") || minion.immuneThisTurn) && (
          <span className="rounded bg-primary/90 px-0.5 text-[0.4rem] font-bold text-primary-fg">
            IMM
          </span>
        )}
        {!compact &&
          minion.keywords
            .filter((k) => k !== "shield" && k !== "taunt" && k !== "immune")
            .slice(0, 1)
            .map((k) => (
              <span
                key={k}
                className="rounded bg-black/70 px-0.5 text-[0.4rem] font-semibold uppercase text-fg-muted"
              >
                {keywordLabel(k).slice(0, 4)}
              </span>
            ))}
      </div>

      {/* Name plate */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 z-[3] px-0.5 text-center font-bold leading-tight text-fg",
          compact
            ? "bottom-5 text-[0.5rem]"
            : "bottom-6 text-[0.58rem] sm:bottom-7 sm:text-[0.68rem]",
        )}
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.6)" }}
      >
        <span className="line-clamp-2">{def.name}</span>
      </div>

      {/* ATK gem — bottom left, over portrait */}
      <span
        className={cn(
          "pointer-events-none absolute z-[4] inline-flex items-center justify-center rounded-full font-black tabular-nums text-white",
          compact
            ? "bottom-0.5 left-0.5 h-[1.15rem] min-w-[1.15rem] px-0.5 text-[0.62rem]"
            : "bottom-0.5 left-0.5 h-[1.35rem] min-w-[1.35rem] px-1 text-[0.72rem] sm:h-6 sm:min-w-6 sm:text-[0.8rem]",
        )}
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #ffb070, #c45a12 55%, #6a2808)",
          boxShadow:
            "0 0 0 1.5px rgba(255,180,100,0.7), 0 2px 6px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.35)",
          textShadow: "0 1px 2px rgba(0,0,0,0.85)",
        }}
      >
        {minion.attack}
      </span>

      {/* HP gem — bottom right */}
      <span
        className={cn(
          "pointer-events-none absolute z-[4] inline-flex items-center justify-center rounded-full font-black tabular-nums text-white",
          compact
            ? "bottom-0.5 right-0.5 h-[1.15rem] min-w-[1.15rem] px-0.5 text-[0.62rem]"
            : "bottom-0.5 right-0.5 h-[1.35rem] min-w-[1.35rem] px-1 text-[0.72rem] sm:h-6 sm:min-w-6 sm:text-[0.8rem]",
        )}
        style={{
          background: damaged
            ? "radial-gradient(circle at 35% 30%, #ff8a8a, #b01828 55%, #4a0810)"
            : "radial-gradient(circle at 35% 30%, #8dffb0, #1a8a48 55%, #0a4020)",
          boxShadow: damaged
            ? "0 0 0 1.5px rgba(255,120,120,0.75), 0 2px 6px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.3)"
            : "0 0 0 1.5px rgba(120,255,160,0.7), 0 2px 6px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.35)",
          textShadow: "0 1px 2px rgba(0,0,0,0.85)",
        }}
      >
        {minion.health}
      </span>
    </button>
  );
}
