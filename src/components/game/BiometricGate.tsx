import { useEffect, useState } from "react";
import {
  disableVault,
  enrollPin,
  loadRegistry,
  lockSession,
  needsUnlock,
  unlockWithPin,
  type MetaSnapshot,
} from "@/game/deviceVault";
import { useMetaStore } from "@/game/meta";
import { GAME_TITLE_SHORT } from "@/game/brand";
import { AmbientStage } from "./AmbientStage";
import { unlockAudio, playSfx } from "@/game/audio";
import { KeyRound, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Device-local PIN gate only (no biometric / passkey).
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const applySnapshot = useMetaStore((s) => s.applySnapshot);
  const setVaultProfileLabel = useMetaStore((s) => s.setVaultProfileLabel);

  useEffect(() => {
    setBlocked(needsUnlock());
    setChecking(false);
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doPin = async () => {
    setBusy(true);
    setError(null);
    unlockAudio();
    const res = await unlockWithPin(pin, profile?.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    playSfx("ui");
    onUnlocked(profile?.displayName || "Legionnaire", res.snapshot);
  };

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
        <p className="text-sm text-fg-muted">
          Enter your device PIN to unlock{" "}
          <span className="font-semibold text-fg">
            {profile?.displayName || "your profile"}
          </span>
          .
        </p>

        <div className="mt-5 space-y-2">
          <label className="text-xs font-medium text-fg-muted">Device PIN</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-center text-lg tracking-[0.3em] text-fg outline-none focus:border-primary"
            placeholder="••••"
            onKeyDown={(e) => {
              if (e.key === "Enter" && pin.length >= 4) void doPin();
            }}
          />
          <button
            type="button"
            disabled={busy || pin.length < 4}
            onClick={() => void doPin()}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-bg-panel text-sm font-medium text-fg disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" />
            Unlock with PIN
          </button>
        </div>

        {error && <p className="mt-3 text-center text-xs text-danger">{error}</p>}
        <p className="mt-4 text-center text-[0.65rem] text-fg-subtle">
          No account · no biometrics · tickets sealed on this device
        </p>
      </div>
    </div>
  );
}

/** Settings: PIN vault only (biometric removed). */
export function VaultSettingsSection() {
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

  const lockNow = () => {
    lockSession();
    window.location.reload();
  };

  return (
    <section className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-fg">PIN lock vault</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            Seal tickets, XP, collection, deck, and graphics settings with a local PIN
            (AES-GCM). No biometrics, no cloud, no account.
          </p>
        </div>
      </div>

      {reg.enabled ? (
        <div className="space-y-2">
          <div className="rounded-xl border border-border bg-bg-elevated px-3 py-2 text-xs text-fg-muted">
            Active profile:{" "}
            <span className="font-semibold text-fg">
              {vaultProfileLabel ||
                reg.profiles.find((p) => p.id === reg.activeProfileId)?.displayName ||
                "bound"}
            </span>
            {" · PIN lock"}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={lockNow}
              className="rounded-xl border border-border bg-bg-elevated px-3 py-2 text-xs font-medium"
            >
              Lock now
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-medium text-danger"
            >
              Remove vault
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-fg-muted">Profile name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              className="mt-1 w-full rounded-xl border border-border bg-bg-elevated px-3 py-2 text-sm text-fg outline-none focus:border-primary"
              placeholder="Legionnaire"
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
              className="mt-1 w-full rounded-xl border border-border bg-bg-elevated px-3 py-2 text-center text-lg tracking-[0.3em] text-fg outline-none focus:border-primary"
              placeholder="••••"
            />
          </div>
          <button
            type="button"
            disabled={busy || pin.length < 4 || name.trim().length < 1}
            onClick={() => void setupPin()}
            className={cn(
              "flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold",
              pin.length >= 4
                ? "bg-primary text-primary-fg"
                : "bg-bg-subtle text-fg-subtle",
            )}
          >
            <KeyRound className="h-4 w-4" />
            Create PIN vault
          </button>
        </div>
      )}
      {msg && <p className="text-center text-xs text-success">{msg}</p>}
    </section>
  );
}
