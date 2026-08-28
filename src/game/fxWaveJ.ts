/** Wave J beam routing — presentation only, no import from fx.ts (avoids cycles). */

export function waveJBeamFor(cardId?: string): string | null {
  const id = (cardId ?? "").toLowerCase();
  if (!id) return null;
  if (id === "axiom_drone") return "axiom_drone";
  if (id.includes("axiom")) return "axiom_ring";
  if (id === "iridium_key") return "iridium_key";
  if (id.includes("iridium")) return "iridium_lance";
  if (id === "quartz_coil") return "quartz_coil";
  if (id.includes("quartz")) return "quartz_ward";
  if (id === "magma_crown") return "magma_crown";
  if (id.includes("magma")) return "magma_ram";
  if (id === "nimbus_runner") return "nimbus_runner";
  if (id.includes("nimbus")) return "nimbus_burst";
  return null;
}

export function isWaveJHeavy(beam?: string): boolean {
  return (
    beam === "iridium_lance" ||
    beam === "iridium_key" ||
    beam === "quartz_ward" ||
    beam === "magma_ram" ||
    beam === "magma_crown" ||
    beam === "nimbus_burst" ||
    beam === "nimbus_runner" ||
    beam === "quartz_coil" ||
    beam === "axiom_ring" ||
    beam === "axiom_drone"
  );
}

export function waveJBeamLabel(beam?: string): string | null {
  switch (beam) {
    case "iridium_lance":
      return "Iridium Lance";
    case "iridium_key":
      return "Iridium Key";
    case "quartz_ward":
      return "Quartz Ward";
    case "magma_ram":
      return "Magma Ram";
    case "magma_crown":
      return "Magma Crown";
    case "nimbus_burst":
      return "Nimbus Burst";
    case "nimbus_runner":
      return "Nimbus Runner";
    case "quartz_coil":
      return "Quartz Coil";
    case "axiom_ring":
      return "Axiom Ring";
    case "axiom_drone":
      return "Axiom Drone";
    default:
      return null;
  }
}
