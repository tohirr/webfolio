/* lab/audio — the page's one AudioContext, shared by every piece that makes
   sound. ios in particular is happier with a single context that is created
   once and resumed from a gesture than with each tile spinning up its own:
   a second context starting mid-session can leave the first one silent. */

let ctx = null;

export function audio() {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

/* call from inside a user-gesture handler */
export function wakeAudio() {
  const ac = audio();
  if (ac && ac.state !== "running") ac.resume().catch(() => {});
  return ac;
}
