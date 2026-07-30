/**
 * Hardcore realistic battle SFX — multi-layer Web Audio synthesis.
 * Metal impacts, plasma discharges, sub detonations, war cries.
 * Offline, no external sample files.
 */

export type SfxId =
  | "clash"
  | "heavy_clash"
  | "blade"
  | "laser"
  | "beam"
  | "spell"
  | "heal"
  | "summon"
  | "grunt"
  | "enemy_grunt"
  | "glory"
  | "defeat"
  | "ui"
  | "whoosh";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let volume = 0.82;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : volume;
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.12;
      masterGain.connect(compressor);
      compressor.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setSfxVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = muted ? 0 : volume;
}

export function setSfxMuted(m: boolean) {
  muted = m;
  if (masterGain) masterGain.gain.value = muted ? 0 : volume;
}

export function getSfxVolume() {
  return volume;
}

export function isSfxMuted() {
  return muted;
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  void c.resume();
}

function dest(): AudioNode {
  return masterGain!;
}

function noiseBuffer(
  c: AudioContext,
  seconds: number,
  color: "white" | "pink" | "brown" = "white",
): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (color === "white") data[i] = w;
    else if (color === "pink") {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      data[i] = b0 + b1 + b2 + w * 0.1848;
    } else {
      b0 = (b0 + 0.02 * w) / 1.02;
      data[i] = b0 * 3.5;
    }
  }
  // soft normalize
  let peak = 0.0001;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(data[i]!));
  const inv = 0.95 / peak;
  for (let i = 0; i < len; i++) data[i]! *= inv;
  return buf;
}

function env(
  g: GainNode,
  t0: number,
  peak: number,
  attack: number,
  decay: number,
) {
  g.gain.cancelScheduledValues(t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + Math.max(0.001, attack));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone(
  c: AudioContext,
  out: AudioNode,
  freq: number,
  t0: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  slideTo?: number,
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) {
    o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  }
  env(g, t0, peak, 0.004, dur);
  o.connect(g);
  g.connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.06);
}

function noiseBurst(
  c: AudioContext,
  out: AudioNode,
  t0: number,
  dur: number,
  peak: number,
  opts: {
    hipass?: number;
    lowpass?: number;
    color?: "white" | "pink" | "brown";
  } = {},
) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, Math.min(0.55, dur + 0.08), opts.color ?? "white");
  let node: AudioNode = src;
  if (opts.hipass) {
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = opts.hipass;
    src.connect(f);
    node = f;
  }
  if (opts.lowpass) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = opts.lowpass;
    node.connect(f);
    node = f;
  }
  const g = c.createGain();
  env(g, t0, peak, 0.0015, dur);
  node.connect(g);
  g.connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.08);
}

/** Sub-bass thump — body of heavy hits */
function subThump(c: AudioContext, out: AudioNode, t0: number, peak: number, f0 = 55) {
  tone(c, out, f0, t0, 0.22, "sine", peak * 0.9, f0 * 0.45);
  tone(c, out, f0 * 1.5, t0, 0.12, "triangle", peak * 0.35, f0 * 0.6);
  noiseBurst(c, out, t0, 0.08, peak * 0.25, { color: "brown", lowpass: 180 });
}

/** Layered steel-on-steel impact */
function metalImpact(c: AudioContext, out: AudioNode, t0: number, k: number, heavy: boolean) {
  const p = heavy ? 0.55 * k : 0.38 * k;
  subThump(c, out, t0, p * 0.7, heavy ? 48 : 62);
  // transient click
  noiseBurst(c, out, t0, 0.035, p * 0.85, { color: "white", hipass: 1200 });
  // mid crunch
  noiseBurst(c, out, t0 + 0.008, heavy ? 0.16 : 0.1, p * 0.55, {
    color: "pink",
    hipass: 200,
    lowpass: 4200,
  });
  // ringing harmonics
  const rings = heavy
    ? [880, 1320, 1760, 2640, 3520]
    : [990, 1480, 2100, 2970];
  rings.forEach((f, i) => {
    tone(c, out, f + Math.random() * 40, t0 + i * 0.004, heavy ? 0.28 : 0.16, "sine", p * (0.12 - i * 0.015));
    tone(c, out, f * 1.01, t0 + i * 0.004, heavy ? 0.22 : 0.12, "triangle", p * 0.05);
  });
  // shell/debris scatter
  noiseBurst(c, out, t0 + 0.04, 0.12, p * 0.18, { color: "white", hipass: 3500 });
}

