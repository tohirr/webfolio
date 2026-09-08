/* lab/audio-unlock — iphones keep web audio silent while the ring/silent
   switch is on, unless the page has played a media element: that flips the
   audio session into "playback", where the switch no longer applies. so on
   the first touch we play a few milliseconds of silence through an <audio>
   element, once, and every AudioContext after that is audible. harmless
   everywhere else. call it from inside a user-gesture handler. */

/* 0.02s of silence, 8kHz mono 8-bit pcm wav */
const SILENCE =
  "data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

let done = false;

export function unlockAudio() {
  if (done) return;
  done = true;
  try {
    const a = new Audio(SILENCE);
    a.setAttribute("playsinline", "");
    a.volume = 0.01;
    const p = a.play();
    if (p && p.catch) p.catch(() => { done = false; }); // not a gesture after all — try next time
  } catch {
    done = false;
  }
}
