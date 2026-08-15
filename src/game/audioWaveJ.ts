/**
 * Wave J battle SFX — layered on top of school routing.
 * Reuses synthesized primitives (no binary audio, APK-safe).
 */
import { playSfx } from "./audio";

export function playWaveJSfx(opts: {
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
    card.includes("iridium") ||
    card.includes("quartz") ||
    card.includes("magma") ||
    card.includes("nimbus") ||
    card.includes("axiom") ||
    beam === "iridium_lance" ||
    beam === "quartz_ward" ||
    beam === "magma_ram" ||
    beam === "nimbus_burst" ||
    beam === "quartz_coil" ||
    beam === "axiom_ring";
  if (!hit) return false;

  if (card.includes("iridium") || beam === "iridium_lance") {
    playSfx("ferro", power * 1.15);
    playSfx("ion", power * 0.7);
  } else if (card.includes("quartz_coil") || beam === "quartz_coil") {
    playSfx("matrix", power * 1.1);
    playSfx("ion", power * 0.6);
  } else if (card.includes("quartz") || beam === "quartz_ward") {
    playSfx("matrix", power * 1.05);
    playSfx("shield_up", power * 0.62);
  } else if (card.includes("magma") || beam === "magma_ram") {
    playSfx("nova", power * 1.18);
    playSfx("heavy_clash", power * 0.72);
  } else if (card.includes("nimbus") || beam === "nimbus_burst") {
    playSfx("storm", power * 1.15);
    playSfx("phase", power * 0.65);
  } else if (card.includes("axiom") || beam === "axiom_ring") {
    playSfx("quantum", power * 1.12);
    playSfx("ion", power * 0.68);
  }
  if (dmg >= 5) playSfx("impact_tail", power * 0.7);
  return true;
}
