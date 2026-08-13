/**
 * Wave H battle SFX — layered on top of school routing.
 * Reuses synthesized primitives (no binary audio, APK-safe).
 */
import { playSfx } from "./audio";

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
    card.includes("orbit") ||
    beam === "volt_lance" ||
    beam === "glyph_ward" ||
    beam === "halo_burst" ||
    beam === "tungsten_ram" ||
    beam === "tesla_arc" ||
    beam === "orbit_ring";
  if (!hit) return false;

  if (card.includes("volt") || beam === "volt_lance") {
    playSfx("ion", power * 1.15);
    playSfx("rail", power * 0.7);
  } else if (card.includes("glyph") || beam === "glyph_ward") {
    playSfx("matrix", power * 1.1);
    playSfx("shield_up", power * 0.55);
  } else if (card.includes("halo") || beam === "halo_burst") {
    playSfx("corona", power * 1.15);
    playSfx("nova", power * 0.65);
  } else if (card.includes("tungsten") || beam === "tungsten_ram") {
    playSfx("ferro", power * 1.15);
    playSfx("heavy_clash", power * 0.7);
  } else if (card.includes("tesla") || beam === "tesla_arc") {
    playSfx("ion", power * 1.1);
    playSfx("storm", power * 0.75);
  } else if (card.includes("orbit") || beam === "orbit_ring") {
    playSfx("swarm", power * 1.05);
    playSfx("phase", power * 0.6);
  }
  if (dmg >= 5) playSfx("impact_tail", power * 0.7);
  return true;
}
