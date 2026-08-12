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
  | "execute"
  | "nova"
  | "grav"
  | "swarm"
  | "phase"
  | "matrix"
  | "chrono"
  | "mortar"
  | "prism"
  | "corona"
  | "helix"
  | "storm"
  | "rift"
  | "ferro"
  | "quantum"
  | "cascade"
  | "dominion"
  | "null"
  | "aether"
  | "kinetic"
  | "eclipse"
  | "overlord";

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
      bus.gain.value = 1.34;
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
      reverbSend.gain.value = 0.26;
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
  seismicThump(c, dest, t0 + 0.01, p * 0.85, heavy ? 36 : 48);
  tone(c, dest, 220, t0, 0.12, "sawtooth", p * 0.22, 80);
  if (heavy) {
    noiseShot(c, dest, t0 + 0.05, 0.2, p * 0.4, {
      color: "brown",
      lowpass: 400,
    });
  }
}

function chainBlade(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.04, 0.55 * k, { color: "white", hipass: 3000 });
  tone(c, dest, 2400, t0, 0.08, "sawtooth", 0.28 * k, 400);
  tone(c, dest, 1800, t0 + 0.02, 0.1, "triangle", 0.18 * k, 300);
  noiseShot(c, dest, t0 + 0.03, 0.12, 0.35 * k, {
    color: "pink",
    hipass: 800,
    lowpass: 5000,
  });
  seismicThump(c, dest, t0 + 0.04, 0.35 * k, 70);
}

function plasmaBlast(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 90, t0, 0.18, "sine", 0.45 * k, 40);
  noiseShot(c, dest, t0, 0.06, 0.55 * k, { color: "white", hipass: 1200 });
  tone(c, dest, 880, t0, 0.22, "sawtooth", 0.28 * k, 180);
  tone(c, dest, 1320, t0 + 0.02, 0.16, "triangle", 0.18 * k, 400);
  noiseShot(c, dest, t0 + 0.04, 0.2, 0.3 * k, {
    color: "pink",
    hipass: 400,
    lowpass: 3500,
  });
}

function heavyBeam(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 60, t0, 0.45, "sine", 0.5 * k, 30);
  tone(c, dest, 220, t0, 0.4, "sawtooth", 0.22 * k, 80);
  noiseShot(c, dest, t0, 0.35, 0.4 * k, {
    color: "pink",
    hipass: 200,
    lowpass: 2400,
  });
  for (let i = 0; i < 4; i++) {
    tone(
      c,
      dest,
      400 + i * 180,
      t0 + i * 0.04,
      0.18,
      "sine",
      0.12 * k,
      120 + i * 40,
    );
  }
  seismicThump(c, dest, t0 + 0.1, 0.4 * k, 38);
}

function spellCataclysm(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  k: number,
) {
  detonation(c, dest, t0, k * 0.85, true);
  tone(c, dest, 160, t0, 0.35, "triangle", 0.28 * k, 50);
  for (let i = 0; i < 6; i++) {
    tone(
      c,
      dest,
      500 + i * 220,
      t0 + 0.05 + i * 0.03,
      0.12,
      "sine",
      0.1 * k,
    );
  }
}

function frostLayer(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.18, 0.35 * k, {
    color: "white",
    hipass: 4000,
    lowpass: 12000,
  });
  tone(c, dest, 1400, t0, 0.22, "sine", 0.22 * k, 2800);
  tone(c, dest, 2100, t0 + 0.03, 0.18, "triangle", 0.14 * k, 900);
  noiseShot(c, dest, t0 + 0.05, 0.25, 0.2 * k, {
    color: "pink",
    hipass: 1500,
    lowpass: 6000,
  });
}

function voidLayer(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 45, t0, 0.4, "sine", 0.45 * k, 28);
  tone(c, dest, 90, t0, 0.35, "sawtooth", 0.18 * k, 40);
  noiseShot(c, dest, t0, 0.3, 0.3 * k, {
    color: "brown",
    lowpass: 800,
  });
  tone(c, dest, 320, t0 + 0.05, 0.28, "triangle", 0.15 * k, 80);
}

