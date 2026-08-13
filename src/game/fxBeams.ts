/** Wave H / shared beam presentation helpers — presentation only. */

export function waveHTint(beam?: string): string | null {
  switch (beam) {
    case "volt_lance":
      return "#6cffd0";
    case "glyph_ward":
      return "#80c8ff";
    case "halo_burst":
      return "#ffe070";
    case "tungsten_ram":
      return "#c8b090";
    case "tesla_arc":
      return "#70fff0";
    case "orbit_ring":
      return "#ffa060";
    default:
      return null;
  }
}

export function isWaveHBeam(beam?: string): boolean {
  return (
    beam === "volt_lance" ||
    beam === "glyph_ward" ||
    beam === "halo_burst" ||
    beam === "tungsten_ram" ||
    beam === "tesla_arc" ||
    beam === "orbit_ring"
  );
}

export function waveHParticleKind(
  beam?: string,
): "arc" | "ember" | "spark" | "void" | null {
  if (beam === "volt_lance" || beam === "tesla_arc" || beam === "glyph_ward")
    return "arc";
  if (beam === "halo_burst" || beam === "orbit_ring") return "ember";
  if (beam === "tungsten_ram") return "spark";
  return null;
}
