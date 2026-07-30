import { cn } from "@/lib/utils";
import type { CombatPreview, MathSnapshot } from "@/game/types";
import { Calculator, Crosshair, Swords } from "lucide-react";

interface MathPanelProps {
  math: MathSnapshot;
  preview: CombatPreview | null;
  compact?: boolean;
}

export function MathPanel({ math, preview, compact }: MathPanelProps) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-bg-panel/95 p-3 backdrop-blur-sm",
        compact ? "text-xs" : "text-sm",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-muted">
        <Calculator className="h-3.5 w-3.5" />
        Live Math
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Your Σ ATK"
          value={math.playerBoardAttack}
          sub={`HP pool ${math.playerBoardHealth}`}
          tone="player"
        />
        <Stat
          label="Enemy Σ ATK"
          value={math.enemyBoardAttack}
          sub={`HP pool ${math.enemyBoardHealth}`}
          tone="enemy"
        />
      </div>

      <div
        className={cn(
          "rounded-lg border px-2.5 py-2",
          math.lethalOnEnemy
            ? "border-success/40 bg-success/10"
            : "border-border bg-bg-subtle/50",
        )}
      >
        <div className="flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-fg-muted">
          <Crosshair className="h-3 w-3" />
          Lethal check
        </div>
        {math.lethalOnEnemy ? (
          <p className="mt-0.5 font-semibold text-success">
            Lethal available — face is open
          </p>
        ) : (
          <p className="mt-0.5 text-fg tabular">
            Need <span className="font-semibold text-warn">{math.lethalGap}</span> more
            ready damage
            {math.lethalGap === 0 && math.playerBoardAttack > 0
              ? " (Taunt or exhausted minions)"
              : ""}
          </p>
        )}
        {math.enemyLethalOnPlayer && (
          <p className="mt-1 text-[0.7rem] font-medium text-danger">
            Warning: enemy has lethal next turn if open
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-bg-subtle/50 px-2.5 py-2">
        <div className="text-[0.65rem] font-medium uppercase tracking-wide text-fg-muted">
          Resources
        </div>
        <p className="mt-0.5 text-fg tabular">
          Mana left: <span className="font-semibold text-mana-glow">{math.manaLeft}</span>
          {" · "}
          SP: <span className="font-semibold text-primary">{math.spellPower}</span>
          {" · "}
          Hand value: <span className="font-semibold">{math.handValue}</span>
        </p>
      </div>

      {math.bestTradeHint && (
        <div className="rounded-lg border border-border bg-bg-subtle/50 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-fg-muted">
            <Swords className="h-3 w-3" />
            Best trade
          </div>
          <p className="mt-0.5 text-fg-muted leading-snug">{math.bestTradeHint}</p>
        </div>
      )}

      {preview && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2">
          <div className="text-[0.65rem] font-medium uppercase tracking-wide text-primary">
            Combat preview
          </div>
          <p className="mt-1 font-mono text-[0.7rem] leading-relaxed text-fg">
            {preview.formula}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[0.65rem]">
            <Tag ok={preview.defenderDies}>
              {preview.defenderDies ? "Kills" : `Dmg ${preview.damageToDefender}`}
            </Tag>
            <Tag ok={!preview.attackerDies}>
              {preview.attackerDies ? "You die" : `Take ${preview.damageToAttacker}`}
            </Tag>
            {preview.overkill > 0 && <Tag ok={false}>Overkill {preview.overkill}</Tag>}
            {preview.lifestealHeal > 0 && (
              <Tag ok>Heal +{preview.lifestealHeal}</Tag>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  tone: "player" | "enemy";
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle/50 px-2 py-1.5">
      <div className="text-[0.6rem] uppercase tracking-wide text-fg-subtle">{label}</div>
      <div
        className={cn(
          "text-lg font-semibold tabular leading-tight",
          tone === "player" ? "text-player" : "text-enemy",
        )}
      >
        {value}
      </div>
      <div className="text-[0.6rem] text-fg-subtle tabular">{sub}</div>
    </div>
  );
}

function Tag({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 font-medium",
        ok === true && "bg-success/20 text-success",
        ok === false && "bg-danger/20 text-danger",
        ok == null && "bg-bg-subtle text-fg-muted",
      )}
    >
      {children}
    </span>
  );
}