function natureLayer(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  [523, 659, 784].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.04, 0.22, "sine", 0.14 * k);
  });
  noiseShot(c, dest, t0, 0.15, 0.18 * k, {
    color: "pink",
    hipass: 600,
    lowpass: 3000,
  });
  tone(c, dest, 180, t0, 0.2, "triangle", 0.12 * k, 90);
}

function healPulse(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  [440, 554, 659, 880].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.045, 0.28, "sine", 0.16 * k);
  });
  noiseShot(c, dest, t0, 0.12, 0.12 * k, {
    color: "white",
    hipass: 2000,
    lowpass: 8000,
  });
}

function summonRift(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 40, t0, 0.3, "sine", 0.4 * k, 120);
  noiseShot(c, dest, t0, 0.15, 0.4 * k, { color: "pink", hipass: 200 });
  tone(c, dest, 600, t0 + 0.05, 0.25, "sawtooth", 0.2 * k, 1200);
  tone(c, dest, 900, t0 + 0.08, 0.2, "triangle", 0.14 * k, 400);
  seismicThump(c, dest, t0 + 0.06, 0.3 * k, 50);
}

function warCry(c: AudioContext, dest: AudioNode, t0: number, player: boolean) {
  const base = player ? 180 : 120;
  tone(c, dest, base, t0, 0.22, "sawtooth", 0.22, base * 1.4);
  tone(c, dest, base * 1.5, t0 + 0.04, 0.18, "triangle", 0.14, base * 0.9);
  noiseShot(c, dest, t0, 0.1, 0.15, { color: "brown", lowpass: 600 });
}

function gloryFanfare(c: AudioContext, dest: AudioNode, t0: number) {
  [523, 659, 784, 1046].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.08, 0.35, "triangle", 0.2);
    tone(c, dest, f * 2, t0 + i * 0.08, 0.25, "sine", 0.08);
  });
  seismicThump(c, dest, t0 + 0.2, 0.25, 55);
}

function defeatCollapse(c: AudioContext, dest: AudioNode, t0: number) {
  tone(c, dest, 200, t0, 0.5, "sawtooth", 0.3, 40);
  tone(c, dest, 100, t0 + 0.05, 0.55, "sine", 0.35, 28);
  noiseShot(c, dest, t0, 0.4, 0.35, { color: "brown", lowpass: 500 });
  seismicThump(c, dest, t0 + 0.1, 0.4, 30);
}

function railShot(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.03, 0.7 * k, { color: "white", hipass: 2500 });
  tone(c, dest, 60, t0, 0.15, "sine", 0.5 * k, 30);
  tone(c, dest, 2200, t0, 0.12, "sawtooth", 0.28 * k, 400);
  noiseShot(c, dest, t0 + 0.02, 0.18, 0.35 * k, {
    color: "pink",
    hipass: 800,
    lowpass: 4000,
  });
  seismicThump(c, dest, t0 + 0.03, 0.45 * k, 55);
}

function aoeBurst(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  detonation(c, dest, t0, k * 0.9, true);
  for (let i = 0; i < 4; i++) {
    plasmaBlast(c, dest, t0 + 0.03 + i * 0.04, k * 0.4);
  }
}

function shieldBreak(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.05, 0.6 * k, { color: "white", hipass: 2000 });
  tone(c, dest, 1200, t0, 0.12, "triangle", 0.3 * k, 200);
  tone(c, dest, 800, t0 + 0.03, 0.15, "sine", 0.2 * k, 100);
  noiseShot(c, dest, t0 + 0.04, 0.2, 0.25 * k, {
    color: "pink",
    hipass: 1000,
  });
}

function shieldUp(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  [600, 900, 1200].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.04, 0.2, "sine", 0.16 * k);
  });
  noiseShot(c, dest, t0, 0.1, 0.12 * k, {
    color: "white",
    hipass: 3000,
    lowpass: 9000,
  });
}

