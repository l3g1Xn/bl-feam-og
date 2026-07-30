import { cn } from "@/lib/utils";
import type { LogEntry } from "@/game/types";

interface BattleLogProps {
  log: LogEntry[];
}

export function BattleLog({ log }: BattleLogProps) {
  return (
    <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-bg-panel/90 p-2 text-xs sm:max-h-none sm:flex-1">
      <div className="sticky top-0 mb-1 bg-bg-panel/90 text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
        Battle log
      </div>
      {log.length === 0 && (
        <p className="text-fg-subtle">Actions and formulas appear here.</p>
      )}
      {log.map((e) => (
        <div
          key={e.id}
          className={cn(
            "rounded-md px-2 py-1 leading-snug",
            e.tone === "math" && "bg-bg-subtle font-mono text-[0.7rem] text-fg-muted",
            e.tone === "player" && "text-player",
            e.tone === "enemy" && "text-enemy",
            e.tone === "system" && "text-fg-subtle",
            e.tone === "neutral" && "text-fg",
          )}
        >
          {e.text}
        </div>
      ))}
    </div>
  );
}
