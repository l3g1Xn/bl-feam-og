# Security policy — Battle Legions

Canonical repo: **l3g1Xn/bl-feam-og**

## Supported release

| Package | Version | Status |
| --- | --- | --- |
| BattleLegions.apk | **1.06.666** (versionCode 106666) | Current — version held |

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
- Dependabot enabled for npm + GitHub Actions (weekly)
- Transitive pins via `overrides`:
  - `uuid` **11.1.1** (GHSA-w5hq-g745-h8pq / CVE-2026-41907)
  - `nanoid` **3.3.18** (GHSA-2v37-7h3g-55p8 / CVE-2026-67213)
- No secrets in source; release tags stay `v1.06.666` / `apk-release-1.06.666`
- Mobile-safe: landscape + foldable layouts, coarse-pointer targets, safe-area insets, `prefers-reduced-motion`
- CODEOWNERS: @l3g1Xn

## Scope notes

This is a single-player collectible card battler. Do not open inbound multiplayer sockets or upload player data. Dummy APK padding under `public/pkg` is not executable content.
