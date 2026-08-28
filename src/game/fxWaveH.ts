/** Wave H beam routing — presentation only, no import from fx.ts (avoids cycles). */

export function waveHBeamFor(cardId?: string): string | null {
  const id = (cardId ?? "").toLowerCase();
  if (!id) return null;
  if (id === "volt_runner") return "volt_runner";
  if (id.includes("volt")) return "volt_lance";
  if (id === "glyph_key") return "glyph_key";
  if (id.includes("glyph")) return "glyph_ward";
  if (id === "halo_crown") return "halo_crown";
  if (id.includes("halo")) return "halo_burst";
  if (id === "tungsten_throne") return "tungsten_throne";
  if (id.includes("tungsten")) return "tungsten_ram";
  if (id.includes("tesla")) return "tesla_arc";
  if (id.includes("orbit")) return "orbit_ring";
  return null;
}

export function isWaveHHeavy(beam?: string): boolean {
  return (
    beam === "volt_lance" ||
    beam === "volt_runner" ||
    beam === "glyph_ward" ||
    beam === "glyph_key" ||
    beam === "halo_burst" ||
    beam === "halo_crown" ||
    beam === "tungsten_ram" ||
    beam === "tungsten_throne" ||
    beam === "tesla_arc" ||
    beam === "orbit_ring"
  );
}

export function waveHBeamLabel(beam?: string): string | null {
  switch (beam) {
    case "volt_lance":
      return "Volt Lance";
    case "volt_runner":
      return "Volt Runner";
    case "glyph_ward":
      return "Glyph Ward";
    case "glyph_key":
      return "Glyph Key";
    case "halo_burst":
      return "Halo Burst";
    case "halo_crown":
      return "Halo Crown";
    case "tungsten_ram":
      return "Tungsten Ram";
    case "tungsten_throne":
      return "Tungsten Throne";
    case "tesla_arc":
      return "Tesla Arc";
    case "orbit_ring":
      return "Orbit Ring";
    default:
      return null;
  }
}
