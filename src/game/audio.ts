/**
 * Warhammer-scale battle SFX — multi-stage kinetic / energy / war-cry synthesis.
 * Offline Web Audio only. Peak-limited bus with heavy layering.
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
let bus: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
let volume = 1.0;
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
      bus = ctx.createGain();
      bus.gain.value = 1.35; // headroom into compressor
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -22;
      compressor.knee.value = 12;
      compressor.ratio.value = 10;
      compressor.attack.value = 0.001;
      compressor.release.value = 0.18;
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.05;
      masterGain.connect(bus);
      bus.connect(compressor);
      compressor.connect(limiter);
      limiter.connect(ctx.destination);
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

function out(): AudioNode {
  return masterGain!;
}

function noiseBuffer(
  c: AudioContext,
  seconds: number,
  color: "white" | "pink" | "brown" = "white",
): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
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
  let peak = 0.0001;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(data[i]!));
  const inv = 1 / peak;
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
  g.gain.setValueAtTime(0.00008, t0);
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, peak),
    t0 + Math.max(0.0008, attack),
  );
  g.gain.exponentialRampToValueAtTime(0.00008, t0 + attack + decay);
}

function tone(
  c: AudioContext,
  dest: AudioNode,
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
  o.frequency.setValueAtTime(Math.max(20, freq), t0);
  if (slideTo != null) {
    o.frequency.exponentialRampToValueAtTime(
      Math.max(20, slideTo),
      t0 + Math.max(0.01, dur),
    );
  }
  env(g, t0, peak, 0.002, dur);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.08);
}

function noiseShot(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  dur: number,
  peak: number,
  opts: {
    color?: "white" | "pink" | "brown";
    hipass?: number;
    lowpass?: number;
    q?: number;
  } = {},
) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, Math.min(0.9, dur + 0.1), opts.color ?? "white");
  let node: AudioNode = src;
  if (opts.hipass) {
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = opts.hipass;
    f.Q.value = opts.q ?? 0.7;
    src.connect(f);
    node = f;
  }
  if (opts.lowpass) {
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = opts.lowpass;
    f.Q.value = opts.q ?? 0.7;
    node.connect(f);
    node = f;
  }
  const g = c.createGain();
  env(g, t0, peak, 0.001, dur);
  node.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + dur + 0.1);
}

/** Distorted drive via waveshaper */
function driveNode(c: AudioContext, amount = 8): WaveShaperNode {
  const ws = c.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  ws.curve = curve;
  ws.oversample = "2x";
  return ws;
}

/** Seismic / bolter body */
function seismicThump(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  peak: number,
  f0 = 42,
) {
  tone(c, dest, f0, t0, 0.32, "sine", peak, f0 * 0.35);
  tone(c, dest, f0 * 1.4, t0, 0.18, "triangle", peak * 0.55, f0 * 0.5);
  tone(c, dest, f0 * 0.7, t0 + 0.01, 0.4, "sine", peak * 0.4, f0 * 0.25);
  noiseShot(c, dest, t0, 0.12, peak * 0.45, {
    color: "brown",
    lowpass: 220,
  });
}

/** Multi-stage explosion (40K scale) */
function detonation(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  k: number,
  huge: boolean,
) {
  const p = huge ? 1.1 * k : 0.75 * k;
  // flash
  noiseShot(c, dest, t0, 0.04, p * 1.1, { color: "white", hipass: 1500 });
  // blast wave
  seismicThump(c, dest, t0 + 0.005, p * 0.95, huge ? 32 : 48);
  noiseShot(c, dest, t0 + 0.01, huge ? 0.45 : 0.28, p * 0.85, {
    color: "pink",
    hipass: 80,
    lowpass: 2800,
  });
  // debris
  noiseShot(c, dest, t0 + 0.05, 0.35, p * 0.4, {
    color: "white",
    hipass: 2200,
    lowpass: 9000,
  });
  // metal rain
  for (let i = 0; i < (huge ? 8 : 5); i++) {
    tone(
      c,
      dest,
      700 + Math.random() * 2800,
      t0 + 0.04 + i * 0.025,
      0.08 + Math.random() * 0.1,
      "sine",
      p * 0.08,
    );
  }
  // delayed boom tail
  seismicThump(c, dest, t0 + 0.08, p * 0.55, huge ? 28 : 40);
  noiseShot(c, dest, t0 + 0.12, 0.5, p * 0.35, {
    color: "brown",
    lowpass: 500,
  });
}

