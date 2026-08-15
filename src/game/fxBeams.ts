/** Wave H / Wave I / Wave J / shared beam presentation helpers — presentation only. */

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
    case "iridium_lance":
      return "#c8dce8";
    case "quartz_ward":
      return "#e0c8ff";
    case "magma_ram":
      return "#ff4a18";
    case "nimbus_burst":
      return "#a8d4ff";
    case "quartz_coil":
      return "#d0b0ff";
    case "axiom_ring":
      return "#70ffc0";
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
    beam === "riftglass_ring" ||
    beam === "iridium_lance" ||
    beam === "quartz_ward" ||
    beam === "magma_ram" ||
    beam === "nimbus_burst" ||
    beam === "quartz_coil" ||
    beam === "axiom_ring"
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

export function isWaveJBeam(beam?: string): boolean {
  return (
    beam === "iridium_lance" ||
    beam === "quartz_ward" ||
    beam === "magma_ram" ||
    beam === "nimbus_burst" ||
    beam === "quartz_coil" ||
    beam === "axiom_ring"
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
    beam === "sonic_coil" ||
    beam === "iridium_lance" ||
    beam === "quartz_coil"
  )
    return "arc";
  if (
    beam === "halo_burst" ||
    beam === "orbit_ring" ||
    beam === "helion_burst" ||
    beam === "magma_ram" ||
    beam === "nimbus_burst"
  )
    return "ember";
  if (
    beam === "tungsten_ram" ||
    beam === "sonic_ram" ||
    beam === "graphene_ward" ||
    beam === "quartz_ward"
  )
    return "spark";
  if (beam === "riftglass_ring" || beam === "axiom_ring") return "void";
  return null;
}
