/** Canonical product name — use everywhere user-facing. */
export const GAME_TITLE = "Battle Legions: For We Are Many";
/** Compact label for headers / app chrome. */
export const GAME_TITLE_SHORT = "Battle Legions";

/** Android package file name presented to players. */
export const APK_DOWNLOAD_NAME = "BattleLegions.apk";
/** Local / site-relative path (preview + hosts that allow large binaries). */
export const APK_DOWNLOAD_PATH = "/downloads/BattleLegions.apk";
/** Semantic version printed on the site and in the Android package. */
export const APK_VERSION = "1.06.666";
/** Approx size for UI copy — TraX soundtrack included (2 suites). */
export const APK_SIZE_LABEL = "~116 MB";
/** Hard APK size ceiling (bytes) — 350 MB packed target with TraX + stock art. */
export const APK_MAX_BYTES = 350 * 1024 * 1024;
/**
 * Canonical backup host — same binary as the site Download button.
 * Private repo: must be signed into GitHub as the owner to fetch.
 */
export const GITHUB_REPO = "l3g1Xn/bl-feam-og";
export const GITHUB_RELEASE_TAG = "apk-release-1.06.666";
export const GITHUB_APK_URL =
  "https://github.com/l3g1Xn/bl-feam-og/releases/download/apk-release-1.06.666/BattleLegions.apk";
export const GITHUB_RELEASE_PAGE =
  "https://github.com/l3g1Xn/bl-feam-og/releases/tag/apk-release-1.06.666";

/** Ship stamp — Wave J iridium/magma/quartz/nimbus/axiom stock + combat SFX/VFX (version held at 1.06.666). */
export const BUILD_ID = "2026.08.15-v1.06.666-waveJ";

/** Title logo asset (version-stamped banner for launcher / README). */
export const TITLE_LOGO_SRC = "/ui/title_logo_v1.06.666.svg";

/** Home / store wave badge — do not bump APK version when this cycles. */
export const STORE_WAVE_LABEL = "Store Wave A–J";
export const STORE_STOCK_BLURB = "Wave J store stock";
