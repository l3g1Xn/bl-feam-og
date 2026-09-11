/** Wave H / Wave I / Wave J / shared beam presentation helpers — presentation only. */

export function waveHTint(beam?: string): string | null {
  switch (beam) {
    case "volt_lance":
      return "#6cffd0";
    case "volt_runner":
      return "#88ffe0";
    case "glyph_ward":
      return "#80c8ff";
    case "glyph_key":
      return "#9ad4ff";
    case "glyph_sentinel":
      return "#6ab8ff";
    case "halo_burst":
      return "#ffe070";
    case "halo_crown":
      return "#ffd048";
    case "tungsten_ram":
      return "#c8b090";
    case "tungsten_throne":
      return "#d4c09c";
    case "tesla_arc":
      return "#70fff0";
    case "orbit_ring":
      return "#ffa060";
    case "ion_grid":
      return "#5ad4ff";
    case "legion_signal":
      return "#d4c878";
    case "orbital_scan":
      return "#7ec8ff";
    case "cobalt_lance":
      return "#5ee0ff";
    case "cobalt_key":
      return "#7ae8ff";
    case "graphene_ward":
      return "#9aacbe";
    case "graphene_runner":
      return "#b0c0ce";
    case "graphene_sentinel":
      return "#8aa0b4";
    case "helion_burst":
      return "#ff7a30";
    case "helion_crown":
      return "#ff9448";
    case "sonic_ram":
      return "#c8a0ff";
    case "sonic_coil":
      return "#b080ff";
    case "riftglass_ring":
      return "#70ffe8";
    case "riftglass_drone":
      return "#58f0d8";
    case "riftglass_throne":
      return "#40e8cc";
    case "iridium_lance":
      return "#c8dce8";
    case "iridium_key":
      return "#d4e6f0";
    case "quartz_ward":
      return "#e0c8ff";
    case "quartz_sentinel":
      return "#ecc8ff";
    case "magma_ram":
      return "#ff4a18";
    case "magma_crown":
      return "#ff6a28";
    case "nimbus_burst":
      return "#a8d4ff";
    case "nimbus_runner":
      return "#c0e0ff";
    case "quartz_coil":
      return "#d0b0ff";
    case "axiom_ring":
      return "#70ffc0";
    case "axiom_drone":
      return "#58f0b0";
    case "axiom_throne":
      return "#40e8a0";
    default:
      return null;
  }
}

export function isWaveHBeam(beam?: string): boolean {
  return (
    beam === "volt_lance" ||
    beam === "volt_runner" ||
    beam === "glyph_ward" ||
    beam === "glyph_key" ||
    beam === "glyph_sentinel" ||
    beam === "halo_burst" ||
    beam === "halo_crown" ||
    beam === "tungsten_ram" ||
    beam === "tungsten_throne" ||
    beam === "tesla_arc" ||
    beam === "orbit_ring" ||
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
    beam === "riftglass_throne" ||
    beam === "iridium_lance" ||
    beam === "iridium_key" ||
    beam === "quartz_ward" ||
    beam === "quartz_sentinel" ||
    beam === "magma_ram" ||
    beam === "magma_crown" ||
    beam === "nimbus_burst" ||
    beam === "nimbus_runner" ||
    beam === "quartz_coil" ||
    beam === "axiom_ring" ||
    beam === "axiom_drone" ||
    beam === "axiom_throne"
  );
}

export function isWaveIBeam(beam?: string): boolean {
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

export function isWaveJBeam(beam?: string): boolean {
  return (
    beam === "iridium_lance" ||
    beam === "iridium_key" ||
    beam === "quartz_ward" ||
    beam === "quartz_sentinel" ||
    beam === "magma_ram" ||
    beam === "magma_crown" ||
    beam === "nimbus_burst" ||
    beam === "nimbus_runner" ||
    beam === "quartz_coil" ||
    beam === "axiom_ring" ||
    beam === "axiom_drone" ||
    beam === "axiom_throne"
  );
}

export function waveHParticleKind(
  beam?: string,
): "arc" | "ember" | "spark" | "void" | null {
  if (
    beam === "volt_lance" ||
    beam === "volt_runner" ||
    beam === "tesla_arc" ||
    beam === "glyph_ward" ||
    beam === "glyph_key" ||
    beam === "glyph_sentinel" ||
    beam === "cobalt_lance" ||
    beam === "cobalt_key" ||
    beam === "sonic_coil" ||
    beam === "iridium_lance" ||
    beam === "iridium_key" ||
    beam === "quartz_coil"
  )
    return "arc";
  if (
    beam === "halo_burst" ||
    beam === "halo_crown" ||
    beam === "orbit_ring" ||
    beam === "helion_burst" ||
    beam === "helion_crown" ||
    beam === "magma_ram" ||
    beam === "magma_crown" ||
    beam === "nimbus_burst" ||
    beam === "nimbus_runner"
  )
    return "ember";
  if (
    beam === "tungsten_ram" ||
    beam === "tungsten_throne" ||
    beam === "sonic_ram" ||
    beam === "graphene_ward" ||
    beam === "graphene_runner" ||
    beam === "graphene_sentinel" ||
    beam === "quartz_ward" ||
    beam === "quartz_sentinel"
  )
    return "spark";
  if (
    beam === "riftglass_ring" ||
    beam === "riftglass_drone" ||
    beam === "riftglass_throne" ||
    beam === "axiom_ring" ||
    beam === "axiom_drone" ||
    beam === "axiom_throne"
  )
    return "void";
  return null;
}