/** Chainsword / power-weapon metal impact */
function powerMetal(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  k: number,
  heavy: boolean,
) {
  const p = heavy ? 1.0 * k : 0.72 * k;
  // initial crack
  noiseShot(c, dest, t0, 0.028, p * 1.15, { color: "white", hipass: 1800 });
  // grinding blade body
  const drive = driveNode(c, heavy ? 14 : 9);
  const gDrive = c.createGain();
  env(gDrive, t0, p * 0.55, 0.002, heavy ? 0.22 : 0.14);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.35, "pink");
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1800, t0);
  bp.frequency.exponentialRampToValueAtTime(600, t0 + 0.2);
  bp.Q.value = 2.5;
  src.connect(bp);
  bp.connect(drive);
  drive.connect(gDrive);
  gDrive.connect(dest);
  src.start(t0);
  src.stop(t0 + 0.35);

  // harmonic ring shower
  const rings = heavy
    ? [520, 780, 1040, 1560, 2340, 3120, 4160]
    : [660, 990, 1480, 2220, 3330];
  rings.forEach((f, i) => {
    tone(
      c,
      dest,
      f + Math.random() * 60,
      t0 + i * 0.003,
      heavy ? 0.35 : 0.18,
      i % 2 ? "triangle" : "sine",
      p * (0.14 - i * 0.012),
    );
  });
  seismicThump(c, dest, t0 + 0.008, p * 0.7, heavy ? 36 : 55);
  // secondary bounce
  noiseShot(c, dest, t0 + 0.06, 0.1, p * 0.35, {
    color: "white",
    hipass: 2500,
  });
  if (heavy) detonation(c, dest, t0 + 0.04, k * 0.45, false);
}

function chainBlade(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  // rev
  tone(c, dest, 90, t0, 0.08, "sawtooth", 0.25 * k, 140);
  noiseShot(c, dest, t0, 0.1, 0.35 * k, {
    color: "pink",
    hipass: 900,
    lowpass: 7000,
  });
  powerMetal(c, dest, t0 + 0.03, k * 1.05, false);
  // teeth chatter
  for (let i = 0; i < 6; i++) {
    noiseShot(c, dest, t0 + 0.02 + i * 0.012, 0.02, 0.2 * k, {
      color: "white",
      hipass: 3000,
    });
  }
}

/** Plasma / melta discharge */
function plasmaBlast(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  // charge whine
  tone(c, dest, 1800, t0, 0.08, "sawtooth", 0.22 * k, 3200);
  tone(c, dest, 2400, t0 + 0.02, 0.06, "square", 0.12 * k, 4000);
  // main plasma bolt
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  const drive = driveNode(c, 12);
  o.type = "sawtooth";
  o.frequency.setValueAtTime(2800, t0 + 0.05);
  o.frequency.exponentialRampToValueAtTime(90, t0 + 0.38);
  f.type = "lowpass";
  f.frequency.setValueAtTime(10000, t0 + 0.05);
  f.frequency.exponentialRampToValueAtTime(350, t0 + 0.38);
  env(g, t0 + 0.05, 0.7 * k, 0.002, 0.32);
  o.connect(f);
  f.connect(drive);
  drive.connect(g);
  g.connect(dest);
  o.start(t0 + 0.05);
  o.stop(t0 + 0.42);
  // ionization
  noiseShot(c, dest, t0 + 0.05, 0.28, 0.55 * k, {
    color: "white",
    hipass: 2000,
  });
  seismicThump(c, dest, t0 + 0.08, 0.55 * k, 55);
  // aftershock
  detonation(c, dest, t0 + 0.12, k * 0.55, false);
}

/** Heavy energy beam / lascannon */
function heavyBeam(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  // spool
  tone(c, dest, 60, t0, 0.12, "sawtooth", 0.3 * k, 90);
  noiseShot(c, dest, t0, 0.15, 0.25 * k, { color: "pink", lowpass: 800 });
  // sustained roar
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const o3 = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  const drive = driveNode(c, 16);
  o.type = "square";
  o2.type = "sawtooth";
  o3.type = "sawtooth";
  o.frequency.setValueAtTime(55, t0 + 0.08);
  o2.frequency.setValueAtTime(110, t0 + 0.08);
  o3.frequency.setValueAtTime(165, t0 + 0.08);
  o.frequency.linearRampToValueAtTime(40, t0 + 0.55);
  o2.frequency.linearRampToValueAtTime(70, t0 + 0.55);
  f.type = "lowpass";
  f.frequency.setValueAtTime(1400, t0 + 0.08);
  f.frequency.linearRampToValueAtTime(500, t0 + 0.55);
  env(g, t0 + 0.08, 0.65 * k, 0.02, 0.5);
  o.connect(f);
  o2.connect(f);
  o3.connect(f);
  f.connect(drive);
  drive.connect(g);
  g.connect(dest);
  o.start(t0 + 0.08);
  o2.start(t0 + 0.08);
  o3.start(t0 + 0.08);
  o.stop(t0 + 0.65);
  o2.stop(t0 + 0.65);
  o3.stop(t0 + 0.65);
  noiseShot(c, dest, t0 + 0.08, 0.5, 0.4 * k, {
    color: "brown",
    lowpass: 700,
  });
  noiseShot(c, dest, t0 + 0.1, 0.35, 0.3 * k, {
    color: "pink",
    hipass: 600,
    lowpass: 4000,
  });
  // terminal crack
  powerMetal(c, dest, t0 + 0.48, k * 0.7, true);
  detonation(c, dest, t0 + 0.5, k * 0.6, true);
}

