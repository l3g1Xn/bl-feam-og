import { leetInitial } from "@/game/leetNames";
import { entityKeyHero } from "@/game/fx";
import { cn } from "@/lib/utils";

interface HeroPortraitProps {
  name: string;
  hp: number;
  maxHp: number;
  side: "player" | "enemy";
  mana?: number;
  maxMana?: number;
  targetable?: boolean;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onHover?: (active: boolean) => void;
}

export function HeroPortrait({
  name,
  hp,
  maxHp,
  side,
  mana,
  maxMana,
  targetable,
  compact,
  onClick,
  onHover,
}: HeroPortraitProps) {
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const initial = side === "enemy" ? leetInitial(name) : name.slice(0, 1).toUpperCase();

  return (
    <button
      type="button"
      data-entity={entityKeyHero(side)}
      data-drop={side === "enemy" ? "enemy-hero" : "player-hero"}
      data-side={side}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cn(
        "relative flex max-w-[40vw] min-w-0 flex-col items-center rounded-2xl border bg-bg-elevated/95 transform-gpu backdrop-blur-sm transition-transform duration-150",
        compact ? "gap-0 px-1.5 py-0.5" : "gap-0.5 px-2 py-1 sm:min-w-[7.5rem] sm:max-w-none sm:gap-1 sm:px-3 sm:py-2",
        side === "player" ? "border-player/40" : "border-enemy/40",
        targetable && "cursor-crosshair border-danger ring-2 ring-danger/50",
        onClick && "active:scale-[0.98]",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-semibold",
          compact ? "h-6 w-6 text-[0.55rem]" : "h-7 w-7 text-[0.65rem] sm:h-10 sm:w-10 sm:text-sm",
          side === "player" ? "bg-player/30 text-player" : "bg-enemy/30 text-enemy",
        )}
      >
        {initial}
      </div>
      <div
        className={cn(
          "w-full truncate text-center font-medium text-fg",
          side === "enemy"
            ? compact
              ? "max-w-[8rem] font-mono text-[0.5rem] tracking-tight"
              : "max-w-[9.5rem] font-mono text-[0.58rem] tracking-tight sm:max-w-[12rem] sm:text-[0.7rem]"
            : compact
              ? "text-[0.6rem]"
              : "text-[0.7rem] sm:text-xs",
        )}
        title={name}
      >
        {name}
      </div>
      <div className={cn("w-full overflow-hidden rounded-full bg-bg-subtle", compact ? "h-0.5" : "h-1 sm:h-1.5")}>
        <div
          className="h-full rounded-full bg-health transition-[width] duration-300"
          style={{ width: `${hpPct}%` }}
        />
      </div>
      <div className={cn("flex items-center gap-1.5", compact ? "text-[0.55rem]" : "text-[0.65rem] sm:text-xs")}>
        <span className="font-semibold tabular text-health">
          {hp}
          <span className="font-normal text-fg-subtle">/{maxHp}</span>
        </span>
        {mana != null && maxMana != null && (
          <span className="font-semibold tabular text-mana-glow">
            {mana}
            <span className="font-normal text-fg-subtle">/{maxMana}</span>
          </span>
        )}
      </div>
    </button>
  );
}
