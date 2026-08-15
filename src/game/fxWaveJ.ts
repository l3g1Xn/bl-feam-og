/** Wave J beam routing — presentation only, no import from fx.ts (avoids cycles). */

export function waveJBeamFor(cardId?: string): string | null {
  const id = (cardId ?? "").toLowerCase();
  if (!id) return null;
  if (id.includes("axiom")) return "axiom_ring";
  if (id.includes("iridium")) return "iridium_lance";
  if (id.includes("quartz_coil")) return "quartz_coil";
  if (id.includes("quartz")) return "quartz_ward";
  if (id.includes("magma")) return "magma_ram";
  if (id.includes("nimbus")) return "nimbus_burst";
  return null;
}

export function isWaveJHeavy(beam?: string): boolean {
  return (
    beam === "iridium_lance" ||
    beam === "quartz_ward" ||
    beam === "magma_ram" ||
    beam === "nimbus_burst" ||
    beam === "quartz_coil" ||
    beam === "axiom_ring"
  );
}

export function waveJBeamLabel(beam?: string): string | null {
  switch (beam) {
    case "iridium_lance":
      return "Iridium Lance";
    case "quartz_ward":
      return "Quartz Ward";
    case "magma_ram":
      return "Magma Ram";
    case "nimbus_burst":
      return "Nimbus Burst";
    case "quartz_coil":
      return "Quartz Coil";
    case "axiom_ring":
      return "Axiom Ring";
    default:
      return null;
  }
}
