import {
  meleeFx as baseMeleeFx,
  spellFx as baseSpellFx,
  summonFx as baseSummonFx,
  type BeamStyle,
  type FxEvent,
} from "./fx";
import { isWaveIHeavy, waveIBeamFor } from "./fxWaveI";
import { isWaveJHeavy, waveJBeamFor } from "./fxWaveJ";

function applyWaveLayers<T extends FxEvent>(ev: T, cardId?: string): T {
  const wj = waveJBeamFor(cardId);
  if (wj) ev.beam = wj as BeamStyle;
  const wi = waveIBeamFor(cardId);
  if (wi && !wj) ev.beam = wi as BeamStyle;
  if (isWaveJHeavy(ev.beam) || isWaveIHeavy(ev.beam)) {
    ev.durationMs = Math.max(ev.durationMs, 820);
    ev.trauma = Math.min(1, (ev.trauma ?? 0.28) + 0.1);
    ev.hitStopMs = Math.max(ev.hitStopMs ?? 0, 60);
    ev.particles = Math.max(ev.particles ?? 38, 76);
    ev.residualMs = Math.max(ev.residualMs ?? 300, 600);
    ev.bloom = Math.max(ev.bloom ?? 1, 1.62);
    ev.rings = Math.max(ev.rings ?? 2, 3);
  }
  return ev;
}

export function meleeFx(...args: Parameters<typeof baseMeleeFx>): FxEvent {
  return applyWaveLayers(baseMeleeFx(...args), args[0]?.cardId);
}

export function spellFx(...args: Parameters<typeof baseSpellFx>): FxEvent {
  return applyWaveLayers(baseSpellFx(...args), args[0]?.cardId);
}

export function summonFx(...args: Parameters<typeof baseSummonFx>): FxEvent {
  return applyWaveLayers(baseSummonFx(...args), args[0]?.cardId);
}
