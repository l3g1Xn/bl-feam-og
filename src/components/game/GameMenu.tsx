import { playSfx, unlockAudio } from "@/game/audio";
import { useGameStore } from "@/game/store";
import { GAME_TITLE_SHORT } from "@/game/brand";
import { SettingsPanel } from "./SettingsPanel";
import { cn } from "@/lib/utils";
import { DoorOpen, Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";

type Panel = "root" | "settings";

export function GameMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const returnToMenu = useGameStore((s) => s.returnToMenu);
  const [panel, setPanel] = useState<Panel>("root");

  useEffect(() => {
    if (open) setPanel("root");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panel === "settings") setPanel("root");
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, panel, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Game menu"
    >
      <div
        className={cn(
          "relative flex max-h-[min(90dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-bg-elevated shadow-2xl",
        )}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-fg">
              {panel === "settings" ? "Settings" : "Exit menu"}
            </div>
            <div className="text-[0.65rem] text-fg-subtle">{GAME_TITLE_SHORT}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              playSfx("ui");
              if (panel === "settings") setPanel("root");
              else onClose();
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg-panel text-fg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {panel === "root" ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  playSfx("ui");
                  onClose();
                }}
                className="min-h-12 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg"
              >
                Resume battle
              </button>
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  playSfx("ui");
                  setPanel("settings");
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-bg-panel px-4 py-3 text-sm font-medium text-fg"
              >
                <Settings2 className="h-4 w-4" />
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  unlockAudio();
                  playSfx("ui");
                  onClose();
                  returnToMenu();
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
              >
                <DoorOpen className="h-4 w-4" />
                Exit to launcher
              </button>
              <p className="mt-1 text-center text-[0.65rem] text-fg-subtle">
                Match progress is not saved when you exit.
              </p>
            </div>
          ) : (
            <SettingsPanel compact showBuild={false} />
          )}
        </div>
      </div>
    </div>
  );
}
