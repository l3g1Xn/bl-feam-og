/** Wave I beam routing — presentation only, no import from fx.ts (avoids cycles). */

export function waveIBeamFor(cardId?: string): string | null {
  const id = (cardId ?? "").toLowerCase();
  if (!id) return null;
  if (id.includes("riftglass")) return "riftglass_ring";
  if (id.includes("cobalt")) return "cobalt_lance";
  if (id.includes("graphene")) return "graphene_ward";
  if (id.includes("helion")) return "helion_burst";
  if (id.includes("sonic_ram")) return "sonic_ram";
  if (id.includes("sonic")) return "sonic_coil";
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