function executeSting(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  noiseShot(c, dest, t0, 0.04, 0.8 * k, { color: "white", hipass: 1500 });
  tone(c, dest, 80, t0, 0.25, "sine", 0.55 * k, 30);
  tone(c, dest, 440, t0, 0.12, "sawtooth", 0.3 * k, 80);
  tone(c, dest, 1760, t0 + 0.05, 0.2, "triangle", 0.18 * k);
  detonation(c, dest, t0 + 0.04, k * 0.7, false);
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

/** Nova reactor breach — stacked detonations + rising scream. */
function novaBreach(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  detonation(c, dest, t0, k * 1.05, true);
  detonation(c, dest, t0 + 0.08, k * 0.85, true);
  tone(c, dest, 120, t0, 0.45, "sawtooth", 0.35 * k, 40);
  tone(c, dest, 880, t0, 0.4, "sine", 0.22 * k, 2200);
  for (let i = 0; i < 6; i++) {
    plasmaBlast(c, dest, t0 + 0.04 + i * 0.05, k * 0.5);
  }
  seismicThump(c, dest, t0 + 0.15, 0.55 * k, 28);
}

/** Gravity well crush — sub-bass collapse + reverse whoosh. */
function gravCrush(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  tone(c, dest, 55, t0, 0.5, "sine", 0.55 * k, 22);
  tone(c, dest, 90, t0, 0.4, "triangle", 0.28 * k, 30);
  noiseShot(c, dest, t0, 0.35, 0.4 * k, {
    color: "brown",
    lowpass: 400,
  });
  tone(c, dest, 400, t0 + 0.05, 0.3, "sawtooth", 0.18 * k, 80);
  for (let i = 0; i < 5; i++) {
    noiseShot(c, dest, t0 + 0.06 + i * 0.04, 0.06, 0.2 * k, {
      color: "pink",
      hipass: 300,
      lowpass: 1200,
    });
  }
  seismicThump(c, dest, t0 + 0.12, 0.5 * k, 32);
}

/** Nanite swarm — insectile chatter + soft metal ticks. */
function swarmCloud(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  for (let i = 0; i < 12; i++) {
    noiseShot(c, dest, t0 + i * 0.022, 0.035, 0.14 * k, {
      color: "white",
      hipass: 1800 + (i % 4) * 400,
      lowpass: 9000,
    });
    tone(
      c,
      dest,
      900 + (i % 5) * 160 + Math.random() * 80,
      t0 + i * 0.02,
      0.04,
      "square",
      0.06 * k,
    );
  }
  natureLayer(c, dest, t0 + 0.05, k * 0.55);
  tone(c, dest, 220, t0, 0.28, "sine", 0.16 * k, 140);
}


/** Phase rift — stuttering Doppler chirps + void tail. */
function phaseRift(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  for (let i = 0; i < 6; i++) {
    tone(
      c,
      dest,
      1400 - i * 140 + Math.random() * 80,
      t0 + i * 0.028,
      0.07,
      "sawtooth",
      0.16 * k,
      200 + i * 40,
    );
    noiseShot(c, dest, t0 + i * 0.025, 0.04, 0.14 * k, {
      color: "white",
      hipass: 2200,
      lowpass: 10000,
    });
  }
  voidLayer(c, dest, t0 + 0.08, k * 0.55);
  whooshPass(c, dest, t0, k * 0.7);
}

/** Matrix lock — ascending digital pings + shield shell. */
function matrixLock(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  [660, 880, 1100, 1480, 1760].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.035, 0.12, "square", 0.1 * k);
    tone(c, dest, f * 1.5, t0 + i * 0.035, 0.08, "sine", 0.06 * k);
  });
  shieldUp(c, dest, t0 + 0.08, k * 0.9);
  noiseShot(c, dest, t0, 0.15, 0.18 * k, {
    color: "white",
    hipass: 3500,
    lowpass: 12000,
  });
}

/** Chrono slash — reverse whoosh + blade + crystal ring. */
function chronoSlash(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  // reverse-feeling rising sweep
  tone(c, dest, 80, t0, 0.22, "sawtooth", 0.28 * k, 1600);
  chainBlade(c, dest, t0 + 0.05, k * 1.05);
  tone(c, dest, 1320, t0 + 0.08, 0.25, "sine", 0.16 * k, 2640);
  lifestealSiphon(c, dest, t0 + 0.06, k * 0.55);
  seismicThump(c, dest, t0 + 0.1, 0.35 * k, 48);
}

