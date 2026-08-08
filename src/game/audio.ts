/**
 * Battle Legions battle SFX — multi-stage kinetic / energy / war-cry synthesis.
 * Offline Web Audio only. Peak-limited bus with school-colored layers + reverb.
 * Zero binary audio assets → free APK headroom under the size cap.
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
  | "whoosh"
  | "frost"
  | "void"
  | "nature"
  | "plasma"
  | "impact_tail"
  | "rail"
  | "aoe_burst"
  | "shield_break"
  | "shield_up"
  | "charge_rush"
  | "lifesteal"
  | "reborn"
  | "ion"
  | "photon"
  | "execute";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bus: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
let reverbSend: GainNode | null = null;
let reverbNode: ConvolverNode | null = null;
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
      bus.gain.value = 1.28;
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 14;
      compressor.ratio.value = 9;
      compressor.attack.value = 0.001;
      compressor.release.value = 0.16;
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -2.5;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.05;

      reverbNode = ctx.createConvolver();
      reverbNode.buffer = makeImpulse(ctx, 0.55, 2.2);
      reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.22;
      reverbSend.connect(reverbNode);
      reverbNode.connect(compressor);

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

function makeImpulse(
  c: AudioContext,
  seconds: number,
  decay: number,
): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] =
        (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (ch ? 0.9 : 1);
    }
  }
  return buf;
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

function wet(): AudioNode {
  return reverbSend ?? masterGain!;
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

function detonation(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  k: number,
  huge: boolean,
) {
  const p = huge ? 1.1 * k : 0.75 * k;
  noiseShot(c, dest, t0, 0.04, p * 1.1, { color: "white", hipass: 1500 });
  seismicThump(c, dest, t0 + 0.005, p * 0.95, huge ? 32 : 48);
  noiseShot(c, dest, t0 + 0.01, huge ? 0.45 : 0.28, p * 0.85, {
    color: "pink",
    hipass: 80,
    lowpass: 2800,
  });
  noiseShot(c, dest, t0 + 0.05, 0.35, p * 0.4, {
    color: "white",
    hipass: 2200,
    lowpass: 9000,
  });
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
  seismicThump(c, dest, t0 + 0.08, p * 0.55, huge ? 28 : 40);
  noiseShot(c, dest, t0 + 0.12, 0.5, p * 0.35, {
    color: "brown",
    lowpass: 500,
  });
}

function powerMetal(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  k: number,
  heavy: boolean,
) {
  const p = heavy ? 1.0 * k : 0.72 * k;
  noiseShot(c, dest, t0, 0.028, p * 1.15, { color: "white", hipass: 1800 });
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
  noiseShot(c, dest, t0 + 0.06, 0.1, p * 0.35, {
    color: "white",
    hipass: 2500,
  });
  if (heavy) detonation(c, dest, t0 + 0.04, k * 0.45, false);
}

function chainBlade(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 90, t0, 0.08, "sawtooth", 0.25 * k, 140);
  noiseShot(c, dest, t0, 0.1, 0.35 * k, {
    color: "pink",
    hipass: 900,
    lowpass: 7000,
  });
  powerMetal(c, dest, t0 + 0.03, k * 1.05, false);
  for (let i = 0; i < 6; i++) {
    noiseShot(c, dest, t0 + 0.02 + i * 0.012, 0.02, 0.2 * k, {
      color: "white",
      hipass: 3000,
    });
  }
}

function plasmaBlast(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 1800, t0, 0.08, "sawtooth", 0.22 * k, 3200);
  tone(c, dest, 2400, t0 + 0.02, 0.06, "square", 0.12 * k, 4000);
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
  noiseShot(c, dest, t0 + 0.05, 0.28, 0.55 * k, {
    color: "white",
    hipass: 2000,
  });
  seismicThump(c, dest, t0 + 0.08, 0.55 * k, 55);
  detonation(c, dest, t0 + 0.12, k * 0.55, false);
}

function heavyBeam(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 60, t0, 0.12, "sawtooth", 0.3 * k, 90);
  noiseShot(c, dest, t0, 0.15, 0.25 * k, { color: "pink", lowpass: 800 });
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
  powerMetal(c, dest, t0 + 0.48, k * 0.7, true);
  detonation(c, dest, t0 + 0.5, k * 0.6, true);
}

/** Magnetic railgun crack — high-voltage whip + sub impact. */
function railShot(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.018, 0.95 * k, { color: "white", hipass: 4000 });
  tone(c, dest, 3200, t0, 0.05, "sawtooth", 0.35 * k, 180);
  tone(c, dest, 90, t0 + 0.01, 0.22, "sine", 0.55 * k, 40);
  noiseShot(c, dest, t0 + 0.02, 0.2, 0.45 * k, {
    color: "pink",
    hipass: 1200,
    lowpass: 8000,
  });
  seismicThump(c, dest, t0 + 0.03, 0.5 * k, 48);
  for (let i = 0; i < 4; i++) {
    tone(
      c,
      dest,
      1800 + i * 400,
      t0 + 0.01 + i * 0.012,
      0.06,
      "square",
      0.08 * k,
      400,
    );
  }
}

