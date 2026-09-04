# Wave card arts

Production card arts. Every store exclusive (Waves H / I / J) has a dedicated
`public/cards/<id>.jpg` — do not re-enable `CARD_ART_ALIAS` / `WAVE_I_ART_ALIAS`
/ `WAVE_J_ART_ALIAS` remaps.

## Wave H (2026-08-20 bake)

- volt_lance.jpg (arcane spell – high-voltage kill-spike)
- glyph_sentinel.jpg (arcane minion – rune-locked Taunt Shield turret)
- tungsten_ram.jpg (steel minion – Charge dense-metal breach)
- halo_burst.jpg (arcane spell – radiant flare ring AOE)
- orbit_drone.jpg (ember minion – Rush Reborn satellite escort)
- tesla_coil.jpg (arcane minion – Taunt arc-capacitor tower)
- glyph_key.jpg (arcane spell – cipher unlock)
- halo_crown.jpg (arcane spell – +2/+2 radiant command)
- volt_runner.jpg (ember minion – Charge overclocked shock infantry)
- tungsten_throne.jpg (steel minion – Taunt Shield Reborn capital siege seat)

## Wave I / J (2026-08-15 bake)

- cobalt_lance.jpg (frost spell – cryo-cobalt kill-spike)
- graphene_sentinel.jpg (steel minion – carbon-lattice Taunt Shield)
- sonic_ram.jpg (arcane minion – Charge harmonic breach)
- helion_burst.jpg (ember spell – solar-core flare AOE)
- riftglass_drone.jpg (shadow minion – Rush Reborn)
- sonic_coil.jpg (arcane minion – Taunt resonant tower)
- cobalt_key.jpg (frost spell – +Spell Power + draw)
- helion_crown.jpg (ember spell – +2/+2 all friendly)
- graphene_runner.jpg (steel minion – Charge carbon infantry)
- riftglass_throne.jpg (shadow minion – Taunt Shield Reborn)
- iridium_lance.jpg (steel spell – dense kill-spike)
- quartz_sentinel.jpg (arcane minion – Taunt Shield crystal)
- magma_ram.jpg (ember minion – Charge core-forged)
- nimbus_burst.jpg (frost spell – storm-cell flare AOE)
- axiom_drone.jpg (arcane minion – Rush Reborn logic)
- quartz_coil.jpg (arcane minion – Taunt piezo tower)
- iridium_key.jpg (steel spell – +Spell Power + draw)
- magma_crown.jpg (ember spell – +2/+2 furnace command)
- nimbus_runner.jpg (frost minion – Charge storm-sprint)
- axiom_throne.jpg (arcane minion – Taunt Shield Reborn)

Style matched to existing high-tech legion card art. Quality optimized (~140–350 KB each).

## Visual-duplicate bake (2026-09-04)

Eleven older cards still shared a near-identical portrait (byte hashes differed,
compositions did not). Dedicated 2:3 JPGs now ship for:

- iron_colossus.jpg (Siege Chassis — squat laser artillery wall)
- precise_cut.jpg (Precision Laser — surgical targeting beam)
- scorch_study.jpg (Scorch Analysis — thermal forensic study)
- reaper_wraith.jpg (Reaper Wraith — phase scythe + Reborn afterimage)
- void_sovereign.jpg (Void Sovereign — crowned void emperor)
- blood_pact.jpg (Blood Pact — crimson ritual contract)
- grav_anchor.jpg (Grav Anchor — gravity pylon, not ice)
- ion_symphony.jpg (Ion Symphony — capacitor choir)
- shieldbearer.jpg (Aegis Operator — soldier with tower shield)
- math_golem.jpg (Logic Core — equation golem)
- warden.jpg (Riot Bastion — compact riot tower)

Do not copy-encode these from sibling cards.

After these files are in place, trigger the **Build and publish BattleLegions.apk** workflow for a full production bake.