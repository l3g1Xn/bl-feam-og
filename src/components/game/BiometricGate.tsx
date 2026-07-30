import { useEffect, useState } from "react";
import {
  disableVault,
  enrollPin,
  hydratePinVaultFromDevice,
  loadRegistry,
  lockSession,
  needsUnlock,
  unlockWithPin,
  type MetaSnapshot,
} from "@/game/deviceVault";
import { hydrateMatchSaveFromDevice } from "@/game/matchSave";
import { ensureSaveFolder } from "@/game/lxSave";
import { useMetaStore } from "@/game/meta";
import { GAME_TITLE_SHORT } from "@/game/brand";
import { isWebSite } from "@/lib/platform";
import { AmbientStage } from "./AmbientStage";
import { unlockAudio, playSfx } from "@/game/audio";
import { KeyRound, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PIN unlock gate — Android APK only.
 * Public website never shows PIN unlock (immediate pass-through).
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  if (isWebSite()) {
    return <>{children}</>;
  }
  return <NativePinGate>{children}</NativePinGate>;
}

function NativePinGate({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const applySnapshot = useMetaStore((s) => s.applySnapshot);
  const setVaultProfileLabel = useMetaStore((s) => s.setVaultProfileLabel);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await ensureSaveFolder();
        await hydratePinVaultFromDevice();
        await hydrateMatchSaveFromDevice();
      } catch {
        /* ignore */
      }
      if (!alive) return;
      setBlocked(needsUnlock());
      setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (checking) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-fg-muted">
        <p className="text-sm">Loading vault…</p>
      </div>
    );
  }

  if (blocked) {
    return (
      <UnlockScreen
        onUnlocked={(label, snap) => {
          applySnapshot(snap, label);
          setVaultProfileLabel(label);
          setBlocked(false);
        }}
      />
    );
  }

  return <>{children}</>;
}

function UnlockScreen({
  onUnlocked,
}: {
  onUnlocked: (label: string, snap: MetaSnapshot) => void;
}) {
  const reg = loadRegistry();
  const profile =
    reg.profiles.find((p) => p.id === reg.activeProfileId) || reg.profiles[0];
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (busy || pin.length < 4) return;
    setBusy(true);
    setErr(null);
    unlockAudio();
    playSfx("ui");
    try {
      const res = await unlockWithPin(pin, profile?.id);
      if (!res.ok) {
        setErr(res.error || "Incorrect PIN");
        setPin("");
        return;
      }
      onUnlocked(profile?.displayName || "Legionnaire", res.snapshot);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-4">
      <AmbientStage variant="launcher" />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-bg-elevated/95 p-6 shadow-2xl backdrop-blur-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-fg">{GAME_TITLE_SHORT}</div>
            <div className="text-xs text-fg-subtle">Local PIN vault · device only</div>
          </div>
        </div>
        <h2 className="text-lg font-semibold text-fg">
          Enter your device PIN to unlock{" "}
          <span className="text-fg-muted">{profile?.displayName || "profile"}</span>
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          PIN required after reopening the APK. Tickets and saves stay on this device.
        </p>
        <div className="mt-5 space-y-3">
          <label className="text-xs font-medium text-fg-muted">Device PIN</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            className="w-full rounded-xl border border-border bg-bg-panel px-3 py-3 text-center text-lg tracking-[0.35em] text-fg outline-none ring-primary focus:ring-2"
            placeholder="••••"
          />
          {err && <p className="text-center text-xs text-danger">{err}</p>}
          <button
            type="button"
            disabled={busy || pin.length < 4}
            onClick={() => void submit()}
            className={cn(
              "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-fg",
              (busy || pin.length < 4) && "opacity-50",
            )}
          >
            <KeyRound className="h-4 w-4" />
            Unlock with PIN
          </button>
        </div>
      </div>
    </div>
  );
}

/** Settings: PIN vault — APK only; hidden on public website. */
export function VaultSettingsSection() {
  if (isWebSite()) return null;
  return <VaultSettingsSectionNative />;
}

function VaultSettingsSectionNative() {
  const getSnapshot = useMetaStore((s) => s.getSnapshot);
  const setVaultProfileLabel = useMetaStore((s) => s.setVaultProfileLabel);
  const vaultProfileLabel = useMetaStore((s) => s.vaultProfileLabel);
  const [reg, setReg] = useState(() => loadRegistry());
  const [name, setName] = useState("Legionnaire");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => setReg(loadRegistry());

  const setupPin = async () => {
    setBusy(true);
    setMsg(null);
    unlockAudio();
    const res = await enrollPin({ displayName: name, pin, snapshot: getSnapshot() });
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setVaultProfileLabel(name);
    setMsg("Local PIN vault created. Tickets sealed on this device.");
    refresh();
    playSfx("ui");
  };

  const remove = () => {
    if (
      !confirm(
        "Remove device vault? Tickets remain in local cache but will no longer be sealed.",
      )
    ) {
      return;
    }
    disableVault();
    lockSession();
    setVaultProfileLabel(null);
    setMsg("Vault removed.");
    refresh();
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
          <ShieldCheck className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-fg">PIN lock vault</h3>
          <p className="mt-0.5 text-[0.7rem] text-fg-muted">
            Seal tickets, XP, collection, deck, and graphics settings with a local PIN
            (APK only).
          </p>
          <p className="mt-1 text-[0.65rem] text-fg-subtle">
            Status:{" "}
            {reg.enabled && reg.profiles.length > 0 ? (
              <span className="text-success">
                Active · {vaultProfileLabel || reg.profiles[0]?.displayName || "profile"}
              </span>
            ) : (
              <span>Off</span>
            )}
            {" · PIN lock"}
          </p>
        </div>
      </div>

      {!(reg.enabled && reg.profiles.length > 0) ? (
        <div className="mt-3 space-y-2">
          <div>
            <label className="text-xs text-fg-muted">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              className="mt-1 w-full rounded-xl border border-border bg-bg-panel px-3 py-2 text-sm text-fg"
            />
          </div>
          <div>
            <label className="text-xs text-fg-muted">PIN (4–8 digits)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="mt-1 w-full rounded-xl border border-border bg-bg-panel px-3 py-2 text-sm tracking-widest text-fg"
            />
          </div>
          <button
            type="button"
            disabled={busy || pin.length < 4}
            onClick={() => void setupPin()}
            className="min-h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-fg disabled:opacity-50"
          >
            Create PIN vault
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={remove}
          className="mt-3 min-h-10 w-full rounded-xl border border-danger/40 bg-danger/10 text-sm font-medium text-danger"
        >
          Disable PIN vault
        </button>
      )}

      {msg && <p className="mt-2 text-center text-xs text-fg-muted">{msg}</p>}
    </section>
  );
}
