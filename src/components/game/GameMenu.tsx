import { playSfx, unlockAudio } from "@/game/audio";
import { useGameStore } from "@/game/store";
import { GAME_TITLE_SHORT } from "@/game/brand";
import { SettingsPanel } from "./SettingsPanel";
import { CanvasChrome } from "./CanvasChrome";
import { cn } from "@/lib/utils";
import { DoorOpen, Lock, Save, Settings2, X } from "lucide-react";
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
  const saveGameLocal = useGameStore((s) => s.saveGameLocal);
  const saveNotice = useGameStore((s) => s.saveNotice);
  const phase = useGameStore((s) => s.phase);
  const [panel, setPanel] = useState<Panel>("root");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const canSave =
    phase === "mulligan" || phase === "player_turn" || phase === "enemy_turn";

  useEffect(() => {
    if (open) {
      setPanel("root");
      setSaveMsg(null);
    }
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

  // Lock body scroll while menu open so battle board doesn't scroll under overlay
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Game menu"
      onClick={() => {
        playSfx("ui");
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className={cn(
          "relative flex max-h-[min(90dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/12 bg-bg-elevated/95 shadow-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <CanvasChrome variant="menu" />
        <header className="relative z-[1] flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-fg">
              <Lock className="h-3.5 w-3.5 text-fg-subtle" />
              {panel === "settings" ? "Settings" : "Exit menu · Game lock"}
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

        <div className="relative z-[1] min-h-0 flex-1 overflow-y-auto p-4">
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

              {canSave && (
                <button
                  type="button"
                  onClick={() => {
                    unlockAudio();
                    playSfx("ui");
                    const r = saveGameLocal();
                    setSaveMsg(
                      r.ok
                        ? "Saved locally on this device."
                        : r.error || "Save failed.",
                    );
                  }}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success"
                >
                  <Save className="h-4 w-4" />
                  Save game locally
                </button>
              )}

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
                  returnToMenu({ keepSave: true });
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
              >
                <DoorOpen className="h-4 w-4" />
                Exit to launcher
              </button>
              <p className="mt-1 text-center text-[0.65rem] text-fg-subtle">
                Use <strong className="text-fg-muted">Save game locally</strong> before
                exit to resume later. Double-tap system Back opens this menu.
              </p>
              {(saveMsg || saveNotice) && (
                <p className="text-center text-xs text-success">
                  {saveMsg || saveNotice}
                </p>
              )}
            </div>
          ) : (
            <SettingsPanel compact showBuild={false} />
          )}
        </div>
      </div>
    </div>
  );
}
