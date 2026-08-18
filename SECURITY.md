# Security policy — Battle Legions

Canonical repo: **l3g1Xn/bl-feam-og**

## Supported release

| Package | Version | Status |
| --- | --- | --- |
| BattleLegions.apk | **1.0.7** (versionCode 100007) | Current — version held · Cooked By Many |

Version is only bumped for a **major bugfix** or a full **UI/UX art overhaul**. Store stock, SFX/VFX, and weekly rotation ship under the held version.

## Reporting a vulnerability

Open a **private** security advisory on this repository (GitHub Security Advisories) or email the owner via GitHub. Do not file a public issue with exploit details.

Include:

- Affected surface (web, APK, store, PIN vault, combat math)
- Steps to reproduce
- Impact (integrity / availability / data)

## Hardening in this build

- Offline game — no cloud accounts, no remote save
- PIN vault is **APK-only** and local (never transmitted)
- Reward lock: `matchId` + `rewardedMatchIds` ledger (cap 64) — tickets/XP paid once per match
- Dependabot is **off** — do not add `.github/dependabot.yml`
- Transitive pins via `overrides`:
  - `uuid` **11.1.1** (GHSA-w5hq-g745-h8pq / CVE-2026-41907)
  - `nanoid` **3.3.18** (GHSA-2v37-7h3g-55p8 / CVE-2026-67213)
- Release keystore is **not** in the tree — GitHub Actions secrets only
- No secrets in source; release tag stays `apk-release-1.0.7` (clobber APK only — do not mint new tags)
- Mobile-safe: landscape + foldable + 280px + hinge-band layouts, coarse-pointer targets, safe-area insets, `prefers-reduced-motion`
- CODEOWNERS: @l3g1Xn

## Scope notes

This is a single-player collectible card battler. Do not open inbound multiplayer sockets or upload player data. Dummy APK padding under `public/pkg` is not executable content.
