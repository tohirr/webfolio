/* lab/audio — the page's one AudioContext, shared by every piece that makes
   sound. ios in particular is happier with a single context that is created
   once and resumed from a gesture than with each tile spinning up its own:
   a second context starting mid-session can leave the first one silent.

   every piece plays into output(), not the context's destination: one gain
   between them and the speakers, which the nav's sound button opens and
   closes for the whole page. the pieces keep running under it — morph's
   dots still hear the music with the page muted. sound starts on where
   there's a mouse, off on a touchscreen, where a phone on silent would
   leave it on but mute and you'd wonder why; the listener's choice is
   remembered after that. */

import { unlockAudio } from "./audio-unlock.js";

const KEY = "sound";

let ctx = null;
let out = null;
let on = (() => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved === "on";
  } catch { /* private mode etc. */ }
  return !matchMedia("(pointer: coarse)").matches;
})();
const watchers = new Set();

export function audio() {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      out = ctx.createGain();
      out.gain.value = on ? 1 : 0;
      out.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  return ctx;
}

/* where a piece plays into */
export function output() {
  audio();
  return out;
}

/* call from inside a user-gesture handler */
export function wakeAudio() {
  const ac = audio();
  if (ac && ac.state !== "running") ac.resume().catch(() => {});
  return ac;
}

export const soundOn = () => on;

/* the whole page's sound, on or off. turning it on is the listener asking
   for it, so it takes the iphone past its silent switch: the audio session
   goes to playback, where the switch doesn't apply. call it from inside the
   gesture, since that's the only time ios lets sound start */
export function setSound(v) {
  on = v;
  try {
    localStorage.setItem(KEY, v ? "on" : "off");
  } catch { /* fine */ }
  if (v) {
    try {
      if (navigator.audioSession) navigator.audioSession.type = "playback";
    } catch { /* not safari */ }
    unlockAudio(); // the older ios's way to the same place
    wakeAudio();
  }
  if (out) out.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, 0.04);
  watchers.forEach((f) => f(v));
}

export function onSound(f) {
  watchers.add(f);
  return () => watchers.delete(f);
}