/** Plasma mortar — lob whoosh + delayed detonation. */
function mortarLob(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  whooshPass(c, dest, t0, k * 0.9);
  tone(c, dest, 220, t0, 0.2, "sine", 0.3 * k, 90);
  plasmaBlast(c, dest, t0 + 0.08, k * 0.85);
  detonation(c, dest, t0 + 0.12, k * 0.95, true);
  for (let i = 0; i < 3; i++) {
    plasmaBlast(c, dest, t0 + 0.14 + i * 0.05, k * 0.45);
  }
  impactTail(c, dest, t0 + 0.16, k * 0.7);
}


/** Prism lance — crystal harmonics + ion crack. */
function prismLance(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  ionCrack(c, dest, t0, k * 0.85);
  [880, 1320, 1760, 2200].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.018, 0.14, "sine", 0.12 * k, f * 1.4);
    tone(c, dest, f * 0.5, t0 + i * 0.018, 0.1, "triangle", 0.06 * k);
  });
  noiseShot(c, dest, t0 + 0.04, 0.18, 0.22 * k, {
    color: "white",
    hipass: 2800,
    lowpass: 12000,
  });
  impactTail(c, dest, t0 + 0.08, k * 0.55);
}

/** Corona flare — layered nova + photon storm. */
function coronaFlare(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  novaBreach(c, dest, t0, k * 0.95);
  photonStorm(c, dest, t0 + 0.04, k * 0.75);
  for (let i = 0; i < 5; i++) {
    plasmaBlast(c, dest, t0 + 0.06 + i * 0.04, k * 0.4);
  }
  detonation(c, dest, t0 + 0.1, k * 0.85, true);
  seismicThump(c, dest, t0 + 0.12, 0.5 * k, 30);
}

/** Helix weave — bio nature + shield shell harmonics. */
function helixWeave(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  natureLayer(c, dest, t0, k * 0.9);
  shieldUp(c, dest, t0 + 0.05, k * 0.8);
  [440, 554, 659, 880].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.04, 0.18, "sine", 0.1 * k);
  });
  healPulse(c, dest, t0 + 0.08, k * 0.55);
  noiseShot(c, dest, t0, 0.2, 0.16 * k, {
    color: "pink",
    hipass: 400,
    lowpass: 4000,
  });
}

/** Storm lance — rail + frost thunder. */
function stormLance(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  railShot(c, dest, t0, k * 1.05);
  frostLayer(c, dest, t0 + 0.02, k * 0.7);
  whooshPass(c, dest, t0, k * 0.85);
  seismicThump(c, dest, t0 + 0.05, 0.55 * k, 38);
  for (let i = 0; i < 4; i++) {
    tone(
      c,
      dest,
      1800 + i * 220,
      t0 + 0.03 + i * 0.022,
      0.06,
      "sawtooth",
      0.1 * k,
      400,
    );
  }
  impactTail(c, dest, t0 + 0.1, k * 0.65);
}

/** Rift cut — phase + void monowire slice. */
function riftCut(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  phaseRift(c, dest, t0, k * 0.9);
  chainBlade(c, dest, t0 + 0.03, k * 1.05);
  voidLayer(c, dest, t0 + 0.05, k * 0.7);
  lifestealSiphon(c, dest, t0 + 0.04, k * 0.6);
  noiseShot(c, dest, t0, 0.05, 0.4 * k, { color: "white", hipass: 4000 });
  impactTail(c, dest, t0 + 0.08, k * 0.55);
}

/** Ferro spike — magnetic rail crack + steel harmonics. */
function ferroSpike(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  railShot(c, dest, t0, k * 1.1);
  powerMetal(c, dest, t0 + 0.02, k * 0.9, true);
  for (let i = 0; i < 5; i++) {
    tone(c, dest, 520 + i * 180, t0 + i * 0.016, 0.1, "square", 0.1 * k, 200);
  }
  seismicThump(c, dest, t0 + 0.06, 0.6 * k, 42);
  impactTail(c, dest, t0 + 0.1, k * 0.7);
}

/** Quantum fracture — phase stutter + prism crystal shards. */
function quantumFracture(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  phaseRift(c, dest, t0, k * 0.95);
  prismLance(c, dest, t0 + 0.03, k * 0.75);
  [990, 1485, 2220, 2970].forEach((f, i) => {
    tone(c, dest, f, t0 + 0.02 + i * 0.02, 0.12, "sine", 0.11 * k, f * 1.5);
  });
  noiseShot(c, dest, t0 + 0.05, 0.16, 0.2 * k, {
    color: "white",
    hipass: 3500,
    lowpass: 14000,
  });
  impactTail(c, dest, t0 + 0.09, k * 0.55);
}

