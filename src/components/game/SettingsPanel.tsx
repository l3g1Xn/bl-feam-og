import {
  configureGraphics,
  type GraphicsQuality,
} from "@/game/graphics";
import { setSfxMuted, setSfxVolume, unlockAudio } from "@/game/audio";
import { useMetaStore } from "@/game/meta";
import { BUILD_ID } from "@/game/brand";
import { VaultSettingsSection } from "./BiometricGate";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const QUALITIES: { id: GraphicsQuality; label: string; hint: string }[] = [
  { id: "low", label: "Low", hint: "30 FPS · minimal particles · battery saver" },
  { id: "medium", label: "Medium", hint: "60 FPS · balanced FX" },
  { id: "high", label: "High", hint: "90 FPS · full combat FX · live apply" },
  {
    id: "ultra",
    label: "UltraHD",
    hint: "Up to 144 Hz · max particles · 16:9 cinema",
  },
];

export function SettingsPanel({
  compact = false,
  showBuild = true,
}: {
  compact?: boolean;
  showBuild?: boolean;
}) {
  const quality = useMetaStore((s) => s.quality);
  const setQuality = useMetaStore((s) => s.setQuality);
  const targetHz = useMetaStore((s) => s.targetHz);
  const setTargetHz = useMetaStore((s) => s.setTargetHz);
  const aspectMode = useMetaStore((s) => s.aspectMode);
  const setAspectMode = useMetaStore((s) => s.setAspectMode);
  const reducedShake = useMetaStore((s) => s.reducedShake);
  const setReducedShake = useMetaStore((s) => s.setReducedShake);
  const sfxVolume = useMetaStore((s) => s.sfxVolume);
  const setSfxVolumeMeta = useMetaStore((s) => s.setSfxVolume);
  const sfxMuted = useMetaStore((s) => s.sfxMuted);
  const setSfxMutedMeta = useMetaStore((s) => s.setSfxMuted);

  useEffect(() => {
    configureGraphics({ quality, targetHz, aspectMode, reducedShake });
  }, [quality, targetHz, aspectMode, reducedShake]);

  useEffect(() => {
    setSfxVolume(sfxVolume);
    setSfxMuted(sfxMuted);
  }, [sfxVolume, sfxMuted]);

  return (
    <div className={cn("space-y-5", compact ? "pb-2" : "mx-auto max-w-lg space-y-6 pb-4")}>
      {!compact && (
        <div>
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-sm text-fg-muted">
            Changes apply instantly — no restart. Local only, no account.
          </p>
        </div>
      )}

      {!compact && <VaultSettingsSection />}

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-fg">Graphics quality</h3>
        <div className="grid gap-2">
          {QUALITIES.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                unlockAudio();
                setQuality(q.id);
                if (q.id === "ultra") {
                  setTargetHz(144);
                  setAspectMode("16:9");
                }
                configureGraphics({
                  quality: q.id,
                  targetHz: q.id === "ultra" ? 144 : targetHz,
                  aspectMode: q.id === "ultra" ? "16:9" : aspectMode,
                  reducedShake,
                });
              }}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99]",
                quality === q.id
                  ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(200,208,220,0.12)]"
                  : "border-border bg-bg-elevated hover:border-border-strong",
              )}
            >
              <div className="text-sm font-semibold">{q.label}</div>
              <div className="text-xs text-fg-muted">{q.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-fg">Frame rate target</h3>
        <div className="flex flex-wrap gap-2">
          {([30, 60, 90, 120, 144] as const).map((hz) => (
            <button
              key={hz}
              type="button"
              onClick={() => {
                setTargetHz(hz);
                configureGraphics({ quality, targetHz: hz, aspectMode, reducedShake });
              }}
              className={cn(
                "min-w-[3.5rem] rounded-xl border px-3 py-2 text-sm font-semibold tabular",
                targetHz === hz
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border bg-bg-elevated text-fg-muted",
              )}
            >
              {hz}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-fg">Aspect</h3>
        <div className="flex gap-2">
          {(
            [
              ["auto", "Device native"],
              ["16:9", "Cinema 16:9"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setAspectMode(id);
                configureGraphics({ quality, targetHz, aspectMode: id, reducedShake });
              }}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-sm",
                aspectMode === id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-bg-elevated text-fg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-fg">Battle sound</h3>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={sfxMuted}
              onChange={(e) => {
                unlockAudio();
                setSfxMutedMeta(e.target.checked);
              }}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Mute
          </label>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(sfxVolume * 100)}
          disabled={sfxMuted}
          onChange={(e) => {
            unlockAudio();
            setSfxVolumeMeta(Number(e.target.value) / 100);
          }}
          className="w-full accent-[var(--color-primary)]"
        />
        <p className="text-[0.65rem] text-fg-subtle">
          Clashes, spell impacts, hero grunts & victory cries — generated onboard.
        </p>
      </section>

      <label className="flex items-center justify-between rounded-2xl border border-border bg-bg-elevated px-4 py-3">
        <span className="text-sm">Reduce screen shake</span>
        <input
          type="checkbox"
          checked={reducedShake}
          onChange={(e) => {
            setReducedShake(e.target.checked);
            configureGraphics({
              quality,
              targetHz,
              aspectMode,
              reducedShake: e.target.checked,
            });
          }}
          className="h-5 w-5 accent-[var(--color-primary)]"
        />
      </label>

      {compact && <VaultSettingsSection />}

      {showBuild && (
        <p className="text-center text-[0.65rem] text-fg-subtle">Build {BUILD_ID}</p>
      )}
    </div>
  );
}
