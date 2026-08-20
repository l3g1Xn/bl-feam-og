# Battle Legions: For We Are Many

<p align="center">
  <img src="public/ui/title_logo_v1.06.666.svg" alt="Battle Legions v1.0.7 · Cooked By Many" width="720" />
</p>

> Offline collectible card combat where high-tech legions fight with medieval physics, lasers, and math that actually tells you the truth.

Welcome, commander. This is the short, slightly sarcastic field manual for **Battle Legions: For We Are Many** — a Hearthstone-shaped command flow dressed in power weapons, discombobulator beams, and live lethal math. No accounts. No cloud. Just your legion, your tickets, and whatever AI leetspeak name is about to learn respect.

---

## Download the game (v1.0.7 — Cooked By Many)

**Direct APK (recommended):**  
**[Download BattleLegions.apk — Release 1.0.7](https://github.com/l3g1Xn/bl-feam-og/releases/download/apk-release-1.0.7/BattleLegions.apk)**

- **Size:** ~129 MB (TraX 9-track soundtrack included · 750 MB hard cap)
- **Platform:** Android (signed offline package, landscape, targetSdk 34 / Samsung compatible)
- **Release page:** [apk-release-1.0.7](https://github.com/l3g1Xn/bl-feam-og/releases/tag/apk-release-1.0.7)
- **Web / site practice:** play in browser at the Grok-hosted site (same rules, no PIN vault)

Install the APK, unlock the PIN vault once if prompted, and you are in **LEGIXN COMMAND**. The web build lands straight on command. PIN is APK-only (local vault, no cloud).

---

## What kind of game is this?

You run a modern combat legion armed with:

- Steel, lasers, and beams that would make a tech priest blush
- Minions with **Taunt**, **Immune**, **Reborn**, and board-wide buffs
- Store exclusives (yes, including **Dominus Reximus**)
- **Store Waves A–J** with weekly rotation deals
- A live math HUD so "was that lethal?" is never a mystery novel

Think: drag-and-drop hand, attack trails, card-specific combat FX, denser battle SFX (iridium / magma / quartz / nimbus / axiom on top of Wave I), and an opponent whose name looks like it escaped a 2003 IRC channel.

---

## How to play

1. **Spend mana** to deploy minions and cast high-tech spell protocols.
2. **Taunt** forces attacks. **Immune** and **Reborn** rewrite lethal math while you watch.
3. **Drag** cards from the fanned hand onto the field. Trails show strike direction.
4. Combat is simultaneous: ATK hits both ways. Shields absorb a hit. **Lethal** means ready face-ATK sum is greater than or equal to enemy HP with no Taunt in the way.
5. Win matches, bank **tickets** and XP, level the Legion, unlock more toys.

### Modes and meta

| Thing | What it does |
| --- | --- |
| **Ranked practice** | Normal / Hard AI — same rules, different pain |
| **Ticket store** | Spend tickets on exclusives (Wave A–J rotation, prices ×2, level-gated) |
| **Collection** | Own cards, build the deck, view portraits |
| **LX_SAVE_GAME** | Auto-save on close; load from the main menu (local only) |
| **PIN vault (APK)** | Local lock on reopen — no cloud |

### Audio and graphics

- **Legion TraX soundtrack** — 9 individual tracks (split from originals)
- Combat SFX stay layered (Wave H + I + J iridium / magma / quartz / nimbus / axiom); music ducks during battle
- Multi-layer battle VFX (beams, particles, hit-stop, residual trails)
- Graphics quality live: **Low → UltraHD**
- Mobile-first safe areas, coarse-pointer hit targets, landscape phone / foldable layouts

---

## Version notes

**1.0.7** — *Cooked By Many · TraX + Wave J + reward-lock*

- Brand stamp **1.0.7** (versionCode 100007) — Cooked By Many edition
- Store Waves A / B / C / D / E / F / G / H / I / **J** weekly rotation
- Full TraX 9-track soundtrack baked in
- `uuid` override **11.1.1** · `nanoid` override **3.3.18**
- 750 MB APK ceiling · targetSdk 34 (Samsung compatible)

### Maintenance patch (2026.08.15 — reward-lock)

- **Ticket / XP save-scum closed.** Every match carries a stable `matchId`. Rewards are paid once and recorded in a persisted ledger (`rewardedMatchIds`, capped at 64). Reloading a near-end save and finishing again yields zero tickets/XP and an "already claimed" notice on the End screen.
- BUILD_ID: `2026.08.15-v1.0.7-reward-lock`
- Version numbers unchanged (still 1.0.7 / 100007).

### Maintenance patch (2026.08.16 — release-notes sync)

- Workflow / GitHub release NOTES aligned to **750 MB** hard cap and BUILD_ID `2026.08.15-v1.0.7-reward-lock` (was stale 350 MB / cooked-by-many). Reward-lock note above is unchanged. Version still 1.0.7 / 100007.

### Maintenance patch (2026.08.18 — Wave J arts + EndScreen + missing-id withhold)

- Dedicated Wave J portraits (`public/cards/<id>.jpg`) are no longer remapped through `WAVE_J_ART_ALIAS` onto older cards. EndScreen **Save** removed — `isPlayablePhase` excludes victory/defeat so that button could never succeed. `rewardMatch` now withholds tickets/XP when `matchId` is missing (unbound claim blocked). BUILD_ID remains `2026.08.15-v1.0.7-reward-lock`. Version still 1.0.7 / 100007.

### Maintenance patch (2026.08.19 — clear leftover save on lethal)

- `writeMatchSave` now **clears** the leftover mid-match snapshot when the incoming phase is victory/defeat (lethal attack/spell used to no-op and leave the prior board loadable). Reward-lock (`matchId` + `rewardedMatchIds`) is unchanged. BUILD_ID remains `2026.08.15-v1.0.7-reward-lock`. Version still 1.0.7 / 100007.

### Maintenance patch (2026.08.20 — APK Wave J CSS + overlay safe-area)

- Capacitor shell (`mobile-entry.tsx`) now loads `styles.wavej.css` so foldable / 280px / coarse-pointer / hinge rules ship in the APK, not only the website. Overlay screens (End, Mulligan, PIN vault, permissions) use `.launcher-shell`; launcher header and Mulligan Menu clear the notch; EndScreen distinguishes withheld vs already-claimed. Reward-lock unchanged. BUILD_ID remains `2026.08.15-v1.0.7-reward-lock`. Version still 1.0.7 / 100007.

### Maintenance patch (2026.08.20 — unique Store Wave H/I portraits)

- Wave H exclusives now ship dedicated `public/cards/<id>.jpg` portraits (volt / glyph / tungsten / halo / orbit / tesla). `CARD_ART_ALIAS` and `WAVE_I_ART_ALIAS` no longer remap unique arts onto older cards — every store card has its own artwork. Local bake cap in `scripts/build-apk.mjs` synced to **750 MB**. Reward-lock (`matchId` + `rewardedMatchIds`) is unchanged. BUILD_ID remains `2026.08.15-v1.0.7-reward-lock`. Version still 1.0.7 / 100007.

### Maintenance patch (2026.08.20 — unique portraits for remaining duplicate arts)

- 32 older cards still shared identical JPGs (same-hash copies). Dedicated 2:3 portraits now ship for each (nova / photon / mortar / bastion / hydra / saber / hex / ion / mirror / grav / overcharge / void / siege / pulse / spellblade / cryo / omega / phase / shield / orbital / horn / quantum / swarm). EndScreen caches the paid result by `matchId` so fold/PIN remount does not flash "already claimed" after a real payout. Persist merge uses `sanitizeRewardedMatchIds`. Reward-lock (`matchId` + `rewardedMatchIds`, cap 64) is unchanged. BUILD_ID remains `2026.08.15-v1.0.7-reward-lock`. Version still 1.0.7 / 100007.

---

## Quick start checklist

1. Grab the APK: [BattleLegions.apk (1.0.7)](https://github.com/l3g1Xn/bl-feam-og/releases/download/apk-release-1.0.7/BattleLegions.apk)
2. Install, open, and set PIN if asked
3. Hit **Play** (or continue a save)
4. Deploy, trade, read the math HUD, and do not face into Taunt
5. Spend tickets in the store — check weekly Wave J deals

---

## Repository protection

- Canonical repo: **[l3g1Xn/bl-feam-og](https://github.com/l3g1Xn/bl-feam-og)**
- Releases under tag `apk-release-1.0.7` (version held for this maintenance patch)
- Do not re-scaffold duplicate same-premise card battlers into this tree
- Security policy: [SECURITY.md](SECURITY.md)
- CODEOWNERS: @l3g1Xn
