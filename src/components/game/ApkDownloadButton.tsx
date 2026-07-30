import { downloadApk, openGithubApk } from "@/lib/downloadApk";
import {
  APK_DOWNLOAD_NAME,
  APK_SIZE_LABEL,
  APK_VERSION,
  BUILD_ID,
  GITHUB_RELEASE_PAGE,
} from "@/game/brand";
import { cn } from "@/lib/utils";
import { Download, ExternalLink, Github, Loader2 } from "lucide-react";
import { useState } from "react";

type Variant = "primary" | "ghost" | "success";

const VARIANT: Record<Variant, string> = {
  primary:
    "border border-success/40 bg-success/15 text-success hover:bg-success/25 font-semibold",
  success:
    "border border-success/40 bg-success/10 text-success hover:bg-success/20 font-medium",
  ghost: "border border-border bg-bg-elevated text-fg-muted hover:text-fg",
};

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

  const openInstallPage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open("/pkg/install.html?autostart=1", "_blank", "noopener,noreferrer");
  };

  const openGithub = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openGithubApk();
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={cn(
          "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm transition active:scale-[0.99] disabled:opacity-70",
          VARIANT[variant],
        )}
        aria-label={`Download ${APK_DOWNLOAD_NAME} version ${APK_VERSION}`}
        data-apk-download="1"
        data-apk-version={APK_VERSION}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <Download className="h-4 w-4 shrink-0" />
        )}
        {busy ? "Preparing APK…" : label}
      </button>

      {busy && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={openInstallPage}
          className="inline-flex items-center justify-center gap-1.5 text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
          data-apk-install-page="1"
        >
          <ExternalLink className="h-3 w-3" />
          Install page
        </button>
        <a
          href={GITHUB_RELEASE_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openGithub}
          className="inline-flex items-center justify-center gap-1.5 text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
          data-apk-github="1"
        >
          <Github className="h-3 w-3" />
          GitHub v{APK_VERSION}
        </a>
      </div>

      {progress && (
        <p
          className={cn(
            "text-center text-xs tabular",
            ok ? "text-success" : "text-fg-muted",
          )}
          data-apk-status="1"
        >
          {progress}
        </p>
      )}
      {err && (
        <p className="text-center text-xs text-danger" data-apk-error="1">
          {err}
        </p>
      )}
      {!busy && !ok && !err && (
        <p className="text-center text-[0.6rem] text-fg-subtle">
          {APK_DOWNLOAD_NAME} v{APK_VERSION} · {APK_SIZE_LABEL} · build {BUILD_ID}
          <br />
          Same package as GitHub release apk-release-{APK_VERSION}
        </p>
      )}
    </div>
  );
}