function aoeBurst(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  detonation(c, dest, t0, k * 0.85, true);
  detonation(c, dest, t0 + 0.06, k * 0.55, false);
  noiseShot(c, dest, t0, 0.35, 0.5 * k, { color: "pink", hipass: 200 });
  for (let i = 0; i < 5; i++) {
    seismicThump(c, dest, t0 + i * 0.04, 0.22 * k, 35 + i * 8);
  }
  tone(c, dest, 55, t0, 0.5, "sine", 0.35 * k, 28);
}

function shieldBreak(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.06, 0.7 * k, { color: "white", hipass: 2500 });
  tone(c, dest, 1400, t0, 0.12, "triangle", 0.35 * k, 400);
  tone(c, dest, 2200, t0 + 0.02, 0.1, "sine", 0.22 * k, 600);
  for (let i = 0; i < 6; i++) {
    noiseShot(c, dest, t0 + 0.02 + i * 0.015, 0.03, 0.18 * k, {
      color: "white",
      hipass: 3000 + i * 200,
    });
  }
  seismicThump(c, dest, t0 + 0.04, 0.25 * k, 70);
}

/** Aegis / Divine Shield raise — crystalline shell forming. */
function shieldUp(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  [660, 880, 1100, 1480].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.03, 0.28, "sine", 0.16 * k);
    tone(c, dest, f * 1.5, t0 + i * 0.03, 0.16, "triangle", 0.07 * k);
  });
  noiseShot(c, dest, t0, 0.12, 0.18 * k, {
    color: "white",
    hipass: 2800,
    lowpass: 10000,
  });
  tone(c, dest, 180, t0, 0.2, "triangle", 0.14 * k, 120);
}

/** Lethal execute sting — short dark chord + crack. */
function executeSting(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.03, 0.9 * k, { color: "white", hipass: 2200 });
  tone(c, dest, 110, t0, 0.22, "sawtooth", 0.45 * k, 55);
  tone(c, dest, 165, t0 + 0.01, 0.18, "square", 0.22 * k, 70);
  tone(c, dest, 880, t0 + 0.02, 0.12, "sine", 0.18 * k, 220);
  seismicThump(c, dest, t0 + 0.02, 0.55 * k, 38);
  detonation(c, dest, t0 + 0.04, k * 0.45, false);
}

function frostLayer(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 2200, t0, 0.12, "sine", 0.2 * k, 900);
  tone(c, dest, 3400, t0 + 0.02, 0.1, "triangle", 0.14 * k, 1400);
  noiseShot(c, dest, t0, 0.22, 0.35 * k, {
    color: "white",
    hipass: 4000,
    lowpass: 12000,
  });
  for (let i = 0; i < 5; i++) {
    tone(
      c,
      dest,
      1800 + i * 220,
      t0 + i * 0.018,
      0.08,
      "sine",
      0.08 * k,
      600,
    );
  }
  seismicThump(c, dest, t0 + 0.04, 0.3 * k, 70);
}

function voidLayer(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 55, t0, 0.4, "sine", 0.45 * k, 28);
  tone(c, dest, 80, t0, 0.35, "sawtooth", 0.2 * k, 40);
  noiseShot(c, dest, t0, 0.4, 0.4 * k, {
    color: "brown",
    lowpass: 400,
  });
  for (let i = 0; i < 4; i++) {
    tone(
      c,
      dest,
      90 + i * 40,
      t0 + 0.05 + i * 0.04,
      0.2,
      "triangle",
      0.12 * k,
      50,
    );
  }
  detonation(c, dest, t0 + 0.1, k * 0.4, false);
}

function natureLayer(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  [330, 392, 494, 587].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.03, 0.28, "sine", 0.14 * k);
  });
  noiseShot(c, dest, t0, 0.18, 0.22 * k, {
    color: "pink",
    hipass: 800,
    lowpass: 5000,
  });
  tone(c, dest, 140, t0, 0.2, "triangle", 0.18 * k, 90);
}

