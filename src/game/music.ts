/**
 * 10-track menu rotation:
 * 01–05 LegionX originals · 06–10 EDM industrial hybrids (standalone).
 */

export type MusicTrackId =
  | "01_freedom_hyperdrive"
  | "02_hidden_frequencies"
  | "03_liberty_reign"
  | "04_foreverx"
  | "05_haunting_darkness"
  | "06_legion_pulse"
  | "07_void_drop"
  | "08_iron_requiem"
  | "09_nova_siege"
  | "10_eternal_march";

export const MENU_TRACKS: {
  id: MusicTrackId;
  title: string;
  mood: string;
  src: string;
  group: "original" | "edm";
}[] = [
  {
    id: "01_freedom_hyperdrive",
    title: "Freedom Hyperdrive",
    mood: "LegionX original — high-energy open",
    src: "/music/01_freedom_hyperdrive.mp3",
    group: "original",
  },
  {
    id: "02_hidden_frequencies",
    title: "Hidden Frequencies",
    mood: "LegionX original — deep atmosphere",
    src: "/music/02_hidden_frequencies.mp3",
    group: "original",
  },
  {
    id: "03_liberty_reign",
    title: "Liberty Reign Freedom Fire",
    mood: "LegionX original — anthem drive",
    src: "/music/03_liberty_reign.mp3",
    group: "original",
  },
  {
    id: "04_foreverx",
    title: "ForeverX",
    mood: "LegionX original — slapped edition",
    src: "/music/04_foreverx.mp3",
    group: "original",
  },
  {
    id: "05_haunting_darkness",
    title: "Haunting Darkness",
    mood: "LegionX original — ominous weight",
    src: "/music/05_haunting_darkness.mp3",
    group: "original",
  },
  {
    id: "06_legion_pulse",
    title: "Legion Pulse",
    mood: "EDM · 128 BPM industrial pulse",
    src: "/music/06_legion_pulse.mp3",
    group: "edm",
  },
  {
    id: "07_void_drop",
    title: "Void Drop",
    mood: "EDM · 140 BPM void club drop",
    src: "/music/07_void_drop.mp3",
    group: "edm",
  },
  {
    id: "08_iron_requiem",
    title: "Iron Requiem",
    mood: "EDM · 110 BPM iron march hybrid",
    src: "/music/08_iron_requiem.mp3",
    group: "edm",
  },
  {
    id: "09_nova_siege",
    title: "Nova Siege",
    mood: "EDM · 150 BPM siege assault",
    src: "/music/09_nova_siege.mp3",
    group: "edm",
  },
  {
    id: "10_eternal_march",
    title: "Eternal March",
    mood: "EDM · 120 BPM eternal war march",
    src: "/music/10_eternal_march.mp3",
    group: "edm",
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
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = muted ? 0 : volume;
    audio.addEventListener("ended", () => {
      index = (index + 1) % MENU_TRACKS.length;
      void playIndex(index);
    });
  }
  return audio;
}

async function playIndex(i: number) {
  const a = el();
  if (!a || mode === "off") return;
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
  return MENU_TRACKS[index]!;
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
  index = (index + 1) % MENU_TRACKS.length;
  void playIndex(index);
}

export function playTrackAt(i: number) {
  index = ((i % MENU_TRACKS.length) + MENU_TRACKS.length) % MENU_TRACKS.length;
  mode = "menu";
  void playIndex(index);
}

export function ensureMusicUnlocked() {
  if (!started) startMenuMusic();
  else if (audio?.paused && mode !== "off") void audio.play().catch(() => {});
}
