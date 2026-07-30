/** True when running inside Capacitor native shell (APK), not the website. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  };
  try {
    if (w.Capacitor?.isNativePlatform?.()) return true;
    const p = w.Capacitor?.getPlatform?.();
    if (p === "android" || p === "ios") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Website / browser preview only. */
export function isWebSite(): boolean {
  return !isNativeApp();
}