function spellCataclysm(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  k: number,
) {
  tone(c, dest, 400, t0, 0.12, "sine", 0.25 * k, 180);
  tone(c, dest, 600, t0 + 0.03, 0.15, "triangle", 0.22 * k, 280);
  tone(c, dest, 900, t0 + 0.05, 0.2, "sine", 0.18 * k, 450);
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

function impactTail(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.35, 0.28 * k, {
    color: "pink",
    hipass: 200,
    lowpass: 1800,
  });
  seismicThump(c, dest, t0, 0.35 * k, 48);
  tone(c, dest, 200, t0, 0.4, "sine", 0.12 * k, 60);
  for (let i = 0; i < 3; i++) {
    noiseShot(c, dest, t0 + 0.08 + i * 0.05, 0.04, 0.12 * k, {
      color: "white",
      hipass: 1800,
    });
  }
}

function uiClick(c: AudioContext, dest: AudioNode, t0: number) {
  tone(c, dest, 980, t0, 0.045, "sine", 0.14);
  tone(c, dest, 1480, t0 + 0.01, 0.035, "triangle", 0.08);
  noiseShot(c, dest, t0, 0.025, 0.08, { color: "white", hipass: 2500 });
}

/** Charge / Rush dash — Doppler whoosh + boot stomp. */
function chargeRush(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  whooshPass(c, dest, t0, k * 1.15);
  tone(c, dest, 2200, t0, 0.1, "sawtooth", 0.2 * k, 400);
  tone(c, dest, 90, t0 + 0.06, 0.18, "sine", 0.4 * k, 45);
  seismicThump(c, dest, t0 + 0.08, 0.4 * k, 55);
  noiseShot(c, dest, t0 + 0.05, 0.12, 0.35 * k, {
    color: "white",
    hipass: 1500,
  });
}

/** Lifesteal siphon — rising drain + soft heal chime. */
function lifestealSiphon(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  k: number,
) {
  tone(c, dest, 140, t0, 0.28, "sawtooth", 0.28 * k, 320);
  tone(c, dest, 280, t0 + 0.04, 0.22, "triangle", 0.18 * k, 520);
  noiseShot(c, dest, t0, 0.22, 0.22 * k, {
    color: "pink",
    hipass: 600,
    lowpass: 4000,
  });
  [494, 587, 740].forEach((f, i) => {
    tone(c, dest, f, t0 + 0.12 + i * 0.035, 0.2, "sine", 0.12 * k);
  });
}

/** Reborn flash — reverse detonation + crystal ring. */
function rebornFlash(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.08, 0.55 * k, { color: "white", hipass: 2000 });
  tone(c, dest, 80, t0, 0.25, "sine", 0.35 * k, 200);
  tone(c, dest, 880, t0 + 0.04, 0.3, "triangle", 0.22 * k, 1760);
  tone(c, dest, 1320, t0 + 0.06, 0.22, "sine", 0.14 * k);
  seismicThump(c, dest, t0 + 0.05, 0.3 * k, 60);
}

/** Ion lattice crackle — high-Q electrical. */
function ionCrack(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  for (let i = 0; i < 8; i++) {
    noiseShot(c, dest, t0 + i * 0.018, 0.03, 0.22 * k, {
      color: "white",
      hipass: 2500 + i * 300,
      lowpass: 12000,
    });
    tone(
      c,
      dest,
      1600 + i * 280 + Math.random() * 120,
      t0 + i * 0.02,
      0.05,
      "square",
      0.09 * k,
      600,
    );
  }
  railShot(c, dest, t0 + 0.04, k * 0.55);
  plasmaBlast(c, dest, t0 + 0.08, k * 0.45);
}

/** Photon storm — multi-strobe lasers. */
function photonStorm(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  for (let i = 0; i < 5; i++) {
    plasmaBlast(c, dest, t0 + i * 0.045, k * (0.55 + i * 0.08));
  }
  aoeBurst(c, dest, t0 + 0.1, k * 0.7);
  tone(c, dest, 2400, t0, 0.35, "sine", 0.12 * k, 400);
}

