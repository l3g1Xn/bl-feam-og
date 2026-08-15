import type { BeamStyle } from "./fx";

/** Map Wave I card ids onto beam styles already tinted in fxBeams. */
export function waveIBeamFor(cardId?: string): BeamStyle | null {
  const id = (cardId ?? "").toLowerCase();
  if (!id) return null;
  if (id.includes("riftglass")) return "riftglass_ring" as BeamStyle;
  if (id.includes("cobalt")) return "cobalt_lance" as BeamStyle;
  if (id.includes("graphene")) return "graphene_ward" as BeamStyle;
  if (id.includes("helion")) return "helion_burst" as BeamStyle;
  if (id.includes("sonic_ram")) return "sonic_ram" as BeamStyle;
  if (id.includes("sonic")) return "sonic_coil" as BeamStyle;
  return null;
}

export function isWaveIHeavy(beam?: string): boolean {
  return (
    beam === "cobalt_lance" ||
    beam === "graphene_ward" ||
    beam === "helion_burst" ||
    beam === "sonic_ram" ||
    beam === "sonic_coil" ||
    beam === "riftglass_ring"
  );
}

export function waveIBeamLabel(beam?: string): string | null {
  switch (beam) {
    case "cobalt_lance":
      return "Cobalt Lance";
    case "graphene_ward":
    return "Graphene Ward";
    case "helion_burst":
      return "Helion Burst";
    case "sonic_ram":
      return "Sonic Ram";
    case "sonic_coil":
      return "Sonic Coil";
    case "riftglass_ring":
      return "Riftglass Ring";
    default:
      return null;
  }
}
