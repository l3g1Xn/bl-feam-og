/** Wave H / Wave I / shared beam presentation helpers — presentation only. */

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
    case "cobalt_lance":
      return "#5ee0ff";
    case "graphene_ward":
      return "#9aacbe";
    case "helion_burst":
      return "#ff7a30";
    case "sonic_ram":
      return "#c8a0ff";
    case "sonic_coil":
      return "#b080ff";
    case "riftglass_ring":
      return "#70ffe8";
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
    beam === "orbit_ring" ||
    beam === "cobalt_lance" ||
    beam === "graphene_ward" ||
    beam === "helion_burst" ||
    beam === "sonic_ram" ||
    beam === "sonic_coil" ||
    beam === "riftglass_ring"
  );
}

export function isWaveIBeam(beam?: string): boolean {
  return (
    beam === "cobalt_lance" ||
    beam === "graphene_ward" ||
    beam === "helion_burst" ||
    beam === "sonic_ram" ||
    beam === "sonic_coil" ||
    beam === "riftglass_ring"
  );
}

export function waveHParticleKind(
  beam?: string,
): "arc" | "ember" | "spark" | "void" | null {
  if (
    beam === "volt_lance" ||
    beam === "tesla_arc" ||
    beam === "glyph_ward" ||
    beam === "cobalt_lance" ||
    beam === "sonic_coil"
  )
    return "arc";
  if (beam === "halo_burst" || beam === "orbit_ring" || beam === "helion_burst")
    return "ember";
  if (beam === "tungsten_ram" || beam === "sonic_ram" || beam === "graphene_ward")
    return "spark";
  if (beam === "riftglass_ring") return "void";
  return null;
}