/** Pulse cascade — multi-ring EMP stabs. */
function pulseCascade(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  ionCrack(c, dest, t0, k * 0.9);
  for (let i = 0; i < 6; i++) {
    photonStorm(c, dest, t0 + i * 0.045, k * (0.55 - i * 0.04));
    tone(
      c,
      dest,
      240 + i * 90,
      t0 + i * 0.045,
      0.08,
      "sawtooth",
      0.12 * k,
      80,
    );
  }
  detonation(c, dest, t0 + 0.12, k * 0.75, true);
  impactTail(c, dest, t0 + 0.14, k * 0.6);
}

/** Dominion core — capital reactor detonation. */
function dominionCore(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  novaBreach(c, dest, t0, k * 1.05);
  gravCrush(c, dest, t0 + 0.03, k * 0.9);
  detonation(c, dest, t0 + 0.06, k * 1.0, true);
  seismicThump(c, dest, t0 + 0.08, 0.75 * k, 28);
  for (let i = 0; i < 4; i++) {
    plasmaBlast(c, dest, t0 + 0.05 + i * 0.05, k * 0.5);
  }
  impactTail(c, dest, t0 + 0.14, k * 0.85);
}

/** Null spear — void monowire + magnetic rail crack. */
function nullSpear(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  voidLayer(c, dest, t0, k * 0.95);
  railShot(c, dest, t0 + 0.02, k * 1.05);
  chainBlade(c, dest, t0 + 0.03, k * 0.85);
  noiseShot(c, dest, t0, 0.06, 0.38 * k, { color: "white", hipass: 4200 });
  [880, 1320, 1980].forEach((f, i) => {
    tone(c, dest, f, t0 + 0.01 + i * 0.018, 0.1, "square", 0.1 * k, f * 1.4);
  });
  impactTail(c, dest, t0 + 0.1, k * 0.65);
}

/** Aether ward — frost matrix + shield lattice. */
function aetherWard(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  frostLayer(c, dest, t0, k * 0.95);
  shieldUp(c, dest, t0 + 0.02, k * 0.9);
  matrixLock(c, dest, t0 + 0.04, k * 0.7);
  for (let i = 0; i < 4; i++) {
    tone(c, dest, 640 + i * 160, t0 + i * 0.03, 0.12, "sine", 0.09 * k, 900);
  }
  impactTail(c, dest, t0 + 0.1, k * 0.45);
}

/** Kinetic break — heavy steel impact stack. */
function kineticBreak(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  powerMetal(c, dest, t0, k * 1.1, true);
  chargeRush(c, dest, t0 + 0.01, k * 0.95);
  seismicThump(c, dest, t0 + 0.04, 0.7 * k, 36);
  detonation(c, dest, t0 + 0.05, k * 0.7, true);
  impactTail(c, dest, t0 + 0.1, k * 0.75);
}

/** Eclipse lens — void choir + ion focus. */
function eclipseLens(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  voidLayer(c, dest, t0, k * 1.0);
  ionCrack(c, dest, t0 + 0.03, k * 0.85);
  [220, 330, 440, 660].forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.04, 0.18, "sine", 0.12 * k, f * 2);
  });
  noiseShot(c, dest, t0 + 0.08, 0.2, 0.18 * k, {
    color: "pink",
    hipass: 800,
    lowpass: 5000,
  });
  impactTail(c, dest, t0 + 0.12, k * 0.55);
}

