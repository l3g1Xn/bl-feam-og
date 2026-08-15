/**
 * Legion TraX soundtrack — nine individual tracks carefully split from the
 * original two long-form suites at natural silence points (no hard crops).
 * Menu rotation + battle-duck volume.
 */

export type MusicTrackId =
  | "01_command_open"
  | "02_march_protocol"
  | "03_lattice_advance"
  | "04_legion_rise"
  | "05_war_anthem"
  | "06_breach_protocol"
  | "07_harmonic_siege"
  | "08_overlord_march"
  | "09_final_protocol";

export const MENU_TRACKS: {
  id: MusicTrackId;
  title: string;
  mood: string;
  src: string;
  group: "original" | "edm";
}[] = [
  {
    id: "01_command_open",
    title: "Command Open",
    mood: "LegionX suite — command shell open",
    src: "/music/01_command_open.mp3",
    group: "original",
  },
  {
    id: "02_march_protocol",
    title: "March Protocol",
    mood: "LegionX suite — march into the breach",
    src: "/music/02_march_protocol.mp3",
    group: "original",
  },
  {
    id: "03_lattice_advance",
    title: "Lattice Advance",
    mood: "LegionX suite — carbon lattice advance",
    src: "/music/03_lattice_advance.mp3",
    group: "original",
  },
  {
    id: "04_legion_rise",
    title: "Legion Rise",
    mood: "LegionX suite — rise of the legion",
    src: "/music/04_legion_rise.mp3",
    group: "original",
  },
  {
    id: "05_war_anthem",
    title: "War Anthem",
    mood: "Legion TraX — war anthem open",
    src: "/music/05_war_anthem.mp3",
    group: "original",
  },
  {
    id: "06_breach_protocol",
    title: "Breach Protocol",
    mood: "Legion TraX — breach and clear",
    src: "/music/06_breach_protocol.mp3",
    group: "original",
  },
  {
    id: "07_harmonic_siege",
    title: "Harmonic Siege",
    mood: "Legion TraX — resonant siege",
    src: "/music/07_harmonic_siege.mp3",
    group: "original",
  },
  {
    id: "08_overlord_march",
    title: "Overlord March",
    mood: "Legion TraX — overlord command march",
    src: "/music/08_overlord_march.mp3",
    group: "original",
  },
  {
    id: "09_final_protocol",
    title: "Final Protocol",
    mood: "Legion TraX — final protocol close",
    src: "/music/09_final_protocol.mp3",
    group: "original",
  },
];

let audio: HTMLAudioElement | null = null;
let index = 0;
let volume = 0.48;
let muted = false;
let started = false;
let mode: "menu" | "battle" | "off" = "off";

function el(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = "metadata";
    audio.loop = false;
    audio.volume = muted ? 0 : volume;
    audio.addEventListener("ended", () => {
      if (MENU_TRACKS.length === 0) return;
      index = (index + 1) % MENU_TRACKS.length;
      void playIndex(index);
    });
  }
  return audio;
}

async function playIndex(i: number) {
  const a = el();
  if (!a || mode === "off" || MENU_TRACKS.length === 0) return;
  const track = MENU_TRACKS[i]!;
  index = i;
  try {
    const href = new URL(track.src, window.location.origin).href;
    if (a.src !== href) {
      a.src = track.src;
    }
    a.volume = muted ? 0 : mode === "battle" ? volume * 0.32 : volume;
    await a.play();
    started = true;
  } catch {
    /* autoplay blocked until gesture */
  }
}

export function setMusicVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (audio) audio.volume = muted ? 0 : mode === "battle" ? volume * 0.32 : volume;
}

export function setMusicMuted(m: boolean) {
  muted = m;
  if (audio) audio.volume = muted ? 0 : mode === "battle" ? volume * 0.32 : volume;
}

export function getMusicVolume() {
  return volume;
}

export function isMusicMuted() {
  return muted;
}

export function currentTrack() {
  return (
    MENU_TRACKS[index] ?? {
      id: "01_command_open" as MusicTrackId,
      title: "Legion TraX",
      mood: "",
      src: "",
      group: "original" as const,
    }
  );
}

export function startMenuMusic() {
  mode = "menu";
  void playIndex(index);
}

export function setBattleMusicDuck(on: boolean) {
  if (mode === "off") return;
  mode = on ? "battle" : "menu";
  if (audio) audio.volume = muted ? 0 : on ? volume * 0.32 : volume;
}

export function stopMusic() {
  mode = "off";
  if (audio) {
    audio.pause();
  }
}

export function skipTrack() {
  if (MENU_TRACKS.length === 0) return;
  index = (index + 1) % MENU_TRACKS.length;
  void playIndex(index);
}

export function playTrackAt(i: number) {
  if (MENU_TRACKS.length === 0) return;
  index = ((i % MENU_TRACKS.length) + MENU_TRACKS.length) % MENU_TRACKS.length;
  mode = "menu";
  void playIndex(index);
}

export function ensureMusicUnlocked() {
  if (!started) startMenuMusic();
  else if (audio?.paused && mode !== "off") void audio.play().catch(() => {});
}
