/**
 * 5-track menu music rotation — royalty-free LegionX originals (MP3).
 * Assets under /music — advances to next track on end.
 */

export type MusicTrackId =
  | "01_freedom_hyperdrive"
  | "02_hidden_frequencies"
  | "03_liberty_reign"
  | "04_foreverx"
  | "05_haunting_darkness";

export const MENU_TRACKS: {
  id: MusicTrackId;
  title: string;
  mood: string;
  src: string;
}[] = [
  {
    id: "01_freedom_hyperdrive",
    title: "Freedom Hyperdrive",
    mood: "LegionX — high-energy open",
    src: "/music/01_freedom_hyperdrive.mp3",
  },
  {
    id: "02_hidden_frequencies",
    title: "Hidden Frequencies",
    mood: "Deep atmosphere",
    src: "/music/02_hidden_frequencies.mp3",
  },
  {
    id: "03_liberty_reign",
    title: "Liberty Reign Freedom Fire",
    mood: "LegionX — anthem drive",
    src: "/music/03_liberty_reign.mp3",
  },
  {
    id: "04_foreverx",
    title: "ForeverX",
    mood: "VolkorX Gen — slapped edition",
    src: "/music/04_foreverx.mp3",
  },
  {
    id: "05_haunting_darkness",
    title: "Haunting Darkness",
    mood: "WAR_LEGIXN — ominous weight",
    src: "/music/05_haunting_darkness.mp3",
  },
];

let audio: HTMLAudioElement | null = null;
let index = 0;
let volume = 0.45;
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
    if (a.src !== new URL(track.src, window.location.origin).href) {
      a.src = track.src;
    }
    a.volume = muted ? 0 : mode === "battle" ? volume * 0.35 : volume;
    await a.play();
    started = true;
  } catch {
    /* autoplay blocked until gesture */
  }
}

export function setMusicVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (audio) audio.volume = muted ? 0 : mode === "battle" ? volume * 0.35 : volume;
}

export function setMusicMuted(m: boolean) {
  muted = m;
  if (audio) audio.volume = muted ? 0 : mode === "battle" ? volume * 0.35 : volume;
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

/** Start or resume menu rotation (call after user gesture). */
export function startMenuMusic() {
  mode = "menu";
  void playIndex(index);
}

export function setBattleMusicDuck(on: boolean) {
  if (mode === "off") return;
  mode = on ? "battle" : "menu";
  if (audio) audio.volume = muted ? 0 : on ? volume * 0.35 : volume;
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

export function ensureMusicUnlocked() {
  if (!started) startMenuMusic();
  else if (audio?.paused && mode !== "off") void audio.play().catch(() => {});
}
