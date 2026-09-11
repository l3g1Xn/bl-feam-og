/**
 * Wave H battle SFX — layered on top of school routing.
 * Reuses synthesized primitives (no binary audio, APK-safe).
 * Unmatched cues fall through to Wave I (helion / cobalt / graphene / sonic / riftglass).
 */
import { playSfx } from "./audio";
import { playWaveISfx } from "./audioWaveI";

export function playWaveHSfx(opts: {
  cardId?: string;
  beam?: string;
  kind?: string;
  damage?: number;
}): boolean {
  const card = (opts.cardId || "").toLowerCase();
  const beam = (opts.beam || "").toLowerCase();
  const dmg = opts.damage ?? 0;
  const power = 0.9 + Math.min(1.1, dmg * 0.12);
  const hit =
    card.includes("volt") ||
    card.includes("glyph") ||
    card.includes("halo") ||
    card.includes("tungsten") ||
    card.includes("tesla") ||
    card === "orbit_drone" ||
    beam === "volt_lance" ||
    beam === "volt_runner" ||
    beam === "glyph_ward" ||
    beam === "glyph_key" ||
    beam === "glyph_sentinel" ||
    beam === "halo_burst" ||
    beam === "halo_crown" ||
    beam === "tungsten_ram" ||
    beam === "tungsten_throne" ||
    beam === "tesla_arc" ||
    beam === "orbit_ring";
  if (!hit) return playWaveISfx(opts);

  if (card === "volt_runner" || beam === "volt_runner") {
    playSfx("ion", power * 1.02);
    playSfx("phase", power * 0.58);
  } else if (card.includes("volt") || beam === "volt_lance") {
    playSfx("ion", power * 1.15);
    playSfx("rail", power * 0.7);
  } else if (card === "glyph_key" || beam === "glyph_key") {
    playSfx("matrix", power * 1.0);
    playSfx("ion", power * 0.55);
  } else if (card.includes("glyph") || beam === "glyph_ward") {
    playSfx("matrix", power * 1.1);
    playSfx("shield_up", power * 0.55);
  } else if (card === "halo_crown" || beam === "halo_crown") {
    playSfx("corona", power * 1.08);
    playSfx("shield_up", power * 0.58);
  } else if (card.includes("halo") || beam === "halo_burst") {
    playSfx("corona", power * 1.15);
    playSfx("nova", power * 0.65);
  } else if (card === "tungsten_throne" || beam === "tungsten_throne") {
    playSfx("ferro", power * 1.08);
    playSfx("shield_up", power * 0.62);
  } else if (card.includes("tungsten") || beam === "tungsten_ram") {
    playSfx("ferro", power * 1.15);
    playSfx("heavy_clash", power * 0.7);
  } else if (card.includes("tesla") || beam === "tesla_arc") {
    playSfx("ion", power * 1.1);
    playSfx("storm", power * 0.75);
  } else if (card === "orbit_drone" || beam === "orbit_ring") {
    playSfx("swarm", power * 1.05);
    playSfx("phase", power * 0.6);
  }
  if (dmg >= 5) playSfx("impact_tail", power * 0.7);
  return true;
}