/** Blade scrape + cut */
function bladeStrike(c: AudioContext, out: AudioNode, t0: number, k: number) {
  noiseBurst(c, out, t0, 0.09, 0.4 * k, { color: "pink", hipass: 1800, lowpass: 9000 });
  tone(c, out, 2200, t0, 0.12, "sawtooth", 0.1 * k, 600);
  tone(c, out, 3400, t0 + 0.01, 0.08, "square", 0.06 * k, 900);
  metalImpact(c, out, t0 + 0.02, k * 0.85, false);
  // trailing ring
  tone(c, out, 1480, t0 + 0.05, 0.2, "sine", 0.08 * k);
}

/** Plasma / laser discharge */
function laserBlast(c: AudioContext, out: AudioNode, t0: number, k: number) {
  // charge zip
  tone(c, out, 3200, t0, 0.06, "sawtooth", 0.12 * k, 1800);
  // main beam downsweep
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(2400, t0 + 0.02);
  o.frequency.exponentialRampToValueAtTime(180, t0 + 0.28);
  f.type = "lowpass";
  f.frequency.setValueAtTime(8000, t0);
  f.frequency.exponentialRampToValueAtTime(400, t0 + 0.28);
  env(g, t0 + 0.02, 0.42 * k, 0.003, 0.26);
  o.connect(f);
  f.connect(g);
  g.connect(out);
  o.start(t0 + 0.02);
  o.stop(t0 + 0.32);
  // ionization crackle
  noiseBurst(c, out, t0 + 0.02, 0.18, 0.28 * k, { color: "white", hipass: 2500 });
  subThump(c, out, t0 + 0.04, 0.22 * k, 70);
}

/** Continuous heavy beam / rail */
function beamStrike(c: AudioContext, out: AudioNode, t0: number, k: number) {
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o2.type = "sawtooth";
  o.frequency.setValueAtTime(70, t0);
  o2.frequency.setValueAtTime(140, t0);
  o.frequency.linearRampToValueAtTime(48, t0 + 0.42);
  o2.frequency.linearRampToValueAtTime(90, t0 + 0.42);
  env(g, t0, 0.32 * k, 0.015, 0.4);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  o.connect(f);
  o2.connect(f);
  f.connect(g);
  g.connect(out);
  o.start(t0);
  o2.start(t0);
  o.stop(t0 + 0.48);
  o2.stop(t0 + 0.48);
  noiseBurst(c, out, t0, 0.35, 0.22 * k, { color: "brown", lowpass: 600 });
  noiseBurst(c, out, t0 + 0.05, 0.2, 0.15 * k, { color: "pink", hipass: 800 });
  // end snap
  metalImpact(c, out, t0 + 0.35, k * 0.5, false);
}

/** Arcane / tech spell detonation */
function spellDetonation(c: AudioContext, out: AudioNode, t0: number, k: number) {
  tone(c, out, 520, t0, 0.15, "sine", 0.14 * k, 260);
  tone(c, out, 780, t0 + 0.02, 0.18, "triangle", 0.12 * k, 400);
  tone(c, out, 1170, t0 + 0.04, 0.22, "sine", 0.1 * k);
  noiseBurst(c, out, t0 + 0.03, 0.2, 0.3 * k, { color: "pink", hipass: 600 });
  subThump(c, out, t0 + 0.05, 0.28 * k, 60);
  // sparkles
  for (let i = 0; i < 5; i++) {
    tone(
      c,
      out,
      1400 + Math.random() * 2200,
      t0 + 0.06 + i * 0.03,
      0.08,
      "sine",
      0.05 * k,
    );
  }
}