function spellCataclysm(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 400, t0, 0.12, "sine", 0.25 * k, 180);
  tone(c, dest, 600, t0 + 0.03, 0.15, "triangle", 0.22 * k, 280);
  tone(c, dest, 900, t0 + 0.05, 0.2, "sine", 0.18 * k, 450);
  // rising chaos
  for (let i = 0; i < 7; i++) {
    tone(
      c,
      dest,
      500 + i * 180 + Math.random() * 100,
      t0 + 0.04 + i * 0.025,
      0.12,
      "sawtooth",
      0.1 * k,
      200 + i * 40,
    );
  }
  detonation(c, dest, t0 + 0.12, k * 0.95, true);
  noiseShot(c, dest, t0 + 0.1, 0.4, 0.5 * k, {
    color: "pink",
    hipass: 400,
  });
}

function healPulse(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  [392, 494, 587, 740, 880].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.04, 0.35, "sine", 0.16 * k);
    tone(c, dest, f * 2, t0 + i * 0.04, 0.22, "triangle", 0.06 * k);
  });
  noiseShot(c, dest, t0, 0.15, 0.1 * k, { color: "pink", hipass: 2500 });
}

function summonRift(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  seismicThump(c, dest, t0, 0.7 * k, 38);
  tone(c, dest, 80, t0, 0.3, "sawtooth", 0.35 * k, 40);
  noiseShot(c, dest, t0, 0.25, 0.4 * k, { color: "brown", lowpass: 800 });
  for (let i = 0; i < 6; i++) {
    tone(
      c,
      dest,
      200 + i * 90,
      t0 + 0.05 + i * 0.04,
      0.15,
      "triangle",
      0.12 * k,
    );
  }
  detonation(c, dest, t0 + 0.1, k * 0.5, false);
}

/** Battlefield war-cry — guttural, layered */
function warCry(c: AudioContext, dest: AudioNode, t0: number, ally: boolean) {
  const base = ally ? 95 : 140;
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const o3 = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  const drive = driveNode(c, 11);
  o.type = "sawtooth";
  o2.type = "square";
  o3.type = "sawtooth";
  o.frequency.setValueAtTime(base, t0);
  o.frequency.exponentialRampToValueAtTime(base * 0.55, t0 + 0.28);
  o2.frequency.setValueAtTime(base * 1.6, t0);
  o2.frequency.exponentialRampToValueAtTime(base * 0.8, t0 + 0.25);
  o3.frequency.setValueAtTime(base * 2.4, t0);
  o3.frequency.exponentialRampToValueAtTime(base * 1.1, t0 + 0.22);
  f.type = "bandpass";
  f.frequency.setValueAtTime(base * 5, t0);
  f.frequency.linearRampToValueAtTime(base * 2, t0 + 0.25);
  f.Q.value = 3.5;
  env(g, t0, ally ? 0.55 : 0.5, 0.006, 0.3);
  o.connect(f);
  o2.connect(f);
  o3.connect(f);
  f.connect(drive);
  drive.connect(g);
  g.connect(dest);
  o.start(t0);
  o2.start(t0);
  o3.start(t0);
  o.stop(t0 + 0.4);
  o2.stop(t0 + 0.4);
  o3.stop(t0 + 0.4);
  noiseShot(c, dest, t0, 0.12, 0.28, { color: "pink", hipass: 250 });
  seismicThump(c, dest, t0 + 0.02, 0.25, 65);
}

function gloryFanfare(c: AudioContext, dest: AudioNode, t0: number) {
  const notes = [392, 494, 587, 740, 880, 1175];
  notes.forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.06, 0.45, "triangle", 0.22 - i * 0.02);
    tone(c, dest, f * 2, t0 + i * 0.06, 0.3, "sine", 0.1);
  });
  detonation(c, dest, t0 + 0.15, 0.7, false);
  warCry(c, dest, t0 + 0.05, true);
}

