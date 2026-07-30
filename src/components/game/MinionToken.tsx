import { cardArtSrc, getCard, keywordLabel } from "@/game/cards";
import { entityKeyMinion } from "@/game/fx";
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

  return (
    <button
      type="button"
      data-entity={entityKeyMinion(minion.uid)}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden rounded-xl border-2 transition-transform duration-150",
        "bg-card-face shadow-md transform-gpu",
        compact
          ? "h-[3.35rem] w-[2.75rem]"
          : "h-[4.1rem] w-[3.35rem] sm:h-[5.5rem] sm:w-[4.4rem]",
        minion.keywords.includes("taunt")
          ? "border-taunt shadow-[0_0_0_2px_color-mix(in_oklab,var(--color-taunt)_40%,transparent)]"
          : "border-card-border",
        selected && "-translate-y-0.5 border-primary ring-2 ring-primary/50",
        targetable && "cursor-crosshair border-danger ring-2 ring-danger/40",
        minion.canAttack && side === "player" && !selected && "ring-1 ring-success/50",
        minion.shield &&
          "outline outline-2 outline-offset-1 outline-shield/70 sm:outline-offset-2",
        (minion.keywords.includes("immune") || minion.immuneThisTurn) &&
          "ring-2 ring-primary/70 shadow-[0_0_12px_rgba(200,208,220,0.35)]",
        onClick && "active:scale-95",
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden",
          compact ? "h-[1.55rem]" : "h-[2.15rem] sm:h-[3rem]",
        )}
      >
        <img
          src={art}
          alt=""
          draggable={false}
          className="h-full w-full object-cover object-[center_18%]"
          crossOrigin="anonymous"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card-face via-transparent to-transparent" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between px-0.5 pb-0.5 pt-0.5">
        <div
          className={cn(
            "w-full truncate text-center font-semibold leading-tight text-fg",
            compact ? "text-[0.42rem]" : "text-[0.5rem] sm:text-[0.62rem]",
          )}
        >
          {def.name}
        </div>

        {!compact && (
          <div className="hidden flex-wrap justify-center gap-0.5 sm:flex">
            {minion.keywords
              .filter((k) => k !== "shield")
              .slice(0, 2)
              .map((k) => (
                <span key={k} className="text-[0.48rem] text-fg-subtle">
                  {keywordLabel(k).slice(0, 3)}
                </span>
              ))}
            {minion.shield && (
              <span className="text-[0.48rem] text-shield">SHD</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-0.5">
          <span
            className={cn(
              "font-bold tabular text-attack",
              compact ? "text-[0.55rem]" : "text-[0.65rem] sm:text-xs",
            )}
          >
            {minion.attack}
          </span>
          <span
            className={cn(
              "font-bold tabular",
              damaged ? "text-danger" : "text-health",
              compact ? "text-[0.55rem]" : "text-[0.65rem] sm:text-xs",
            )}
          >
            {minion.health}
          </span>
        </div>
      </div>
    </button>
  );
}
