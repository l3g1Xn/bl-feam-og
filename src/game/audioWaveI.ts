/**
 * Wave I battle SFX — layered on top of school routing.
 * Reuses synthesized primitives (no binary audio, APK-safe).
 * Unmatched cues fall through to Wave J (iridium / magma / quartz / nimbus / axiom).
 */
import { playSfx } from "./audio";
import { playWaveJSfx } from "./audioWaveJ";

export function playWaveISfx(opts: {
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
    card.includes("cobalt") ||
    card.includes("graphene") ||
    card.includes("helion") ||
    card.includes("sonic") ||
    card.includes("riftglass") ||
    beam === "cobalt_lance" ||
    beam === "graphene_ward" ||
    beam === "helion_burst" ||
    beam === "sonic_ram" ||
    beam === "sonic_coil" ||
    beam === "riftglass_ring";
  if (!hit) return playWaveJSfx(opts);

  if (card.includes("cobalt") || beam === "cobalt_lance") {
    playSfx("frost", power * 1.15);
    playSfx("ion", power * 0.7);
  } else if (card.includes("graphene") || beam === "graphene_ward") {
    playSfx("ferro", power * 1.05);
    playSfx("shield_up", power * 0.6);
  } else if (card.includes("helion") || beam === "helion_burst") {
    playSfx("corona", power * 1.2);
    playSfx("nova", power * 0.7);
  } else if (card.includes("sonic_ram") || beam === "sonic_ram") {
    playSfx("kinetic", power * 1.15);
    playSfx("heavy_clash", power * 0.72);
  } else if (card.includes("sonic") || beam === "sonic_coil") {
    playSfx("storm", power * 1.1);
    playSfx("ion", power * 0.65);
  } else if (card.includes("riftglass") || beam === "riftglass_ring") {
    playSfx("rift", power * 1.1);
    playSfx("phase", power * 0.65);
  }
  if (dmg >= 5) playSfx("impact_tail", power * 0.7);
  return true;
}
