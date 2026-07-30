import {
  cardArtSrc,
  classLabel,
  getCard,
  keywordLabel,
  minionValueScore,
  typeLabel,
} from "@/game/cards";
import { cn } from "@/lib/utils";
import type { Keyword } from "@/game/types";

const FRAME: Record<string, string> = {
  steel: "border-taunt/50 from-[#1c2028] to-[#12151c]",
  ember: "border-charge/50 from-[#261a16] to-[#14100e]",
  frost: "border-shield/50 from-[#161c26] to-[#10141a]",
  shadow: "border-lifesteal/40 from-[#1c1822] to-[#121016]",
  nature: "border-success/40 from-[#162018] to-[#101612]",
  arcane: "border-mana-glow/40 from-[#181c28] to-[#10141c]",
};

const CLASS_CHIP: Record<string, string> = {
  steel: "bg-taunt/25 text-taunt",
  ember: "bg-charge/25 text-charge",
  frost: "bg-shield/25 text-shield",
  shadow: "bg-lifesteal/25 text-lifesteal",
  nature: "bg-success/25 text-success",
  arcane: "bg-mana/30 text-mana-glow",
};

interface CardViewProps {
  defId: string;
  size?: "xxs" | "xs" | "sm" | "md" | "lg";
  selected?: boolean;
  dimmed?: boolean;
  playable?: boolean;
  onClick?: () => void;
  badge?: string;
  showValue?: boolean;
  className?: string;
}

export function CardView({
  defId,
  size = "md",
  selected,
  dimmed,
  playable,
  onClick,
  badge,
  showValue,
  className,
}: CardViewProps) {
  const def = getCard(defId);
  const art = cardArtSrc(defId);
  const faction = classLabel(def.art);
  const kind = typeLabel(def.type);

  // Aspect ~ 5:7. Art window ~55% of height for portrait emphasis.
  const sizes = {
    /** Phone landscape hand — must fully fit short viewports */
    xxs: {
      shell: "w-[3.35rem] h-[4.7rem]",
      art: "h-[2.35rem]",
      name: "text-[0.42rem]",
      meta: "text-[0.34rem]",
      body: "text-[0.34rem]",
      pad: "px-0.5 pb-0.5 pt-0.5",
      cost: "h-4 w-4 text-[0.52rem] -top-0.5 -left-0.5",
      stat: "h-3.5 min-w-3.5 text-[0.5rem]",
    },
    xs: {
      shell: "w-[4.15rem] h-[5.8rem]",
      art: "h-[3rem]",
      name: "text-[0.5rem]",
      meta: "text-[0.4rem]",
      body: "text-[0.42rem]",
      pad: "px-0.5 pb-0.5 pt-0.5",
      cost: "h-5 w-5 text-[0.62rem] -top-1 -left-1",
      stat: "h-4 min-w-4 text-[0.58rem]",
    },
    sm: {
      shell: "w-[5.75rem] h-[8.05rem]",
      art: "h-[4.15rem]",
      name: "text-[0.6rem]",
      meta: "text-[0.48rem]",
      body: "text-[0.5rem]",
      pad: "p-1",
      cost: "h-6 w-6 text-[0.7rem] -top-1.5 -left-1.5",
      stat: "h-5 min-w-5 text-[0.7rem]",
    },
    md: {
      shell: "w-[7.25rem] h-[10.15rem]",
      art: "h-[5.25rem]",
      name: "text-[0.72rem]",
      meta: "text-[0.55rem]",
      body: "text-[0.58rem]",
      pad: "p-1.5",
      cost: "h-7 w-7 text-[0.75rem] -top-2 -left-2",
      stat: "h-6 min-w-6 text-[0.75rem]",
    },
    lg: {
      shell: "w-[9.5rem] h-[13.3rem]",
      art: "h-[7.1rem]",
      name: "text-[0.88rem]",
      meta: "text-[0.65rem]",
      body: "text-[0.72rem]",
      pad: "p-2",
      cost: "h-8 w-8 text-sm -top-2.5 -left-2.5",
      stat: "h-7 min-w-7 text-sm",
    },
  }[size];

  const value =
    def.type === "minion" && def.attack != null && def.health != null
      ? minionValueScore(def.attack, def.health, def.cost)
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border bg-gradient-to-b text-left shadow-md transition-transform duration-150",
        "transform-gpu",
        FRAME[def.art] ?? FRAME.steel,
        sizes.shell,
        selected && "ring-2 ring-primary -translate-y-1",
        playable && !dimmed && "ring-1 ring-success/40",
        dimmed && "opacity-55",
        onClick && "active:scale-[0.98]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute z-10 flex items-center justify-center rounded-full border border-mana/50 bg-mana font-bold text-white shadow",
          sizes.cost,
        )}
      >
        {def.cost}
      </div>

      {badge && (
        <div className="absolute right-0.5 top-0.5 z-10 rounded bg-danger/90 px-1 text-[0.45rem] font-semibold text-white">
          {badge}
        </div>
      )}

      <div className={cn("relative w-full overflow-hidden", sizes.art)}>
        <img
          src={art}
          alt=""
          draggable={false}
          className="card-art h-full w-full"
          crossOrigin="anonymous"
        />
        <div className="card-shine pointer-events-none absolute inset-0" />
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col", sizes.pad)}>
        <div className={cn("truncate font-semibold leading-tight text-fg", sizes.name)}>
          {def.name}
        </div>
        <div className={cn("flex gap-0.5 truncate text-fg-subtle", sizes.meta)}>
          <span className={cn("rounded px-0.5", CLASS_CHIP[def.art])}>{faction}</span>
          <span>{kind}</span>
        </div>
        {size !== "xxs" && (
          <p className={cn("mt-0.5 line-clamp-2 flex-1 text-fg-muted", sizes.body)}>
            {def.text}
          </p>
        )}
        {def.type === "minion" && (
          <div className="mt-auto flex items-end justify-between gap-0.5">
            <span
              className={cn(
                "inline-flex items-center justify-center rounded bg-attack/25 font-bold tabular text-attack",
                sizes.stat,
              )}
            >
              {def.attack}
            </span>
            {showValue && value != null && size !== "xxs" && (
              <span className="text-[0.4rem] text-fg-subtle">{value.toFixed(1)}</span>
            )}
            <span
              className={cn(
                "inline-flex items-center justify-center rounded bg-health/25 font-bold tabular text-health",
                sizes.stat,
              )}
            >
              {def.health}
            </span>
          </div>
        )}
        {def.type === "spell" && def.keywords && def.keywords.length > 0 && size !== "xxs" && (
          <div className={cn("mt-auto text-fg-subtle", sizes.meta)}>
            {(def.keywords as Keyword[]).map((k) => keywordLabel(k)).join(" · ")}
          </div>
        )}
      </div>
    </button>
  );
}
