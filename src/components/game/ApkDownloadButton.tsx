import { downloadApk } from "@/lib/downloadApk";
import {
  APK_DOWNLOAD_NAME,
  APK_SIZE_LABEL,
  APK_VERSION,
  BUILD_ID,
} from "@/game/brand";
import { cn } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

type Variant = "primary" | "ghost" | "success";

const VARIANT: Record<Variant, string> = {
  primary:
    "border border-accent/45 bg-accent/15 text-accent hover:bg-accent/25 font-semibold",
  success:
    "border border-success/40 bg-success/10 text-success hover:bg-success/20 font-medium",
  ghost: "border border-border bg-bg-elevated text-fg-muted hover:text-fg",
};

/** Site-facing APK download (not shown on the in-app launcher menu). */
export function ApkDownloadButton({
  className,
  variant = "primary",
  label = "Download Android APK",
}: {
  className?: string;
  variant?: Variant;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setErr(null);
    setOk(false);
    setPct(0);
    setProgress("Starting…");
    try {
      const result = await downloadApk((p) => {
        setProgress(p.label);
        if (p.total > 0) {
          setPct(Math.min(100, Math.round((p.done / p.total) * 100)));
        }
      });
      if (!result.ok) {
        setErr(result.error);
        setProgress(null);
        setPct(0);
      } else {
        setOk(true);
        setPct(100);
        const mb = (result.bytes / 1e6).toFixed(1);
        setProgress(`Saved ${APK_DOWNLOAD_NAME} v${APK_VERSION} (${mb} MB)`);
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Download failed");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors",
          VARIANT[variant],
          busy && "opacity-70",
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {busy ? progress || "Downloading…" : label}
      </button>
      {busy && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {ok && progress && (
        <p className="text-center text-xs text-success">{progress}</p>
      )}
      {err && (
        <p className="text-center text-xs text-danger" data-apk-error="1">
          {err}
        </p>
      )}
      {!busy && !ok && !err && (
        <p className="text-center text-[0.6rem] text-fg-subtle">
          {APK_DOWNLOAD_NAME} v{APK_VERSION} · {APK_SIZE_LABEL} · build {BUILD_ID}
        </p>
      )}
    </div>
  );
}