export function playSfx(id: SfxId, intensity = 1) {
  if (muted || volume <= 0.01) return;
  const c = ac();
  if (!c || !masterGain) return;
  const t0 = c.currentTime + 0.001;
  const k = Math.max(0.4, Math.min(2.0, intensity * 1.25));
  const dest = out();
  const room = wet();

  switch (id) {
    case "clash":
      powerMetal(c, dest, t0, k, false);
      powerMetal(c, room, t0, k * 0.35, false);
      break;
    case "heavy_clash":
      powerMetal(c, dest, t0, k * 1.15, true);
      detonation(c, dest, t0 + 0.02, k * 0.7, true);
      detonation(c, room, t0 + 0.02, k * 0.4, true);
      break;
    case "blade":
      chainBlade(c, dest, t0, k);
      chainBlade(c, room, t0, k * 0.3);
      break;
    case "laser":
    case "plasma":
      plasmaBlast(c, dest, t0, k);
      plasmaBlast(c, room, t0, k * 0.4);
      break;
    case "beam":
      heavyBeam(c, dest, t0, k);
      heavyBeam(c, room, t0, k * 0.35);
      break;
    case "spell":
      spellCataclysm(c, dest, t0, k);
      spellCataclysm(c, room, t0, k * 0.4);
      break;
    case "frost":
      frostLayer(c, dest, t0, k);
      frostLayer(c, room, t0, k * 0.5);
      break;
    case "void":
      voidLayer(c, dest, t0, k);
      voidLayer(c, room, t0, k * 0.55);
      break;
    case "nature":
      natureLayer(c, dest, t0, k);
      natureLayer(c, room, t0, k * 0.4);
      break;
    case "heal":
      healPulse(c, dest, t0, k);
      healPulse(c, room, t0, k * 0.5);
      break;
    case "summon":
      summonRift(c, dest, t0, k);
      summonRift(c, room, t0, k * 0.35);
      break;
    case "grunt":
      warCry(c, dest, t0, true);
      break;
    case "enemy_grunt":
      warCry(c, dest, t0, false);
      break;
    case "glory":
      gloryFanfare(c, dest, t0);
      gloryFanfare(c, room, t0);
      break;
    case "defeat":
      defeatCollapse(c, dest, t0);
      defeatCollapse(c, room, t0);
      break;
    case "whoosh":
      whooshPass(c, dest, t0, k);
      break;
    case "impact_tail":
      impactTail(c, dest, t0, k);
      impactTail(c, room, t0, k * 0.6);
      break;
    case "rail":
      railShot(c, dest, t0, k);
      railShot(c, room, t0, k * 0.35);
      break;
    case "aoe_burst":
      aoeBurst(c, dest, t0, k);
      aoeBurst(c, room, t0, k * 0.4);
      break;
    case "shield_break":
      shieldBreak(c, dest, t0, k);
      shieldBreak(c, room, t0, k * 0.35);
      break;
    case "shield_up":
      shieldUp(c, dest, t0, k);
      shieldUp(c, room, t0, k * 0.4);
      break;
    case "charge_rush":
      chargeRush(c, dest, t0, k);
      chargeRush(c, room, t0, k * 0.3);
      break;
    case "lifesteal":
      lifestealSiphon(c, dest, t0, k);
      lifestealSiphon(c, room, t0, k * 0.4);
      break;
    case "reborn":
      rebornFlash(c, dest, t0, k);
      rebornFlash(c, room, t0, k * 0.45);
      break;
    case "ion":
      ionCrack(c, dest, t0, k);
      ionCrack(c, room, t0, k * 0.35);
      break;
    case "photon":
      photonStorm(c, dest, t0, k);
      photonStorm(c, room, t0, k * 0.3);
      break;
    case "execute":
      executeSting(c, dest, t0, k);
      executeSting(c, room, t0, k * 0.35);
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
  aoe?: boolean;
  cardId?: string;
  keywords?: string[];
  lethal?: boolean;
}) {
  const dmg = opts.damage ?? 0;
  const school = (opts.school || "").toLowerCase();
  const beam = (opts.beam || "").toLowerCase();
  const power = 0.85 + Math.min(1.2, dmg * 0.12);
  const card = (opts.cardId || "").toLowerCase();
  const kws = (opts.keywords ?? []).map((k) => k.toLowerCase());
  const lethal = !!opts.lethal || dmg >= 10;

  if (opts.kind === "melee") {
    if (kws.includes("charge") || kws.includes("rush")) {
      playSfx("charge_rush", power * 0.95);
    }
    if (card.includes("rail") || card.includes("sniper")) {
      playSfx("rail", power * 1.15);
      playSfx("whoosh", power * 0.4);
    } else if (school === "frost" || beam === "frost_bolt") {
      playSfx("frost", power);
      playSfx("whoosh", power * 0.45);
    } else if (school === "shadow" || beam === "shadow_bolt") {
      playSfx("void", power);
      playSfx("whoosh", power * 0.4);
    } else if (school === "nature" || beam === "nature_vine") {
      playSfx("nature", power);
      playSfx("clash", power * 0.4);
    } else if (
      beam === "laser" ||
      school === "arcane" ||
      school === "ember" ||
      beam === "ember_orb" ||
      beam === "ion_lance" ||
      beam === "photon_grid"
    ) {
      playSfx(
        beam === "ion_lance" || card.includes("ion")
          ? "ion"
          : beam === "photon_grid" || card.includes("photon")
            ? "photon"
            : "laser",
        power,
      );
      playSfx(dmg >= 6 ? "heavy_clash" : "clash", power * 0.5);
    } else if (school === "steel" || beam === "slash") {
      playSfx("blade", power * 1.1);
      playSfx(dmg >= 5 ? "heavy_clash" : "clash", power * 0.75);
    } else {
      playSfx(dmg >= 5 ? "heavy_clash" : "clash", power);
      if (dmg >= 4) playSfx("blade", power * 0.65);
    }
    if (kws.includes("lifesteal")) playSfx("lifesteal", power * 0.85);
    if (kws.includes("shield") && dmg <= 0) playSfx("shield_up", 0.7);
    if (dmg >= 2) {
      playSfx(
        opts.fromPlayer ? "grunt" : "enemy_grunt",
        0.9 + Math.min(0.6, dmg * 0.05),
      );
    }
    if (dmg >= 5) playSfx("impact_tail", power * 0.85);
    if (dmg >= 8) playSfx("heavy_clash", power * 0.9);
    if (lethal) playSfx("execute", power * 1.05);
  } else if (opts.kind === "spell") {
    playSfx("whoosh", power * 0.7);
    if (opts.aoe || beam === "dominus_ring" || beam === "photon_grid") {
      if (card.includes("photon") || beam === "photon_grid") {
        playSfx("photon", power * 1.05);
      } else {
        playSfx("aoe_burst", power * 0.95);
      }
    }
    if (card.includes("ion") || beam === "ion_lance") {
      playSfx("ion", power * 1.1);
    } else if (school === "frost" || beam === "frost_bolt") {
      playSfx("frost", power * 1.1);
    } else if (
      school === "shadow" ||
      beam === "shadow_bolt" ||
      beam === "dominus_ring"
    ) {
      playSfx("void", power * 1.15);
      playSfx("spell", power * 0.55);
    } else if (school === "nature" || beam === "nature_vine") {
      playSfx("nature", power * 1.05);
    } else if (beam === "laser" || school === "arcane" || school === "ember") {
      playSfx("laser", power * 1.1);
      if (card.includes("chain") || card.includes("surge")) {
        playSfx("rail", power * 0.55);
      }
    } else if (beam === "beam" || beam === "rail_line") {
      playSfx(beam === "rail_line" ? "rail" : "beam", power * 1.1);
    } else if (beam === "aegis_shell") {
      playSfx("shield_up", power * 0.85);
      playSfx("heal", power * 0.5);
    } else {
      playSfx("spell", power * 1.05);
    }
    if (
      card.includes("blood") ||
      card.includes("leech") ||
      card.includes("pact")
    ) {
      playSfx("lifesteal", power * 0.8);
    }
    if (dmg >= 4) playSfx("impact_tail", power * 0.7);
    if (lethal) playSfx("execute", power * 0.95);
    if (opts.toHero && dmg >= 3) {
      playSfx(opts.fromPlayer === false ? "grunt" : "enemy_grunt", 1.1);
    }
  } else if (opts.kind === "heal") {
    playSfx("heal", 1.0);
    if (card.includes("quantum")) playSfx("ion", 0.55);
    if (beam === "aegis_shell" || card.includes("aegis") || card.includes("ward")) {
      playSfx("shield_up", 0.75);
    }
  } else if (opts.kind === "summon") {
    playSfx("summon", 1.1);
    if (
      kws.includes("reborn") ||
      card.includes("phase") ||
      card.includes("reaper")
    ) {
      playSfx("reborn", 0.85);
    }
    if (kws.includes("charge") || kws.includes("rush")) {
      playSfx("charge_rush", 0.7);
    }
    if (kws.includes("shield") || kws.includes("taunt") || card.includes("aegis")) {
      playSfx("shield_up", 0.8);
    }
    if (
      card.includes("omega") ||
      card.includes("titan") ||
      card.includes("phalanx")
    ) {
      playSfx("rail", 0.75);
    }
  }
}
