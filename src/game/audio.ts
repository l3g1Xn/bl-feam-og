/**
 * Offline battle SFX via Web Audio (no external files).
 * Clash metals, hero grunts, glory cries — quality-scaled intensity.
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
let volume = 0.75;
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
      masterGain.connect(ctx.destination);
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

/** Unlock audio on first user gesture (mobile WebView). */
export function unlockAudio() {
  const c = ac();
  if (!c) return;
  void c.resume();
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function env(
  g: GainNode,
  t0: number,
  peak: number,
  attack: number,
  decay: number,
) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone(
  c: AudioContext,
  dest: AudioNode,
  freq: number,
  t0: number,
  dur: number,
  type: OscillatorType,
  peak: number,
) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  env(g, t0, peak, 0.008, dur);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseBurst(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  dur: number,
  peak: number,
  hipass = 400,
) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, Math.min(0.35, dur + 0.05));
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hipass;
  const g = c.createGain();
  env(g, t0, peak, 0.002, dur);
  src.connect(f);
  f.connect(g);
  g.connect(dest);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/** Rough formant-style grunt (not speech synthesis — short heroic bark). */
function grunt(c: AudioContext, dest: AudioNode, t0: number, male: boolean) {
  const base = male ? 110 : 170;
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  o.type = "sawtooth";
  o2.type = "triangle";
  o.frequency.setValueAtTime(base, t0);
  o.frequency.exponentialRampToValueAtTime(base * 0.75, t0 + 0.18);
  o2.frequency.setValueAtTime(base * 1.5, t0);
  o2.frequency.exponentialRampToValueAtTime(base, t0 + 0.16);
  f.type = "bandpass";
  f.frequency.setValueAtTime(base * 3, t0);
  f.Q.value = 4;
  env(g, t0, 0.28, 0.01, 0.2);
  o.connect(f);
  o2.connect(f);
  f.connect(g);
  g.connect(dest);
  o.start(t0);
  o2.start(t0);
  o.stop(t0 + 0.28);
  o2.stop(t0 + 0.28);
  noiseBurst(c, dest, t0, 0.06, 0.12, 200);
}

function gloryCry(c: AudioContext, dest: AudioNode, t0: number) {
  const notes = [392, 494, 587, 784];
  notes.forEach((f, i) => {
    tone(c, dest, f, t0 + i * 0.08, 0.35, "triangle", 0.14 - i * 0.02);
    tone(c, dest, f * 2, t0 + i * 0.08, 0.28, "sine", 0.06);
  });
  noiseBurst(c, dest, t0, 0.15, 0.08, 800);
}

function defeatMoan(c: AudioContext, dest: AudioNode, t0: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(220, t0);
  o.frequency.exponentialRampToValueAtTime(90, t0 + 0.55);
  env(g, t0, 0.22, 0.02, 0.55);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + 0.65);
}


function synthBlade(c: AudioContext, dest: AudioNode, intensity: number) {
  const t0 = c.currentTime;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.12);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2800 + intensity * 800;
  bp.Q.value = 2.2;
  const g = c.createGain();
  env(g, t0, 0.45 * intensity, 0.002, 0.1);
  n.connect(bp);
  bp.connect(g);
  g.connect(dest);
  n.start(t0);
  n.stop(t0 + 0.14);
  tone(c, dest, 880 + intensity * 200, t0, 0.18, "triangle", 0.12 * intensity);
  tone(c, dest, 1320, t0 + 0.02, 0.12, "sine", 0.08 * intensity);
}

function synthLaser(c: AudioContext, dest: AudioNode, intensity: number) {
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(1600, t0);
  o.frequency.exponentialRampToValueAtTime(220, t0 + 0.22);
  env(g, t0, 0.35 * intensity, 0.005, 0.2);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(4200, t0);
  f.frequency.exponentialRampToValueAtTime(600, t0 + 0.22);
  o.connect(f);
  f.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + 0.25);
}

function synthBeam(c: AudioContext, dest: AudioNode, intensity: number) {
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o2.type = "sine";
  o.frequency.setValueAtTime(90, t0);
  o2.frequency.setValueAtTime(180, t0);
  o.frequency.linearRampToValueAtTime(60, t0 + 0.35);
  env(g, t0, 0.28 * intensity, 0.02, 0.32);
  o.connect(g);
  o2.connect(g);
  g.connect(dest);
  o.start(t0);
  o2.start(t0);
  o.stop(t0 + 0.4);
  o2.stop(t0 + 0.4);
}

