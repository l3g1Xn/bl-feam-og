/** Resolve combat banner labels across Wave H/I/J without bloating fx.ts. */
import { beamLabel as baseBeamLabel, type BeamStyle } from "./fx";
import { waveIBeamLabel } from "./fxWaveI";
import { waveJBeamLabel } from "./fxWaveJ";

export function resolveBeamLabel(beam?: string): string {
  return (
    waveJBeamLabel(beam) ??
    waveIBeamLabel(beam) ??
    baseBeamLabel(beam as BeamStyle)
  );
}