/** Overlord frame — dominion-class reactor with steel thump. */
function overlordFrame(c: AudioContext, dest: AudioNode, t0: number, k: number) {
  dominionCore(c, dest, t0, k * 0.95);
  powerMetal(c, dest, t0 + 0.04, k * 0.8, true);
  railShot(c, dest, t0 + 0.06, k * 0.7);
  impactTail(c, dest, t0 + 0.14, k * 0.9);
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
    case "nova":
      novaBreach(c, dest, t0, k);
      novaBreach(c, room, t0, k * 0.3);
      break;
    case "grav":
      gravCrush(c, dest, t0, k);
      gravCrush(c, room, t0, k * 0.35);
      break;
    case "swarm":
      swarmCloud(c, dest, t0, k);
      swarmCloud(c, room, t0, k * 0.3);
      break;
    case "phase":
      phaseRift(c, dest, t0, k);
      phaseRift(c, room, t0, k * 0.35);
      break;
    case "matrix":
      matrixLock(c, dest, t0, k);
      matrixLock(c, room, t0, k * 0.35);
      break;
    case "chrono":
      chronoSlash(c, dest, t0, k);
      chronoSlash(c, room, t0, k * 0.3);
      break;
    case "mortar":
      mortarLob(c, dest, t0, k);
      mortarLob(c, room, t0, k * 0.3);
      break;
    case "prism":
      prismLance(c, dest, t0, k);
      prismLance(c, room, t0, k * 0.3);
      break;
    case "corona":
      coronaFlare(c, dest, t0, k);
      coronaFlare(c, room, t0, k * 0.28);
      break;
    case "helix":
      helixWeave(c, dest, t0, k);
      helixWeave(c, room, t0, k * 0.35);
      break;
    case "storm":
      stormLance(c, dest, t0, k);
      stormLance(c, room, t0, k * 0.3);
      break;
    case "rift":
      riftCut(c, dest, t0, k);
      riftCut(c, room, t0, k * 0.3);
      break;
    case "ferro":
      ferroSpike(c, dest, t0, k);
      ferroSpike(c, room, t0, k * 0.28);
      break;
    case "quantum":
      quantumFracture(c, dest, t0, k);
      quantumFracture(c, room, t0, k * 0.3);
      break;
    case "cascade":
      pulseCascade(c, dest, t0, k);
      pulseCascade(c, room, t0, k * 0.28);
      break;
    case "dominion":
      dominionCore(c, dest, t0, k);
      dominionCore(c, room, t0, k * 0.32);
      break;
    case "null":
      nullSpear(c, dest, t0, k);
      nullSpear(c, room, t0, k * 0.28);
      break;
    case "aether":
      aetherWard(c, dest, t0, k);
      aetherWard(c, room, t0, k * 0.3);
      break;
    case "kinetic":
      kineticBreak(c, dest, t0, k);
      kineticBreak(c, room, t0, k * 0.28);
      break;
    case "eclipse":
      eclipseLens(c, dest, t0, k);
      eclipseLens(c, room, t0, k * 0.3);
      break;
    case "overlord":
      overlordFrame(c, dest, t0, k);
      overlordFrame(c, room, t0, k * 0.32);
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
    } else if (card.includes("swarm") || beam === "swarm_cloud") {
      playSfx("swarm", power);
      playSfx("clash", power * 0.4);
    } else if (card.includes("plasma") || card.includes("saber")) {
      playSfx("plasma", power * 1.1);
      playSfx("blade", power * 0.55);
    } else if (card.includes("chrono") || beam === "chrono_slash") {
      playSfx("chrono", power * 1.15);
      playSfx("blade", power * 0.5);
    } else if (
      card.includes("storm_lancer") ||
      beam === "storm_lance"
    ) {
      playSfx("storm", power * 1.15);
      playSfx("charge_rush", power * 0.5);
    } else if (
      card.includes("rift") ||
      beam === "rift_cut" ||
      card.includes("void_stitch")
    ) {
      playSfx("rift", power * 1.1);
      playSfx("blade", power * 0.45);
    } else if (card.includes("ferro") || beam === "ferro_spike") {
      playSfx("ferro", power * 1.15);
      playSfx("rail", power * 0.5);
    } else if (card.includes("quantum") || beam === "quantum_fracture" || card.includes("shatter")) {
      playSfx("quantum", power * 1.1);
      playSfx("phase", power * 0.45);
    } else if (
      card.includes("laser_hydra") ||
      card.includes("dominion") ||
      card.includes("overlord") ||
      beam === "overlord_frame" ||
      beam === "dominion_core"
    ) {
      playSfx(card.includes("overlord") || beam === "overlord_frame" ? "overlord" : "dominion", power * 1.05);
      playSfx("plasma", power * 0.55);
    } else if (card.includes("kinetic") || beam === "kinetic_break") {
      playSfx("kinetic", power * 1.15);
      playSfx("charge_rush", power * 0.5);
    } else if (card.includes("aether") || beam === "aether_shell") {
      playSfx("aether", power * 1.05);
      playSfx("shield_up", power * 0.45);
    } else if (card.includes("null_spear") || beam === "null_spear") {
      playSfx("null", power * 1.15);
      playSfx("blade", power * 0.5);
    } else if (card.includes("spectral")) {
      playSfx("void", power * 1.05);
      playSfx("lifesteal", power * 0.55);
    } else if (card.includes("biosteel")) {
      playSfx("nature", power * 1.0);
      playSfx("clash", power * 0.55);
    } else if (
      card.includes("vector") ||
      card.includes("prism") ||
      beam === "prism_lance"
    ) {
      playSfx("prism", power * 1.05);
      playSfx("blade", power * 0.4);
    } else if (
      card.includes("helix") ||
      card.includes("anchor") ||
      card.includes("mirror_guard") ||
      card.includes("titan_clamp") ||
      beam === "helix_weave"
    ) {
      playSfx("helix", power * 0.95);
      playSfx("clash", power * 0.55);
    } else if (
      card.includes("obsidian")
    ) {
      playSfx("heavy_clash", power * 1.1);
      playSfx("rail", power * 0.7);
    } else if (
      card.includes("phase") ||
      card.includes("echo") ||
      beam === "phase_rift"
    ) {
      playSfx("phase", power * 1.05);
      playSfx("whoosh", power * 0.45);
    } else if (
      card.includes("apex") ||
      card.includes("colossus") ||
      card.includes("warden")
    ) {
      playSfx("rail", power * 0.9);
      playSfx(dmg >= 5 ? "heavy_clash" : "clash", power * 0.7);
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
    if (
      card.includes("nova") ||
      beam === "nova_burst" ||
      card.includes("cataclysm")
    ) {
      playSfx("nova", power * 1.1);
    } else if (
      card.includes("grav") ||
      beam === "grav_well" ||
      card.includes("singularity") ||
      beam === "singularity"
    ) {
      playSfx("grav", power * 1.1);
      if (card.includes("singularity")) playSfx("void", power * 0.55);
    } else if (card.includes("swarm") || beam === "swarm_cloud") {
      playSfx("swarm", power * 1.05);
    } else if (opts.aoe || beam === "dominus_ring" || beam === "photon_grid") {
      if (card.includes("photon") || beam === "photon_grid") {
        playSfx("photon", power * 1.05);
      } else {
        playSfx("aoe_burst", power * 0.95);
      }
    }
    if (card.includes("mortar") || beam === "mortar_arc") {
      playSfx("mortar", power * 1.15);
    } else if (
      card.includes("corona") ||
      beam === "corona_flare"
    ) {
      playSfx("corona", power * 1.15);
    } else if (
      card.includes("prism") ||
      card.includes("vector") ||
      beam === "prism_lance"
    ) {
      playSfx("prism", power * 1.1);
    } else if (
      card.includes("helix") ||
      card.includes("bio_surge") ||
      card.includes("synapse") ||
      beam === "helix_weave"
    ) {
      playSfx("helix", power * 1.05);
    } else if (
      card.includes("storm_lancer") ||
      beam === "storm_lance"
    ) {
      playSfx("storm", power * 1.15);
    } else if (
      card.includes("rift") ||
      card.includes("obsidian") ||
      beam === "rift_cut"
    ) {
      playSfx("rift", power * 1.1);
    } else if (card.includes("ferro") || beam === "ferro_spike") {
      playSfx("ferro", power * 1.15);
    } else if (card.includes("quantum") || beam === "quantum_fracture" || card.includes("shatter")) {
      playSfx("quantum", power * 1.1);
    } else if (
      card.includes("pulse_cascade") ||
      beam === "pulse_cascade"
    ) {
      playSfx("cascade", power * 1.15);
    } else if (
      card.includes("dominion") ||
      beam === "dominion_core"
    ) {
      playSfx("dominion", power * 1.2);
    } else if (
      card.includes("overlord") ||
      beam === "overlord_frame"
    ) {
      playSfx("overlord", power * 1.2);
    } else if (card.includes("null_spear") || beam === "null_spear") {
      playSfx("null", power * 1.15);
    } else if (card.includes("aether") || beam === "aether_shell") {
      playSfx("aether", power * 1.1);
    } else if (card.includes("kinetic") || beam === "kinetic_break") {
      playSfx("kinetic", power * 1.15);
    } else if (card.includes("plasma_net") || beam === "plasma_net") {
      playSfx("plasma", power * 1.1);
      playSfx("aoe_burst", power * 0.7);
    } else if (card.includes("eclipse") || beam === "eclipse_lens") {
      playSfx("eclipse", power * 1.15);
    } else if (card.includes("mag_rail") || card.includes("rail_array")) {
      playSfx("rail", power * 1.2);
      playSfx("ferro", power * 0.55);
    } else if (
      card.includes("frost_matrix") ||
      beam === "frost_matrix"
    ) {
      playSfx("frost", power * 1.1);
      playSfx("matrix", power * 0.7);
    } else if (
      card.includes("ion_symphony")
    ) {
      playSfx("ion", power * 1.05);
      playSfx("matrix", power * 0.75);
    } else if (card.includes("hex") || beam === "hex_grid") {
      playSfx("ion", power * 0.85);
      playSfx("aoe_burst", power * 0.75);
    } else if (
      card.includes("flux") ||
      card.includes("matrix") ||
      card.includes("beacon") ||
      beam === "matrix_lock"
    ) {
      playSfx("matrix", power * 1.1);
    } else if (card.includes("chrono") || beam === "chrono_slash") {
      playSfx("chrono", power * 1.05);
    } else if (
      card.includes("phase") ||
      card.includes("echo") ||
      beam === "phase_rift"
    ) {
      playSfx("phase", power * 1.05);
    } else if (card.includes("ion") || beam === "ion_lance") {
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
    } else if (
      !card.includes("nova") &&
      !card.includes("grav") &&
      !card.includes("singularity") &&
      !card.includes("swarm")
    ) {
      playSfx("spell", power * 1.05);
    }
    if (
      card.includes("blood") ||
      card.includes("leech") ||
      card.includes("pact") ||
      card.includes("harvester") ||
      card.includes("singularity")
    ) {
      playSfx("lifesteal", power * 0.8);
    }
    if (card.includes("matrix") || card.includes("shield")) {
      playSfx("shield_up", power * 0.65);
    }
    if (dmg >= 4) playSfx("impact_tail", power * 0.7);
    if (lethal) playSfx("execute", power * 0.95);
    if (opts.toHero && dmg >= 3) {
      playSfx(opts.fromPlayer === false ? "grunt" : "enemy_grunt", 1.1);
    }
  } else if (opts.kind === "heal") {
    playSfx("heal", 1.0);
    if (card.includes("quantum")) playSfx("ion", 0.55);
    if (beam === "aegis_shell" || card.includes("aegis") || card.includes("ward") || card.includes("matrix")) {
      playSfx("shield_up", 0.75);
    }
  } else if (opts.kind === "summon") {
    playSfx("summon", 1.1);
    if (
      kws.includes("reborn") ||
      card.includes("phase") ||
      card.includes("reaper") ||
      card.includes("swarm")
    ) {
      playSfx("reborn", 0.85);
    }
    if (card.includes("swarm")) playSfx("swarm", 0.7);
    if (kws.includes("charge") || kws.includes("rush")) {
      playSfx("charge_rush", 0.7);
    }
    if (kws.includes("shield") || kws.includes("taunt") || card.includes("aegis") || card.includes("bastion")) {
      playSfx("shield_up", 0.8);
    }
    if (
      card.includes("omega") ||
      card.includes("titan") ||
      card.includes("phalanx") ||
      card.includes("bastion") ||
      card.includes("apex") ||
      card.includes("colossus") ||
      card.includes("warden")
    ) {
      playSfx("rail", 0.75);
    }
    if (card.includes("chrono")) playSfx("chrono", 0.65);
    if (card.includes("phase") || card.includes("echo") || card.includes("flicker")) {
      playSfx("phase", 0.7);
    }
  }
}
