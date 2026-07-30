/** Canonical product name — use everywhere user-facing. */
export const GAME_TITLE = "Battle Legions: For We Are Many";
/** Compact label for headers / app chrome. */
export const GAME_TITLE_SHORT = "Battle Legions";

/** Android package file name presented to players. */
export const APK_DOWNLOAD_NAME = "BattleLegions.apk";
/** Local / site-relative path (preview + hosts that allow large binaries). */
export const APK_DOWNLOAD_PATH = "/downloads/BattleLegions.apk";
/** Semantic version printed on the site and in the Android package. */
export const APK_VERSION = "1.01";
/** Approx size for UI copy (release build ~40 MiB). */
export const APK_SIZE_LABEL = "~41 MB";
/**
 * Canonical backup host — same binary as the site Download button.
 * Private repo: must be signed into GitHub as the owner to fetch.
 */
export const GITHUB_REPO = "l3g1Xn/bl-feam-og";
export const GITHUB_RELEASE_TAG = "apk-release-1.01";
export const GITHUB_APK_URL =
  "https://github.com/l3g1Xn/bl-feam-og/releases/download/apk-release-1.01/BattleLegions.apk";
export const GITHUB_RELEASE_PAGE =
  "https://github.com/l3g1Xn/bl-feam-og/releases/tag/apk-release-1.01";

/** Bump when shipping site+APK together so players can confirm sync. */
export const BUILD_ID = "2026.07.30-release-1.01";
