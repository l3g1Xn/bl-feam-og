import {
  APK_DOWNLOAD_NAME,
  APK_SIZE_LABEL,
  APK_VERSION,
  BUILD_ID,
  GITHUB_RELEASE_PAGE,
} from "@/game/brand";
import { cn } from "@/lib/utils";
import { ExternalLink, Github } from "lucide-react";

type Variant = "primary" | "ghost" | "success";

const VARIANT: Record<Variant, string> = {
  primary:
    "border border-border bg-bg-elevated text-fg-muted font-semibold opacity-80",
  success:
    "border border-border bg-bg-elevated text-fg-muted font-medium opacity-80",
  ghost: "border border-border bg-bg-elevated text-fg-muted",
};

/** Download is disabled while no release package is published. */
export function ApkDownloadButton({
  className,
  variant = "primary",
  label = "Download Android APK",
}: {
  className?: string;
  variant?: Variant;
  label?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <button
        type="button"
        disabled
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors",
          VARIANT[variant],
        )}
      >
        {label} — unavailable
      </button>
      <p className="text-center text-[0.65rem] text-fg-subtle">
        {APK_DOWNLOAD_NAME} · {APK_VERSION} · {APK_SIZE_LABEL}
        <br />
        No package published · build {BUILD_ID}
      </p>
      <a
        href={GITHUB_RELEASE_PAGE}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-9 items-center justify-center gap-1.5 text-xs text-fg-muted hover:text-fg"
      >
        <Github className="h-3.5 w-3.5" />
        GitHub releases
        <ExternalLink className="h-3 w-3 opacity-60" />
      </a>
    </div>
  );
}