function defeatCollapse(c: AudioContext, dest: AudioNode, t0: number) {
  tone(c, dest, 180, t0, 0.7, "sine", 0.4, 45);
  tone(c, dest, 120, t0 + 0.05, 0.65, "triangle", 0.25, 35);
  noiseShot(c, dest, t0, 0.55, 0.35, { color: "brown", lowpass: 500 });
  seismicThump(c, dest, t0 + 0.1, 0.45, 30);
  detonation(c, dest, t0 + 0.2, 0.55, true);
}

function whooshPass(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.18, 0.45 * k, {
    color: "pink",
    hipass: 300,
    lowpass: 6000,
  });
  tone(c, dest, 1100, t0, 0.16, "sawtooth", 0.18 * k, 140);
  tone(c, dest, 700, t0 + 0.02, 0.14, "sine", 0.12 * k, 100);
}

function uiClick(c: AudioContext, dest: AudioNode, t0: number) {
  tone(c, dest, 980, t0, 0.045, "sine", 0.14);
  tone(c, dest, 1480, t0 + 0.01, 0.035, "triangle", 0.08);
  noiseShot(c, dest, t0, 0.025, 0.08, { color: "white", hipass: 2500 });
}

export function playSfx(id: SfxId, intensity = 1) {
  if (muted || volume <= 0.01) return;
  const c = ac();
  if (!c || !masterGain) return;
  const t0 = c.currentTime + 0.001;
  // Push intensity hard — 40K scale
  const k = Math.max(0.4, Math.min(2.0, intensity * 1.25));
  const dest = out();

  switch (id) {
    case "clash":
      powerMetal(c, dest, t0, k, false);
      break;
    case "heavy_clash":
      powerMetal(c, dest, t0, k * 1.15, true);
      detonation(c, dest, t0 + 0.02, k * 0.7, true);
      break;
    case "blade":
      chainBlade(c, dest, t0, k);
      break;
    case "laser":
      plasmaBlast(c, dest, t0, k);
      break;
    case "beam":
      heavyBeam(c, dest, t0, k);
      break;
    case "spell":
      spellCataclysm(c, dest, t0, k);
      break;
    case "heal":
      healPulse(c, dest, t0, k);
      break;
    case "summon":
      summonRift(c, dest, t0, k);
      break;
    case "grunt":
      warCry(c, dest, t0, true);
      break;
    case "enemy_grunt":
      warCry(c, dest, t0, false);
      break;
    case "glory":
      gloryFanfare(c, dest, t0);
      break;
    case "defeat":
      defeatCollapse(c, dest, t0);
      break;
    case "whoosh":
      whooshPass(c, dest, t0, k);
      break;
    case "ui":
      uiClick(c, dest, t0);
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
  // Scale presence by damage so big hits feel apocalyptic
  const power = 0.85 + Math.min(1.2, dmg * 0.12);

  if (opts.kind === "melee") {
    if (beam === "laser" || school === "arcane" || school === "ember") {
      playSfx("laser", power);
      playSfx(dmg >= 6 ? "heavy_clash" : "clash", power * 0.55);
    } else if (beam === "beam" || school === "frost" || school === "shadow") {
      playSfx("beam", power);
      playSfx("whoosh", power * 0.5);
    } else if (school === "steel" || school === "nature" || beam === "slash") {
      playSfx("blade", power * 1.1);
      playSfx(dmg >= 5 ? "heavy_clash" : "clash", power * 0.75);
    } else {
      playSfx(dmg >= 5 ? "heavy_clash" : "clash", power);
      if (dmg >= 4) playSfx("blade", power * 0.65);
    }
    if (dmg >= 2) {
      playSfx(opts.fromPlayer ? "grunt" : "enemy_grunt", 0.9 + Math.min(0.6, dmg * 0.05));
    }
    if (dmg >= 8) playSfx("heavy_clash", power * 0.9);
  } else if (opts.kind === "spell") {
    playSfx("whoosh", power * 0.7);
    if (beam === "laser" || school === "arcane") {
      playSfx("laser", power * 1.1);
    } else if (beam === "beam" || school === "shadow") {
      playSfx("beam", power * 1.1);
    } else {
      playSfx("spell", power * 1.05);
    }
    if (opts.toHero && dmg >= 3) {
      playSfx(opts.fromPlayer === false ? "grunt" : "enemy_grunt", 1.1);
    }
  } else if (opts.kind === "heal") {
    playSfx("heal", 1.0);
  } else if (opts.kind === "summon") {
    playSfx("summon", 1.1);
  }
}
