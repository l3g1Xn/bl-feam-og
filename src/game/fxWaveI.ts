/** Wave I beam routing — presentation only, no import from fx.ts (avoids cycles). */

export function waveIBeamFor(cardId?: string): string | null {
  const id = (cardId ?? "").toLowerCase();
  if (!id) return null;
  if (id === "riftglass_drone") return "riftglass_drone";
  if (id === "riftglass_throne") return "riftglass_throne";
  if (id.includes("riftglass")) return "riftglass_ring";
  if (id === "cobalt_key") return "cobalt_key";
  if (id.includes("cobalt")) return "cobalt_lance";
  if (id === "graphene_runner") return "graphene_runner";
  if (id === "graphene_sentinel") return "graphene_sentinel";
  if (id.includes("graphene")) return "graphene_ward";
  if (id === "helion_crown") return "helion_crown";
  if (id.includes("helion")) return "helion_burst";
  if (id.includes("sonic_ram")) return "sonic_ram";
  if (id.includes("sonic")) return "sonic_coil";
  return null;
}

export function isWaveIHeavy(beam?: string): boolean {
  return (
    beam === "cobalt_lance" ||
    beam === "cobalt_key" ||
    beam === "graphene_ward" ||
    beam === "graphene_runner" ||
    beam === "graphene_sentinel" ||
    beam === "helion_burst" ||
    beam === "helion_crown" ||
    beam === "sonic_ram" ||
    beam === "sonic_coil" ||
    beam === "riftglass_ring" ||
    beam === "riftglass_drone" ||
    beam === "riftglass_throne"
  );
}

export function waveIBeamLabel(beam?: string): string | null {
  switch (beam) {
    case "cobalt_lance":
      return "Cobalt Lance";
    case "cobalt_key":
      return "Cobalt Key";
    case "graphene_ward":
      return "Graphene Ward";
    case "graphene_runner":
      return "Graphene Runner";
    case "graphene_sentinel":
      return "Graphene Sentinel";
    case "helion_burst":
      return "Helion Burst";
    case "helion_crown":
      return "Helion Crown";
    case "sonic_ram":
      return "Sonic Ram";
    case "sonic_coil":
      return "Sonic Coil";
    case "riftglass_ring":
      return "Riftglass Ring";
    case "riftglass_drone":
      return "Riftglass Drone";
    case "riftglass_throne":
      return "Riftglass Throne";
    default:
      return null;
  }
}