export function playSfx(id: SfxId, intensity = 1) {
  if (muted || volume <= 0.01) return;
  const c = ac();
  if (!c || !masterGain) return;
  const t0 = c.currentTime + 0.001;
  const k = Math.max(0.2, Math.min(1.5, intensity));

  switch (id) {
    case "blade":
      synthBlade(c, masterGain, k);
      break;
    case "laser":
      synthLaser(c, masterGain, k);
      break;
    case "beam":
      synthBeam(c, masterGain, k);
      break;
    case "clash":
      noiseBurst(c, masterGain, t0, 0.08, 0.35 * k, 600);
      tone(c, masterGain, 180 + Math.random() * 40, t0, 0.09, "square", 0.12 * k);
      tone(c, masterGain, 900 + Math.random() * 200, t0, 0.05, "triangle", 0.08 * k);
      break;
    case "heavy_clash":
      noiseBurst(c, masterGain, t0, 0.14, 0.45 * k, 300);
      tone(c, masterGain, 90, t0, 0.18, "sawtooth", 0.18 * k);
      tone(c, masterGain, 240, t0 + 0.02, 0.12, "square", 0.1 * k);
      tone(c, masterGain, 1200, t0, 0.06, "sine", 0.1 * k);
      break;
    case "spell":
      tone(c, masterGain, 520, t0, 0.2, "sine", 0.12 * k);
      tone(c, masterGain, 780, t0 + 0.03, 0.18, "triangle", 0.1 * k);
      tone(c, masterGain, 1040, t0 + 0.06, 0.22, "sine", 0.08 * k);
      noiseBurst(c, masterGain, t0 + 0.05, 0.12, 0.15 * k, 1200);
      break;
    case "heal":
      tone(c, masterGain, 440, t0, 0.25, "sine", 0.1 * k);
      tone(c, masterGain, 554, t0 + 0.05, 0.25, "sine", 0.09 * k);
      tone(c, masterGain, 659, t0 + 0.1, 0.3, "triangle", 0.08 * k);
      break;
    case "summon":
      tone(c, masterGain, 200, t0, 0.15, "triangle", 0.12 * k);
      tone(c, masterGain, 300, t0 + 0.04, 0.18, "sine", 0.1 * k);
      noiseBurst(c, masterGain, t0, 0.1, 0.1 * k, 400);
      break;
    case "grunt":
      grunt(c, masterGain, t0, true);
      break;
    case "enemy_grunt":
      grunt(c, masterGain, t0, false);
      break;
    case "glory":
      gloryCry(c, masterGain, t0);
      break;
    case "defeat":
      defeatMoan(c, masterGain, t0);
      break;
    case "whoosh":
      noiseBurst(c, masterGain, t0, 0.12, 0.18 * k, 200);
      tone(c, masterGain, 160, t0, 0.1, "sine", 0.06 * k);
      break;
    case "ui":
      tone(c, masterGain, 660, t0, 0.06, "sine", 0.08 * k);
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

  if (opts.kind === "melee") {
    if (beam === "laser" || school === "arcane" || school === "ember") {
      playSfx("laser", 0.75 + Math.min(0.5, dmg * 0.05));
      playSfx(dmg >= 6 ? "heavy_clash" : "clash", 0.45 + Math.min(0.4, dmg * 0.04));
    } else if (beam === "beam" || school === "frost" || school === "shadow") {
      playSfx("beam", 0.7 + Math.min(0.5, dmg * 0.05));
      playSfx("whoosh", 0.4);
    } else if (school === "steel" || school === "nature" || beam === "slash") {
      playSfx("blade", 0.85 + Math.min(0.4, dmg * 0.05));
      playSfx(dmg >= 5 ? "heavy_clash" : "clash", 0.55 + Math.min(0.45, dmg * 0.05));
    } else {
      playSfx(dmg >= 5 ? "heavy_clash" : "clash", 0.7 + Math.min(1, dmg * 0.08));
      if (dmg >= 4) playSfx("blade", 0.45);
    }
    if (dmg >= 3) {
      playSfx(opts.fromPlayer ? "grunt" : "enemy_grunt", 0.8);
    }
  } else if (opts.kind === "spell") {
    playSfx("whoosh", 0.7);
    if (beam === "laser" || school === "arcane") {
      playSfx("laser", 0.85 + Math.min(0.4, dmg * 0.05));
    } else if (beam === "beam" || school === "shadow") {
      playSfx("beam", 0.8);
    } else {
      playSfx("spell", 0.7 + Math.min(0.8, dmg * 0.06));
    }
    if (opts.toHero && dmg >= 4) {
      playSfx(opts.fromPlayer === false ? "grunt" : "enemy_grunt", 0.9);
    }
  } else if (opts.kind === "heal") {
    playSfx("heal", 0.85);
  } else if (opts.kind === "summon") {
    playSfx("summon", 0.8);
  }
}
