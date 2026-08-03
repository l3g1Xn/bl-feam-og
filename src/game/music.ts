/**
 * Legion TraX soundtrack — two long-form suites replacing the old 10-track set.
 * Part 1 → Part 2 rotation (menu + battle-ducked).
 */

export type MusicTrackId = "01_legionx_trax_part1" | "02_legion_trax_part2";

export const MENU_TRACKS: {
  id: MusicTrackId;
  title: string;
  mood: string;
  src: string;
  group: "original" | "edm";
}[] = [
  {
    id: "01_legionx_trax_part1",
    title: "LegionX TraX Part 1",
    mood: "LegionX suite — command open & march",
    src: "/music/01_legionx_trax_part1.mp3",
    group: "original",
  },
  {
    id: "02_legion_trax_part2",
    title: "Legion TraX Part 2",
    mood: "Legion TraX suite — war anthem extension",
    src: "/music/02_legion_trax_part2.mp3",
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
      id: "01_legionx_trax_part1" as MusicTrackId,
      title: "LegionX TraX",
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