function healPulse(c: AudioContext, out: AudioNode, t0: number, k: number) {
  [440, 554, 659, 880].forEach((f, i) => {
    tone(c, out, f, t0 + i * 0.05, 0.28, "sine", 0.1 * k);
    tone(c, out, f * 2, t0 + i * 0.05, 0.18, "triangle", 0.04 * k);
  });
  noiseBurst(c, out, t0, 0.12, 0.06 * k, { color: "pink", hipass: 2000 });
}

function summonImpact(c: AudioContext, out: AudioNode, t0: number, k: number) {
  subThump(c, out, t0, 0.35 * k, 50);
  tone(c, out, 200, t0, 0.2, "triangle", 0.16 * k, 120);
  tone(c, out, 320, t0 + 0.03, 0.18, "sine", 0.1 * k);
  noiseBurst(c, out, t0, 0.14, 0.2 * k, { color: "brown", lowpass: 900 });
  noiseBurst(c, out, t0 + 0.05, 0.1, 0.12 * k, { color: "white", hipass: 1500 });
}

/** Hardcore war-cry grunt */
function warGrunt(c: AudioContext, out: AudioNode, t0: number, ally: boolean) {
  const base = ally ? 105 : 155;
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const o3 = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  o.type = "sawtooth";
  o2.type = "square";
  o3.type = "triangle";
  o.frequency.setValueAtTime(base, t0);
  o.frequency.exponentialRampToValueAtTime(base * 0.65, t0 + 0.22);
  o2.frequency.setValueAtTime(base * 1.5, t0);
  o2.frequency.exponentialRampToValueAtTime(base * 0.9, t0 + 0.2);
  o3.frequency.setValueAtTime(base * 2.2, t0);
  o3.frequency.exponentialRampToValueAtTime(base * 1.1, t0 + 0.18);
  f.type = "bandpass";
  f.frequency.setValueAtTime(base * 4, t0);
  f.frequency.linearRampToValueAtTime(base * 2.2, t0 + 0.2);
  f.Q.value = 5;
  env(g, t0, ally ? 0.34 : 0.3, 0.008, 0.24);
  o.connect(f);
  o2.connect(f);
  o3.connect(f);
  f.connect(g);
  g.connect(out);
  o.start(t0);
  o2.start(t0);
  o3.start(t0);
  o.stop(t0 + 0.32);
  o2.stop(t0 + 0.32);
  o3.stop(t0 + 0.32);
  noiseBurst(c, out, t0, 0.08, 0.14, { color: "pink", hipass: 300 });
  // chest thump
  subThump(c, out, t0 + 0.02, 0.12, 70);
}

function gloryCry(c: AudioContext, out: AudioNode, t0: number) {
  const notes = [392, 494, 587, 740, 880];
  notes.forEach((f, i) => {
    tone(c, out, f, t0 + i * 0.07, 0.4, "triangle", 0.16 - i * 0.02);
    tone(c, out, f * 2, t0 + i * 0.07, 0.3, "sine", 0.07);
  });
  metalImpact(c, out, t0 + 0.12, 0.7, true);
  noiseBurst(c, out, t0, 0.2, 0.12, { color: "pink", hipass: 900 });
}

function defeatMoan(c: AudioContext, out: AudioNode, t0: number) {
  tone(c, out, 220, t0, 0.55, "sine", 0.24, 70);
  tone(c, out, 165, t0 + 0.05, 0.5, "triangle", 0.12, 55);
  noiseBurst(c, out, t0, 0.35, 0.15, { color: "brown", lowpass: 400 });
  subThump(c, out, t0 + 0.1, 0.2, 40);
}

function whooshPass(c: AudioContext, out: AudioNode, t0: number, k: number) {
  noiseBurst(c, out, t0, 0.16, 0.28 * k, { color: "pink", hipass: 400, lowpass: 5000 });
  tone(c, out, 900, t0, 0.14, "sawtooth", 0.08 * k, 200);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(600, t0);
  o.frequency.exponentialRampToValueAtTime(120, t0 + 0.15);
  env(g, t0, 0.1 * k, 0.01, 0.14);
  o.connect(g);
  g.connect(out);
  o.start(t0);
  o.stop(t0 + 0.2);
}

