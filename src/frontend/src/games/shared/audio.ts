/**
 * Tiny WebAudio manager — silent placeholders until real SFX ship.
 * Mute preference persists in localStorage.
 */

const MUTE_KEY = "icspicy-games-muted";

let ctx: AudioContext | null = null;
let muted = false;

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

muted = readMuted();

/** Named SFX slots — silent placeholders until assets ship. */
export type SfxName = "whoosh" | "splat" | "garden_loop" | "water" | "harvest";

/** No-op play — reserves API for future SFX assets. */
export function playSfx(_name: SfxName): void {
  if (muted) return;
  const audio = ensureContext();
  if (!audio) return;
  // Placeholder: resume context on first interaction; no sound yet.
  void audio.resume().catch(() => {});
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}