function uiClick(c: AudioContext, out: AudioNode, t0: number) {
  tone(c, out, 880, t0, 0.05, "sine", 0.1);
  tone(c, out, 1320, t0 + 0.01, 0.04, "triangle", 0.06);
  noiseBurst(c, out, t0, 0.03, 0.05, { color: "white", hipass: 2000 });
}

export function playSfx(id: SfxId, intensity = 1) {
  if (muted || volume <= 0.01) return;
  const c = ac();
  if (!c || !masterGain) return;
  const t0 = c.currentTime + 0.001;
  const k = Math.max(0.25, Math.min(1.6, intensity));
  const out = dest();

  switch (id) {
    case "clash":
      metalImpact(c, out, t0, k, false);
      break;
    case "heavy_clash":
      metalImpact(c, out, t0, k, true);
      subThump(c, out, t0 + 0.01, 0.35 * k, 42);
      break;
    case "blade":
      bladeStrike(c, out, t0, k);
      break;
    case "laser":
      laserBlast(c, out, t0, k);
      break;
    case "beam":
      beamStrike(c, out, t0, k);
      break;
    case "spell":
      spellDetonation(c, out, t0, k);
      break;
    case "heal":
      healPulse(c, out, t0, k);
      break;
    case "summon":
      summonImpact(c, out, t0, k);
      break;
    case "grunt":
      warGrunt(c, out, t0, true);
      break;
    case "enemy_grunt":
      warGrunt(c, out, t0, false);
      break;
    case "glory":
      gloryCry(c, out, t0);
      break;
    case "defeat":
      defeatMoan(c, out, t0);
      break;
    case "whoosh":
      whooshPass(c, out, t0, k);
      break;
    case "ui":
      uiClick(c, out, t0);
      break;
  }
}

export function playCombatSfx(opts: {
  kind: "melee" | "spell" | "heal" | "summon";
  damage?: number;
  heal?: number;
  toHero?: boolean;
  fromPlayer?: boolean;
  school?: string;
  beam?: string;
}) {
  const dmg = opts.damage ?? 0;
  const school = (opts.school || "").toLowerCase();
  const beam = (opts.beam || "").toLowerCase();
  const heavy = dmg >= 6;

  if (opts.kind === "melee") {
    if (beam === "laser" || school === "arcane" || school === "ember") {
      playSfx("laser", 0.85 + Math.min(0.55, dmg * 0.06));
      playSfx(heavy ? "heavy_clash" : "clash", 0.5 + Math.min(0.4, dmg * 0.04));
    } else if (beam === "beam" || school === "frost" || school === "shadow") {
      playSfx("beam", 0.85 + Math.min(0.5, dmg * 0.05));
      playSfx("whoosh", 0.55);
    } else if (school === "steel" || school === "nature" || beam === "slash") {
      playSfx("blade", 0.95 + Math.min(0.45, dmg * 0.05));
      playSfx(heavy ? "heavy_clash" : "clash", 0.65 + Math.min(0.4, dmg * 0.05));
    } else {
      playSfx(heavy ? "heavy_clash" : "clash", 0.8 + Math.min(1, dmg * 0.08));
      if (dmg >= 4) playSfx("blade", 0.55);
    }
    if (dmg >= 3) {
      playSfx(opts.fromPlayer ? "grunt" : "enemy_grunt", 0.95);
    }
    if (dmg >= 8) playSfx("heavy_clash", 0.7);
  } else if (opts.kind === "spell") {
    playSfx("whoosh", 0.8);
    if (beam === "laser" || school === "arcane") {
      playSfx("laser", 0.95 + Math.min(0.4, dmg * 0.05));
    } else if (beam === "beam" || school === "shadow") {
      playSfx("beam", 0.95);
    } else {
      playSfx("spell", 0.85 + Math.min(0.8, dmg * 0.06));
    }
    if (opts.toHero && dmg >= 4) {
      playSfx(opts.fromPlayer === false ? "grunt" : "enemy_grunt", 1);
    }
  } else if (opts.kind === "heal") {
    playSfx("heal", 0.95);
  } else if (opts.kind === "summon") {
    playSfx("summon", 0.95);
  }
}
